"use strict";

const {GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "Reaction",
  fields: () => ({
    userName: { type: new GraphQLNonNull(GraphQLString) },
    emoji: { type: new GraphQLNonNull(GraphQLString) }
  })
});

module.exports.build = function({mutation}) {
  mutation.createReaction = {
    type: type,
    args: {
      eventId: { type: new GraphQLNonNull(GraphQLString) },
      notificationCreatedAt: { type: new GraphQLNonNull(GraphQLString) },
      userName: { type: new GraphQLNonNull(GraphQLString) },
      emoji: { type: new GraphQLNonNull(GraphQLString) }
    },
    resolve: function(_, {eventId, notificationCreatedAt, userName, emoji}, {db, Events}) { 
      return new Promise(function(resolve, reject) {
        db.get({TableName: Events, Key: {eventId}}, function (err, data) {
          if (err) return reject(err.message);
          if (!data.Item) return reject("eventId " + eventId + " doesn't exist on DB");
          const event = data.Item;
          const targetNotification = event.notifications.find(function(elm) {return elm.createdAt == notificationCreatedAt});
          if (!targetNotification) return reject("notification " + notificationCreatedAt + " doesn't exist on DB");
          targetNotification.reactions.push({userName, emoji});
          db.put({TableName: Events, Item: event}, function(err, data) {
            if (err) return reject(err.message);
            return resolve({userName, emoji});
          });
        });
      });
    }
  };

  mutation.deleteReaction = {
    type: type,
    args: {
      eventId: { type: new GraphQLNonNull(GraphQLString) },
      notificationCreatedAt: { type: new GraphQLNonNull(GraphQLString) },
      userName: { type: new GraphQLNonNull(GraphQLString) },
      emoji: { type: new GraphQLNonNull(GraphQLString) }
    },
    resolve: function(_, {eventId, notificationCreatedAt, userName, emoji}, {db, Events}) { 
      return new Promise(function(resolve, reject) {
        db.get({TableName: Events, Key: {eventId}}, function (err, data) {
          if (err) return reject(err.message);
          if (!data.Item) return reject("eventId " + eventId + " doesn't exist on DB");
          const event = data.Item;
          const targetNotification = event.notifications.find(function(elm) {return elm.createdAt == notificationCreatedAt});
          if (!targetNotification) return reject("notification " + notificationCreatedAt + " doesn't exist on DB");
          const targetReactionIndex = targetNotification.reactions.findIndex(function(elm) {return elm.userName == userName && elm.emoji == emoji});
          if (targetReactionIndex < 0) return reject("reaction " + userName + ", " + emoji + " doesn't exist on DB");
          targetNotification.reactions.splice(targetReactionIndex, 1);
          db.put({TableName: Events, Item: event}, function(err, data) {
            if (err) return reject(err.message);
            return resolve({userName, emoji});
          });
        });
      });
    }
  };
}

module.exports.fieldForNotification = {type: new GraphQLNonNull(GraphQLList(type))};
