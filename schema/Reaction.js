"use strict";

const {GraphQLInputObjectType, GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLList, GraphQLInt} = require("graphql");

const type = new GraphQLObjectType({
  name: "Reaction",
  fields: function () { return {
    emoji:  { type: new GraphQLNonNull(GraphQLString) },
    user:   require("./User").ReactionToUser,
  }; },
});

const createReaction = function({db, eventCode, notificationIndex, emoji, Me, resolve, reject}) {
  const groupId = "Event-" + eventCode;
  const reaction = { emoji, userId: Me.userId };
  db.get({
    Key: {
      userId: groupId,
      groupId,
    },
  }, function (err, data) {
    if (err) return reject(err.message);
    if (!data.Item) return reject("eventCode " + eventCode + " doesn't exist on DB");
    const notifications = data.Item.notifications;
    if (!notifications || notificationIndex < 0 || notificationIndex >= notifications.length)
      return reject("notification[" + notificationIndex + "] doesn't exist on DB " +
        "(notifications.length: " + ((notifications)? notifications.length : "null") + " )");
    const targetNotification = notifications[notificationIndex];
    const reactions = targetNotification.reactions || [];
    const reactionIndex = reactions.findIndex(function(elm) {
      return (elm.userId == reaction.userId && elm.emoji == reaction.emoji);
    });
    if (reactionIndex >= 0) return resolve(reaction);
    db.update({
      Key: {
        userId: groupId,
        groupId,
      }, 
      UpdateExpression: "SET notifications[" + notificationIndex + "].reactions = list_append(if_not_exists(notifications[" + notificationIndex + "].reactions, :empty_list), :x)",
      ExpressionAttributeValues: {
        ":x": [reaction],
        ":empty_list": [],
        ":notification_index": notificationIndex
      },
      ConditionExpression: [
        "attribute_exists(id)",
        "attribute_exists(notifications)",
        "size(notifications) > :notification_index"
      ].join(" AND ")
    }, function(err, data) {
      if (err) return reject(err.message);
      return resolve(reaction);
    });
  });
};

const deleteReaction = function({db, eventCode, notificationIndex, emoji, Me, resolve, reject}) {
  const groupId = "Event-" + eventCode;
  const reaction = { emoji, userId: Me.userId };
  db.get({
    Key: {
      userId: groupId,
      groupId,
    },
  }, function (err, data) {
    if (err) return reject(err.message);
    if (!data.Item) return reject("eventCode " + eventCode + " doesn't exist on DB");
    const notifications = data.Item.notifications;
    if (!notifications || notificationIndex < 0 || notificationIndex >= notifications.length)
      return reject("notification[" + notificationIndex + "] doesn't exist on DB" +
        "(notifications.length: " + ((notifications) ? notifications.length : "null")+ " )");
    const targetNotification = notifications[notificationIndex];
    const reactions = targetNotification.reactions || [];
    const reactionIndex = reactions.findIndex(function(elm) {
      return (elm.userId == reaction.userId && elm.emoji == reaction.emoji);
    });
    if (reactionIndex < 0) return resolve(reaction);
    db.update({
      Key: {
        userId: groupId,
        groupId,
      },
      UpdateExpression: "REMOVE notifications[" + notificationIndex + "].reactions[" + reactionIndex + "]",
      ExpressionAttributeValues: {
        ":userId": reaction.userId,
        ":emoji": reaction.emoji,
        ":notification_index": notificationIndex,
        ":reaction_index": reactionIndex
      },
      ConditionExpression: [
        "attribute_exists(id)",
        "attribute_exists(notifications)",
        "size(notifications) > :notification_index",
        "attribute_exists(notifications[" + notificationIndex + "].reactions)",
        "size(notifications[" + notificationIndex + "].reactions) > :reaction_index",
        "notifications[" + notificationIndex + "].reactions[" + reactionIndex + "].userId = :userId",
        "notifications[" + notificationIndex + "].reactions[" + reactionIndex + "].emoji = :emoji"
      ].join(" AND ")
    }, function(err, data) {
      if (err) return reject(err.message);
      return resolve(reaction);
    });
  });
};

module.exports.NotificationToReactions = {
  type: new GraphQLNonNull(GraphQLList(new GraphQLNonNull(type))),
  resolve: function(notification) {
    return notification.reactions || [];
  },
};

module.exports.build = function({mutation}) {
  mutation.createReaction = {
    type: new GraphQLNonNull(type),
    args: {
      eventCode:         { type: new GraphQLNonNull(GraphQLString) },
      notificationIndex: { type: new GraphQLNonNull(GraphQLInt) },
      emoji:             { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: function(_, {eventCode, notificationIndex, emoji}, {db, Me}) {
      return new Promise(function(resolve, reject) {
        return createReaction({db, eventCode, notificationIndex, emoji, Me, resolve, reject});
      });
    },
  };

  mutation.deleteReaction = {
    type: new GraphQLNonNull(type),
    args: {
      eventCode:         { type: new GraphQLNonNull(GraphQLString) },
      notificationIndex: { type: new GraphQLNonNull(GraphQLInt) },
      emoji:             { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: function(_, {eventCode, notificationIndex, reaction}, {db, Events}) {
      return new Promise(function(resolve, reject) {
      });
    }
  };
};

