"use strict";

const {GraphQLObjectType, GraphQLNonNull, GraphQLInt, GraphQLString, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "Notification",
  fields: () => ({
    notificationId: { type: new GraphQLNonNull(GraphQLInt) },
    createdAt: { type: new GraphQLNonNull(GraphQLInt) },
    message: { type: new GraphQLNonNull(GraphQLString) },
    reactions: require("./Reaction").fieldForNotification
  })
});

module.exports.build = function(_) { };

module.exports.fieldForEvent = {
  type: new GraphQLList(type),
  resolve: function(event, _, {db, Events}) {
    throw new Error("Not Implemented");
  }
};
/*    db.query({
      TableName: Events,
      KeyConditionExpression: "eventId = :1", 
      ExpressionAttributeValues: {":1": params[1]}
    }, (err, data) => {
      (err)? ret(err.statusCode || 500, err): ret(200, data.Items)
    });
*/
