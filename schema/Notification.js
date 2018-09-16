"use strict";

const {GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "Notification",
  fields: function() {
    return {
      createdAt: { type: new GraphQLNonNull(GraphQLString) },
      message: { type: new GraphQLNonNull(GraphQLString) },
      reactions: require("./Reaction").NotificationToReactions
    };
  }
});

module.exports.EventToNotifications = {
  type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(type))),
  resolve: function(event) { return event.notifications || []; }
};

module.exports.build = function(_) { };
