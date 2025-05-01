import { Meteor } from "meteor/meteor"
import { Messages } from "/imports/api/messages.js"

Meteor.publish("allMessages", function () {
  return Messages.find(
    {},
    {
      fields: {
        from: 0, // hide raw
      },
      sort: { receivedAt: -1 },
    }
  )
})
