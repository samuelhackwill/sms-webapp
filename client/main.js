import { Template } from "meteor/templating"
import { Messages } from "/imports/api/messages.js"

import "./main.html"

Meteor.subscribe("allMessages")

Template.smsInbox.onRendered(function () {})

Template.smsInbox.helpers({
  messages() {
    return Messages.find({}, { sort: { receivedAt: -1 } })
  },
  timeAgo(date) {
    if (!date) return ""

    const now = new Date()
    const diffMs = now - date
    const diffSec = Math.floor(diffMs / 1000)

    if (diffSec < 5) return "just now"
    if (diffSec < 60) return `${diffSec} seconds ago`

    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`

    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? "s" : ""} ago`

    const diffDays = Math.floor(diffHrs / 24)
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  },
})
