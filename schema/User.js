"use strict";

const {GraphQLObjectType, GraphQLNonNull, GraphQLString} = require("graphql");

const type = new GraphQLObjectType({
  name: "User",
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    events: require("./Event").fieldForUser
  })
});

module.exports.build = function({query, mutation}) {
  query.user = {
    type: type,
    args: { userName: { type: new GraphQLNonNull(GraphQLString) } },
    resolve: function(_, {userName}, {db}) {
      throw new Error("Not Implemented");
    }
  };

  mutation.createUser = {
    type: type,
    args: { userName: { type: new GraphQLNonNull(GraphQLString) } },
    resolve: function(_, {userName}, {db}) {
      throw new Error("Not Implemented");
    }
  };
}

module.exports.fieldForEventUser = {
  type: new GraphQLNonNull(type),
  resolve: function(eventUser, _, {db}) {
    throw new Error("Not Implemented");
  }
};

module.exports.fieldForReaction = {
  type: new GraphQLNonNull(type),
  resolve: function(reaction, _, {db}) {
    throw new Error("Not Implemented");
  }
};
