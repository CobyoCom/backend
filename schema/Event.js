"use strict";

const {GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "Event",
  fields: function() {
    return {
      code: { 
        type: new GraphQLNonNull(GraphQLString),
        resolve: function(event) { return event.id; }
      },
      name: { type: new GraphQLNonNull(GraphQLString) },
      dateEnded: { type: GraphQLString },
      place: require("./Place").EventToPlace,
      eventUsers: require("./EventUser").EventToEventUsers,
      notifications: require("./Notification").EventToNotifications
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
    args: {
      place: require("./Place").createEventToPlaceInput,
      name: { type: GraphQLString },
    },
    resolve: function(_, args, {db, Events}) {
      function put(resolve, reject) {
        args.id = Math.floor(Math.random() * 10000).toString();
        db.put({
          TableName: Events,
          Item: args,
          ConditionExpression: "attribute_not_exists(id)"
        }, function (err, data) {
          if (err && err.code == "ConditionalCheckFailedException") return put(resolve, reject);
          if (err) return reject(err.message);
          return resolve(args);
        });
      }
      return new Promise(put);
    }
  };

  mutation.endEvent = {
    type: type,
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
