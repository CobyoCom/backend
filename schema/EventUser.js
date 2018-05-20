"use strict";

const {GraphQLObjectType, GraphQLInt, GraphQLString, GraphQLBoolean, GraphQLNonNull, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "EventUser",
  fields: function() {
    return {
      user: require("./User").fieldForEventUser,
      userName: { type: new GraphQLNonNull(GraphQLString) },
      duration: { type: GraphQLInt },
      updatedAt: { type: GraphQLInt },
      travelMode: { type: GraphQLString },
      hasLeft: { type: GraphQLBoolean }
    };
  }
});

module.exports.build = function({mutation}) {
  mutation.createEventUser = {
    type: type,
    args: {
      eventId: { type: new GraphQLNonNull(GraphQLString) },
      userName: { type: new GraphQLNonNull(GraphQLString) }
    },
    resolve: function(_, {eventId, userName}, {db}) { 
      throw new Error("Not Implemented");
    }
  };

  mutation.updateEventUser = {
    type: type,
    args: {
      eventId: { type: new GraphQLNonNull(GraphQLString) },
      userName: { type: new GraphQLNonNull(GraphQLString) },
      duration: { type: GraphQLInt },
      lastUpdated: { type: GraphQLInt },
      travelMode: { type: GraphQLString },
      hasLeft: { type: GraphQLBoolean }
    },
    resolve: function(_, args, {db, Events, Users}) {
      return new Promise(function(resolve, reject) {
        const {eventId, userName} = args;
        delete args.eventId;
        db.get({
          TableName: Events, 
          Key: {eventId}
        }, function (err, data) {
          if (err) return reject("DB1: " + err.message);
          if (!data.Item) return reject("eventId " + eventId + " doesn't exist on DB");
          const event = data.Item;
          if (!event.eventUsers) event.eventUsers = [];
          const eventUsers = event.eventUsers;
          const targetUser = eventUsers.find(function(elm) {return elm.userName == userName;});
          if (targetUser) Object.keys(args).forEach(function(k) {targetUser[k] = args[k];});
          else eventUsers.push(args);
          db.put({
            TableName: Events,
            Item: event
          }, function(err, data) {
            if (err) return reject("DB2: " + err.message);
            return resolve(args);
          });
        });
      });
    }
  };
}

module.exports.fieldForEvent = {
  type: new GraphQLList(type)
};


/*  resolve: function(event, _, {db, Events}) {
    return event.eventUsers
    db.query({
      TableName: Events,
      KeyConditionExpression: "eventId = :1", 
      ExpressionAttributeValues: {":1": params[1]}
    },
    (err, data) => {
      (err)? ret(err.statusCode || 500, err): ret(200, exclude(data.Items));
    });
  }
};
        db.get({
          TableName: Events,
          Key: {eventId: params[1], userName: params[2]}
        }, (err, data) => {
          (err)? ret(err.statusCode || 500, err): 
            merge(data.Item) &&  

const merge = (d) => {
        d = d || {message: "joined"};
        Object.keys(d).forEach((k)=>{if (!(k in body)) body[k]=d[k];});
        var ret = "";
        if (d.hasLeft && !body.hasLeft) ret += "paused";
        else if (!d.hasLeft && body.hasLeft) ret += "departed";
        else if (d.hasLeft && body.hasLeft) {
          const x = Math.round((body.lastUpdated - d.lastUpdated + body.duration - d.duration)/(60*1000));
          if (x >= 5) ret += "is delayed by " + x + " minutes";
          else if (x <= -5) ret += "is earlier than expected by " + (-x) + " minutes";
        } 
        body["id"] = params[1] + "_" + params[2];
        body["eventId"] = params[1];
        body["userName"] = params[2];
        if (ret != "") body["message"] = ret;
        body["timestamp"] = body.lastUpdated;
        return true;
      }
    const exclude = (list) => {
      if (query && query.exclude) 
        for (var i = 0; i < list.length; i++) 
          if (list[i].userName == query.exclude) {
            list.splice(i,1); 
            break;
          }
      return list;
    }

*/
