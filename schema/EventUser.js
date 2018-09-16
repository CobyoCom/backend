"use strict";

const {GraphQLInputObjectType, GraphQLObjectType, GraphQLInt, GraphQLString, GraphQLBoolean, GraphQLNonNull, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "EventUser",
  fields: {
    userName: { type: new GraphQLNonNull(GraphQLString) },
    duration: { type: GraphQLInt },
    updatedAt: { type: GraphQLString },
    travelMode: { type: GraphQLString },
    hasLeft: { type: GraphQLBoolean }
  }
});

const inputType = new GraphQLInputObjectType({
  name: "EventUserInput",
  fields: {
    userName: { type: new GraphQLNonNull(GraphQLString) },
    duration: { type: GraphQLInt },
    updatedAt: { type: GraphQLString },
    travelMode: { type: GraphQLString },
    hasLeft: { type: GraphQLBoolean }
  }
});

module.exports.EventToEventUsers = {
  type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(type))),
  resolve: function(event) { return event.eventUsers || []; }
}

module.exports.build = function({mutation}) {
  mutation.updateEventUser = {
    type: new GraphQLNonNull(type),
    args: {
      eventCode: { type: new GraphQLNonNull(GraphQLString) },
      eventUser: { type: new GraphQLNonNull(inputType) },
    },
    resolve: function(_, {eventCode, eventUser}, {db, Events}) {
      return new Promise(function(resolve, reject) {
        db.get({
          TableName: Events,
          Key: {id: eventCode}
        }, function (err, data) {
          var message, targetUser;
          if (err) return reject(err.message);
          if (!data.Item) return reject("eventCode " + eventCode + " doesn't exist on DB");
          const eventUsers = data.Item.eventUsers || [];
          const notifications = data.Item.notifications || [];
          const targetUserIndex = eventUsers.findIndex(function(elm) {return elm.userName == eventUser.userName;});
          const updateExpression = [];
          const expressionAttributeValues = {};
          const conditionExpression = ["attribute_exists(id)"];
          if (targetUserIndex < 0) {
            updateExpression.push("eventUsers = list_append(if_not_exists(eventUsers, :empty_list), :x)");
            message = eventUser.userName + " joined";
            expressionAttributeValues[":empty_list"] = [];
            expressionAttributeValues[":x"] = [eventUser];
            targetUser = eventUser;
          } else {
            targetUser = eventUsers[targetUserIndex];
            if (targetUser.hasLeft && eventUser.hasLeft == false) message = eventUser.userName + " paused";
            else if (!targetUser.hasLeft && eventUser.hasLeft) message = eventUser.userName + " departed";
            else if (targetUser.hasLeft && targetUser.updatedAt && targetUser.duration
                && eventUser.hasLeft && eventUser.updatedAt && eventUser.duration) {
              const x = Math.round((parseInt(eventUser.updatedAt) - parseInt(targetUser.updatedAt) + eventUser.duration - targetUser.duration)/(60*1000));
              if (x >= 5) message = eventUser.userName + " is delayed by " + x + " minutes";
              else if (x <= -5) message = eventUser.userName + " is earlier than expected by " + (-x) + " minutes";
            }
            Object.keys(eventUser).forEach(function(k) {targetUser[k] = eventUser[k];});
            updateExpression.push("eventUsers[" + targetUserIndex + "] = :x");
            conditionExpression.push("size(eventUsers) > :user_index");
            conditionExpression.push("eventUsers[" + targetUserIndex + "].userName = :userName");
            expressionAttributeValues[":x"] = targetUser;
            expressionAttributeValues[":userName"] = eventUser.userName;
            expressionAttributeValues[":user_index"] = targetUserIndex;
          }
          if (message) {
            updateExpression.push("notifications = list_append(if_not_exists(notifications, :empty_list), :y)");
            expressionAttributeValues[":empty_list"] = [];
            expressionAttributeValues[":y"] = [{message, createdAt: (new Date()).getTime()}];
          }
          if (updateExpression.length > 0) {
            db.update({
              TableName: Events,
              Key: {id: eventCode},
              UpdateExpression: "SET " + updateExpression.join(", "),
              ExpressionAttributeValues: expressionAttributeValues,
              ConditionExpression: conditionExpression.join(" AND ")
            }, function(err, data) {
              if (err) return reject(err.message);
              return resolve(targetUser);
            });
          } else reject("updateEventUser updateExpresionLength is 0 when it should never be");
        });
      });
    }
  };
}
