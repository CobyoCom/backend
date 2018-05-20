"use strict";

const {GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLInt, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "Reaction",
  fields: () => ({
    user: require("./User").fieldForReaction,
    emoji: { type: new GraphQLNonNull(GraphQLString) }
  })
});

module.exports.build = function({mutation}) {
  mutation.createReaction = {
    type: type,
    args: {
      notificationId: { type: new GraphQLNonNull(GraphQLInt) },
      userName: { type: new GraphQLNonNull(GraphQLString) },
      emoji: { type: new GraphQLNonNull(GraphQLString) }
    },
    resolve: function(_, {notificationId, userName, emoji}, {db}) { 
      throw new Error("Not Implemented");
    }
  };
}

module.exports.fieldForNotification = {
  type: new GraphQLList(type),
  resolve: function(notification, _, {db}) { 
    throw new Error("Not Implemented");
  }
};
