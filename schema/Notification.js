"use strict";

const {GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "Notification",
  fields: () => ({
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    message: { type: new GraphQLNonNull(GraphQLString) },
    reactions: require("./Reaction").fieldForNotification
  })
});

module.exports.build = function(_) { };

module.exports.fieldForEvent = {type: new GraphQLNonNull(GraphQLList(type))};
