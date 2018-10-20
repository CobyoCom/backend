"use strict";

const {GraphQLInputObjectType, GraphQLObjectType, GraphQLInt, GraphQLString, GraphQLBoolean, GraphQLNonNull, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "EventUser",
  fields: function() { return {
    duration:     { type: GraphQLInt, resolve: function(eventUser) { return eventUser.durationLeft; } },
    updatedTime:  { type: GraphQLString },
    travelMode:   { type: GraphQLString },
    hasLeft:      { type: GraphQLBoolean },
    user:         require("./User").EventUserToUser,
  }; },
});

const inputType = new GraphQLInputObjectType({
  name: "EventUserInput",
  fields: function() { return {
    duration:     { type: GraphQLInt },
    updatedTime:  { type: GraphQLString },
    travelMode:   { type: GraphQLString },
    hasLeft:      { type: GraphQLBoolean },
  }; },
});

const createEventUser = function({db, code, Me, resolve, reject}) {
  const groupId = "Event-" + code;
  const Item = {
    userId: Me.userId,
    groupId,
  };
  db.get({
    Key: {
      userId: groupId,
      groupId,
    },
  }, function(err, data) {
    if (err) return reject(err.message);
    if (!data.Item) reject("No event can be found with code " + code);
    db.put({
      Item,
      ConditionExpression: "attribute_not_exists(userId)",
    }, function(err, data) {
      if (err) return reject(err.message);
      return resolve(Item);
    });
  });
};

const getEventUsers = function({db, event, resolve, reject}) {
  if (event.eventUsers) return resolve(event.eventUsers);
  db.query({
    IndexName: "Group",
    KeyConditionExpression: "groupId = :groupId AND begins_with(userId, :user)",
    ExpressionAttributeValues: {
      ":groupId": event.groupId,
      ":user": "User-",
    },
  }, function(err, data) {
    if (err) return reject(err.message);
    event.eventUsers = data.Items;
    return resolve(event.eventUsers);
  });
};

const updateEventUser = function({db, eventCode, eventUser, Me, resolve, reject}) {
  if (Object.keys(eventUser).length == 0) return reject("No eventUser attributes are provided");
  //TODO check if my name is null
  const groupId = "Event-" + eventCode;
  const updateExpression = [];
  const ExpressionAttributeValues = {};
  Object.keys(eventUser).forEach(function(key) {
    const value = eventUser[key]
    if (key == "duration") key = "durationLeft";
    updateExpression.push(key + " = :" + key);
    ExpressionAttributeValues[":" + key] = value;
  });

  db.update({
    Key: {
      userId: Me.userId,
      groupId,
    },
    UpdateExpression: "SET " + updateExpression.join(", "),
    ExpressionAttributeValues,
    ConditionExpression: "attribute_exists(userId)",
    ReturnValues: "ALL_NEW", //TODO UPDATED_OLD, make notifications out of this
  }, function (err, data) {
    if (err) return reject(err.message);
    return resolve(data.Attributes);
  });
};

/*
          //TODO create notification upon changed attributes
          var message;
          if (!Me.name) return reject("You are in a bad state where you joined Event " + code + " but your name is not set");
          //TODO Join: message = eventUser.userName + " joined";
            if (targetUser.hasLeft && eventUser.hasLeft == false) message = eventUser.userName + " paused";
            else if (!targetUser.hasLeft && eventUser.hasLeft) message = eventUser.userName + " departed";
            else if (targetUser.hasLeft && targetUser.updatedAt && targetUser.duration
                && eventUser.hasLeft && eventUser.updatedAt && eventUser.duration) {
              const x = Math.round((parseInt(eventUser.updatedAt) - parseInt(targetUser.updatedAt) + eventUser.duration - targetUser.duration)/(60*1000));
              if (x >= 5) message = eventUser.userName + " is delayed by " + x + " minutes";
              else if (x <= -5) message = eventUser.userName + " is earlier than expected by " + (-x) + " minutes";
            }
          if (message) {
            updateExpression.push("notifications = list_append(if_not_exists(notifications, :empty_list), :y)");
            expressionAttributeValues[":empty_list"] = [];
            expressionAttributeValues[":y"] = [{message, createdAt: (new Date()).getTime()}];
          }
*/

module.exports.EventToEventUsers = {
  type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(type))),
  resolve: function(event, _, {db, Me}) {
    return new Promise(function(resolve, reject) {
      const resolveIfJoined = function(eventUsers) {
        if (eventUsers.find(function(elm) { return elm.userId == Me.userId })) return resolve(eventUsers);
        return resolve([]);
      };
      getEventUsers({db, event, resolve: resolveIfJoined, reject});
    });
  },
};

module.exports.EventToNumAttendees = {
  type: new GraphQLNonNull(GraphQLInt),
  resolve: function(event, _, {db, Me}) {
    return new Promise(function(resolve, reject) {
      const resolveNumAttendees = function(eventUsers) {
        return resolve(eventUsers.length);
      };
      getEventUsers({db, event, resolve: resolveNumAttendees, reject})
    });
  },
}

module.exports.EventToMe = {
  type,
  resolve: function(event, _, {db, Me}) {
    return new Promise(function(resolve, reject) {
      const resolveMe = function(eventUsers) {
        return resolve(eventUsers.find(function(elm) { return elm.userId == Me.userId }));
      };
      getEventUsers({db, event, resolve: resolveMe, reject});
    });
  },
};

module.exports.build = function({mutation}) {
  mutation.joinEvent = {
    type,
    args: {
      code: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: function(_, {code}, {db, Me}) {
      return new Promise(function(resolve, reject) {
        //TODO authorizatoin of joining
        createEventUser({db, code, Me, resolve, reject});
      });
    },
  };

  mutation.updateEventUser = {
    type: new GraphQLNonNull(type),
    args: {
      eventCode: { type: new GraphQLNonNull(GraphQLString) },
      eventUser: { type: new GraphQLNonNull(inputType) },
    },
    resolve: function(_, {eventCode, eventUser}, {db, Me}) {
      return new Promise(function(resolve, reject) {
        updateEventUser({db, eventCode, eventUser, Me, resolve, reject });
      });
    },
  };
};

