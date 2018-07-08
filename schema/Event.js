"use strict";

const {GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "Event",
  fields: function() {
    return {
      eventId: { type: new GraphQLNonNull(GraphQLString) },
      placeId: { type: new GraphQLNonNull(GraphQLString) },
      eventName: { type: new GraphQLNonNull(GraphQLString) },
      dateEnded: { type: GraphQLString },
      eventUsers: require("./EventUser").fieldForEvent,
      notifications: require("./Notification").fieldForEvent
    };
  }
});

module.exports.build = function({query, mutation}) {
 query.event = { 
    type: type,
    args: { eventId: { type: new GraphQLNonNull(GraphQLString) } },
    resolve: function(_, {eventId}, {db, Events}) {
      return new Promise(function (resolve, reject) {
        db.get({TableName: Events, Key: {eventId}}, function (err, data) {
          if (err) return reject(err.message);
          if (!data.Item) return reject("eventId " + eventId + " doesn't exist on DB");
          return resolve(data.Item);
        });
      });
    }
  };
  
  mutation.createEvent = {
    type: type,
    args: { 
      placeId: { type: new GraphQLNonNull(GraphQLString) },
      eventName: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: function(_, {placeId, eventName}, {db, Events}) {
      function put(resolve, reject) {
        const eventId = Math.floor(Math.random() * 10000).toString();
        db.put({TableName: Events, Item: {eventId, placeId, eventName, eventUsers: [], notifications: []}, ConditionExpression: "attribute_not_exists(eventId)"}, function (err, data) {
          if (err && err.code == "ConditionalCheckFailedException") return put(resolve, reject);
          if (err) return reject(err.message);
          return resolve({eventId, placeId, eventName});
        });
      }
      return new Promise(put);
    }
  };

  mutation.endEvent = {
    type,
    args: {eventId: {type: new GraphQLNonNull(GraphQLString)}},
    resolve: function(_, {eventId}, {db, Events}) {
      return new Promise((resolve, reject) => {
        db.update({
          TableName: Events,
          Key: {eventId},
          AttributeUpdates: {
            'dateEnded': {
              Action: 'ADD',
              Value: (new Date()).getTime()
            }
          },
          Expected: {
            'eventId': {
              ComparisonOperator: 'EQ',
              Value: eventId
            },
            'dateEnded': {
              Exists: false
            }
          },
          ReturnValues: 'ALL_NEW'
        }, (err, data) => {
          if (err) return reject(err.message);
          return resolve({...data.Attributes});
        });
      });
    }
  };
}
