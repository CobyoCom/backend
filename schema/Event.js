"use strict";

const {GraphQLInputObjectType, GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "Event",
  fields: function() {
    return {
      code: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: function(event) { return event.id; }
      },
      name: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: function(event) {
          return event.eventName || "default";
        }
      },
      scheduledTime: { type: GraphQLString },
      dateEnded: { type: GraphQLString },
      place: require("./Place").EventToPlace,
      eventUsers: require("./EventUser").EventToEventUsers,
      notifications: require("./Notification").EventToNotifications
    };
  }
});

const inputType = new GraphQLInputObjectType({
  name: "EventInput",
  fields: function() {
    return {
      name: { type: GraphQLString },
      scheduledTime: { type: GraphQLString },
      place: require("./Place").EventInputToPlaceInput
    };
  }
});

module.exports.build = function({query, mutation}) {
  query.event = {
    type: type,
    args: { code: { type: new GraphQLNonNull(GraphQLString) } },
    resolve: function(_, {code}, {db, Events}) {
      return new Promise(function (resolve, reject) {
        db.get({
          TableName: Events,
          Key: {id: code}
        }, function (err, data) {
          if (err) return reject(err.message);
          return resolve(data.Item);
        });
      });
    }
  };

  mutation.createEvent = {
    type: new GraphQLNonNull(type),
    args: { event: { type: new GraphQLNonNull(inputType) } },
    resolve: function(_, {event}, {db, Events}) {
      if (event.name) {
        event.eventName = event.name;
        delete event.name;
      }
      function put(resolve, reject) {
        event.id = Math.floor(Math.random() * 10000).toString();
        db.put({
          TableName: Events,
          Item: event,
          ConditionExpression: "attribute_not_exists(id)"
        }, function (err, data) {
          if (err && err.code == "ConditionalCheckFailedException") return put(resolve, reject);
          if (err) return reject(err.message);
          return resolve(event);
        });
      }
      return new Promise(put);
    }
  };

  mutation.editEvent = {
    type: new GraphQLNonNull(type),
    args: {
      code: { type: new GraphQLNonNull(GraphQLString) },
      event: { type: new GraphQLNonNull(inputType) }
    },
    resolve: function(_, {code, event}, {db, Events}) {
      return new Promise(function(resolve, reject) {
        const updateExpression = [];
        const expressionAttributeValues = {};
        Object.keys(event).forEach(function(key) {
          const value = event[key];
          if (key == "name") key = "eventName";
          updateExpression.push(key + " = " + ":" + key);
          expressionAttributeValues[":" + key] = value;
        });
        db.update({
          TableName: Events,
          Key: {id: code},
          UpdateExpression: "SET " + updateExpression.join(", "),
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: "attribute_exists(id)",
          ReturnValues: "ALL_NEW"
        }, function(err, data) {
          if (err) return reject(err.message);
          return resolve(data.Attributes);
        });
      });
    }
  }

  mutation.endEvent = {
    type: new GraphQLNonNull(type),
    args: { code: { type: new GraphQLNonNull(GraphQLString) } },
    resolve: function(_, {code}, {db, Events}) {
      return new Promise(function(resolve, reject) {
        db.update({
          TableName: Events,
          Key: {id: code},
          UpdateExpression: "SET dateEnded = :x",
          ExpressionAttributeValues: { ":x": (new Date()).getTime() },
          ConditionExpression: [
            "attribute_exists(id)",
            "attribute_not_exists(dateEnded)"
          ].join(" AND "),
          ReturnValues: "ALL_NEW"
        }, function(err, data) {
          if (err) return reject(err.message);
          return resolve(data.Attributes);
        });
      });
    }
  };
}
