"use strict";

const {GraphQLInputObjectType, GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "Event",
  fields: function() { return {
    code:           { type: new GraphQLNonNull(GraphQLString) },
    name:           { type: new GraphQLNonNull(GraphQLString),
                      resolve: function(event) { return event.eventName } },
    scheduledTime:  { type: GraphQLString },
    endedTime:      { type: GraphQLString },
    place:          require("./Place").EventToPlace,
    numAttendees:   require("./EventUser").EventToNumAttendees,
    me:             require("./EventUser").EventToMe,
    eventUsers:     require("./EventUser").EventToEventUsers,
    notifications:  require("./Notification").EventToNotifications,
  }; },
});

const inputType = new GraphQLInputObjectType({
  name: "EventInput",
  fields: function() { return {
    name: { type: GraphQLString },
    scheduledTime: { type: GraphQLString },
    place: require("./Place").EventInputToPlaceInput,
  }; },
});

const createEvent = function({db, event, resolve, reject}) {
  if (event.name) {
    event.eventName = event.name;
    delete event.name;
  } else {
    event.eventName = "Default";
  }

  function put() {
    event.code = Math.floor(Math.random() * 10000).toString();
    event.userId = event.groupId = "Event-" + event.code
    db.put({
      Item: event,
      ConditionExpression: "attribute_not_exists(userId)",
    }, function (err, data) {
      if (err && err.code == "ConditionalCheckFailedException") return put(); //recursive
      if (err) return reject(err.message);
      return resolve(event);
    });
  }
  put();
};

const getEvent = function({db, code, resolve, reject}) {
  const groupId = "Event-" + code;
  db.get({
    Key: {
      userId: groupId,
      groupId,
    },
  }, function(err, data) {
    if (err) return reject(err.message);
    resolve(data.Item);
  });
};

const updateEvent = function({db, code, event, resolve, reject}) {
  if (Object.keys(event).length == 0) return reject("No event attributes are provided");
  const groupId = "Event-" + code;
  const updateExpression = [];
  const ExpressionAttributeValues = {};
  Object.keys(event).forEach(function(key) {
    if (key == "place" && event.place) {
      Object.keys(event.place).forEach(function(placeKey) {
        updateExpression.push("place." + placeKey + " = :" + placeKey);
        ExpressionAttributeValues[":" + placeKey] = event.place[placeKey];
      });
    } else {
      const value = event[key];
      if (key == "name") key = "eventName";
      updateExpression.push(key + " = " + ":" + key);
      ExpressionAttributeValues[":" + key] = value;
    }
  });
  db.update({
    Key: {
      userId: groupId,
      groupId,
    },
    UpdateExpression: "SET " + updateExpression.join(", "),
    ExpressionAttributeValues,
    ConditionExpression: "attribute_exists(userId) AND attribute_not_exists(endedTime)",
    ReturnValues: "ALL_NEW",
  }, function(err, data) {
    if (err) return reject(err.message);
    return resolve(data.Attributes);
  });
};

module.exports.build = function({query, mutation}) {
  query.event = {
    type,
    args: {
      code: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: function(_, {code}, {db}) {
      return new Promise(function(resolve, reject) {
        getEvent({db, code, resolve, reject});
      });
    },
  };

  mutation.createEvent = {
    type: new GraphQLNonNull(type),
    args: {
      event: { type: new GraphQLNonNull(inputType) },
    },
    resolve: function(_, {event}, {db}) {
      return new Promise(function(resolve, reject) {
        createEvent({db, event, resolve, reject});
      });
    },
  };

  mutation.editEvent = {
    type: new GraphQLNonNull(type),
    args: {
      code: { type: new GraphQLNonNull(GraphQLString) },
      event: { type: new GraphQLNonNull(inputType) },
    },
    resolve: function(_, {code, event}, {db}) {
      return new Promise(function(resolve, reject) {
        updateEvent({db, code, event, resolve, reject});
      });
    },
  };

  mutation.endEvent = {
    type: new GraphQLNonNull(type),
    args: {
      code: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: function(_, {code}, {db}) {
      const event = { endedTime: (new Date()).getTime() };
      return new Promise(function(resolve, reject) {
        updateEvent({db, code, event, resolve, reject});
      });
    },
  };
};

