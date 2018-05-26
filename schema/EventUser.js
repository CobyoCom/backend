"use strict";

const {GraphQLObjectType, GraphQLInt, GraphQLString, GraphQLBoolean, GraphQLNonNull, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "EventUser",
  fields: function() {
    return {
      userName: { type: new GraphQLNonNull(GraphQLString) },
      duration: { type: GraphQLInt },
      updatedAt: { type: GraphQLString },
      travelMode: { type: GraphQLString },
      hasLeft: { type: GraphQLBoolean }
    };
  }
});

module.exports.build = function({mutation}) {
  mutation.updateEventUser = {
    type: type,
    args: {
      eventId: { type: new GraphQLNonNull(GraphQLString) },
      userName: { type: new GraphQLNonNull(GraphQLString) },
      duration: { type: GraphQLInt },
      updatedAt: { type: GraphQLString },
      travelMode: { type: GraphQLString },
      hasLeft: { type: GraphQLBoolean }
    },
    resolve: function(_, args, {db, Events}) {
      return new Promise(function(resolve, reject) {
        const {eventId, userName} = args;
        delete args.eventId;
        db.get({TableName: Events, Key: {eventId}}, function (err, data) {
          if (err) return reject(err.message);
          if (!data.Item) return reject("eventId " + eventId + " doesn't exist on DB");
          const event = data.Item;
          const targetUser = event.eventUsers.find(function(elm) {return elm.userName == userName;});      
          var returnUser = targetUser;
          var message;
          if (!targetUser) {
            message = userName + " joined";
            event.eventUsers.push(args);
            returnUser = args;
          } else {
            if (targetUser.hasLeft && !args.hasLeft) message = userName + " paused";
            else if (!targetUser.hasLeft && args.hasLeft) message = userName + " departed";
            else if (targetUser.hasLeft && targetUser.updatedAt && targetUser.duration 
                && args.hasLeft && args.updatedAt && args.duration) {
              const x = Math.round((parseInt(args.updatedAt) - parseInt(targetUser.updatedAt) + body.duration - d.duration)/(60*1000));
              if (x >= 5) message = userName + " is delayed by " + x + " minutes";
              else if (x <= -5) message = userName + " is earlier than expected by " + (-x) + " minutes";
            }
            Object.keys(args).forEach(function(k) {targetUser[k] = args[k];});
          }
          if (message) event.notifications.push({message, createdAt: (new Date()).getTime(), reactions: []})
          db.put({TableName: Events, Item: event}, function(err, data) {
            if (err) return reject(err.message);
            return resolve(returnUser);
          });
        });
      });
    }
  };
}

module.exports.fieldForEvent = { type: new GraphQLNonNull(GraphQLList(type)) };
