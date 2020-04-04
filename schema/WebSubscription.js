"use strict";

const {GraphQLInputObjectType, GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLBoolean} = require("graphql");

const inputType = new GraphQLInputObjectType({
  name: "WebSubscriptionInput",
  fields: function() { return {
    endpoint: { type: new GraphQLNonNull(GraphQLString) },
    p256dh: { type: new GraphQLNonNull(GraphQLString) },
    auth: { type: new GraphQLNonNull(GraphQLString) },
  }; },
});

module.exports.MeToIsWebSubscribed = {
  type: new GraphQLNonNull(GraphQLBoolean),
  resolve: function(me, args, {Me}) {
    return ('webSubscription' in Me);
  },
};

module.exports.MeInputToWebSubscriptionInput = {
  type: inputType,
}

module.exports.build = function({query, mutation}) {};

