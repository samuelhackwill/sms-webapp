import { Meteor } from "meteor/meteor"
import bodyParser from "body-parser"
import { WebApp } from "meteor/webapp"
import { Messages } from "/imports/api/messages.js"
import { exec } from "child_process"
import { promisify } from "util"
import axios from "axios"
import md5 from "md5"

const execAsync = promisify(exec)

Meteor.startup(async () => {
  const passwordPlain = Meteor.settings.private.routerPWD
  const passwordHashed = md5(passwordPlain)

  let cookieString

  try {
    const res = await axios.post(
      "http://192.168.0.1/login/Auth",
      {
        username: "admin",
        password: passwordHashed,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Referer: "http://192.168.0.1/index.html",
          Origin: "http://192.168.0.1",
          "X-Requested-With": "XMLHttpRequest",
        },
        validateStatus: null,
      }
    )

    const cookies = res.headers["set-cookie"]
    if (res.data && res.data.errCode === 0 && cookies) {
      cookieString = cookies.map((c) => c.split(";")[0]).join("; ")
      console.log("✅ Login successful")
      console.log("🔐 Auth cookie:", cookieString)
    } else {
      console.error("❌ Login failed:", res.data)
      return
    }
  } catch (err) {
    console.error("❌ Error logging in:", err.message)
    return
  }

  try {
    // Step 2 – Fetch SMS using curl
    const curlCmd = `
      curl -s 'http://192.168.0.1/goform/getModules?rand=${Math.random()}&currentPage=1&pageSizes=200&modules=smsList' \
      -H 'Referer: http://192.168.0.1/index.html' \
      -H 'X-Requested-With: XMLHttpRequest' \
      -H 'Cookie: ${cookieString}' \
      -H 'User-Agent: Mozilla/5.0' \
      -H 'Accept: application/json, text/plain, */*'
    `
      .replace(/\s+/g, " ")
      .trim()

    const { stdout } = await execAsync(curlCmd)

    let data
    try {
      data = JSON.parse(stdout)
    } catch (err) {
      console.error("❌ Could not parse curl output as JSON:", err.message)
      console.log("📦 Raw output:", stdout.slice(0, 300))
      return
    }

    const phoneList = data?.smsList?.phoneList || []

    const latestBySender = new Map()

    phoneList.forEach((entry) => {
      const number = entry.phone
      const notes = entry.note || []
      const latest = notes.reduce((a, b) => (b.time > a.time ? b : a), notes[0])
      if (latest) {
        latestBySender.set(number, {
          number,
          content: latest.content,
          time: new Date(latest.time * 1000),
        })
      }
    })

    console.log("\n📨 Latest message from each sender:\n")
    for (const { number, content, time } of latestBySender.values()) {
      console.log(`📱 ${number} – ${time.toLocaleString()}\n📝 ${content}\n`)
    }
  } catch (err) {
    console.error("❌ Failed to fetch SMS with curl:", err.message)
  }
})

Meteor.publish("allMessages", function () {
  return Messages.find({}, { sort: { receivedAt: -1 } })
})

// Meteor.startup(async () => {
//   const passwordPlain = "smsfossi" // or your actual password
//   const passwordHashed = md5(passwordPlain)

//   try {
//     const res = await axios.post(
//       "http://192.168.0.1/login/Auth",
//       {
//         username: "admin",
//         password: passwordHashed,
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Referer: "http://192.168.0.1/index.html",
//           Origin: "http://192.168.0.1",
//           "X-Requested-With": "XMLHttpRequest",
//         },
//         validateStatus: null,
//       }
//     )

//     const cookies = res.headers["set-cookie"]

//     if (res.data && res.data.errCode === 0 && cookies) {
//       const cookieString = cookies.map((c) => c.split(";")[0]).join("; ")
//       console.log("✅ Login successful")
//       console.log("🔐 Auth cookie:", cookieString)
//     } else {
//       console.error("❌ Login failed:", res.data)
//     }
//   } catch (err) {
//     console.error("❌ Error logging in:", err.message)
//   }
// })

WebApp.connectHandlers.use("/sms", bodyParser.urlencoded({ extended: false }))
WebApp.connectHandlers.use("/sms", (req, res) => {
  const { From, Body } = req.body

  if (From && Body) {
    Messages.insertAsync({
      from: From,
      body: Body,
      receivedAt: new Date(),
    })
    console.log(`[SMS] Received from ${From}: ${Body}`)
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end("Message received")
  } else {
    res.writeHead(400)
    res.end("Bad request")
  }
})
