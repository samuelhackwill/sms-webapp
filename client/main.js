import { Template } from "meteor/templating"
import { Messages } from "/imports/api/messages.js"

import "./main.html"

Meteor.subscribe("allMessages")

Template.smsInbox.helpers({
  messages() {
    return Messages.find({}, { sort: { receivedAt: -1 } })
  },
  timeAgo(date) {
    return date ? date.toLocaleString() : ""
  },
})
