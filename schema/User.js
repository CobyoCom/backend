"use strict";
const {GraphQLObjectType, GraphQLNonNull, GraphQLString} = require("graphql");

const type = new GraphQLObjectType({
  name: "User",
  fields: function() { return {
    uuid: { type: GraphQLString },
    name: {
      type: GraphQLString,
      resolve: function(user) { return user.userName },
    },
  }; },
});

const getUser = function({db, userId, resolve, reject}) {
  db.get({
    Key: {
      userId,
      groupId: userId,
    },
  }, function(err, data) {
    if (err) return reject(err.message);
    if (!data.Item) return reject("No User found");
    return resolve(data.Item);
  });
};

module.exports.EventUserToUser = {
  type: new GraphQLNonNull(type),
  resolve: function(eventUser, _, {db}) {
    return new Promise(function(resolve, reject) {
      //TODO control authorization of what Me can see for this user
      const resolveEventUser = function(user) {
        eventUser.user = user;
        resolve(user);
      };
      return getUser({db, userId: eventUser.userId, resolve: resolveEventUser, reject});
    });
  },
};

module.exports.ReactionToUser = {
  type: new GraphQLNonNull(type),
  resolve: function(reaction, _, {db}) {
    return new Promise(function(resolve, reject) {
      //TODO control authorization of what Me can see for this user
      const resolveReactionUser = function(user) {
        reaction.user = user;
        resolve(user);
      };
      return getUser({db, userId: reaction.userId, resolve: resolveReactionUser, reject});
    });
  },
};

module.exports.build = function({query, mutation}) { };
