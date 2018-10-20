"use strict";

const {GraphQLInputObjectType, GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLList} = require("graphql");

const type = new GraphQLObjectType({
  name: "User",
  fields: function() { return {
    name: {
      type: GraphQLString,
      resolve: function(user) { return user.userName },
    },
  }; },
});

const inputType = new GraphQLInputObjectType({
  name: "UserInput",
  fields: function() { return {
    name: { type: GraphQLString },
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

const updateMe = function({db, user, Me, resolve, reject}) {
  if (Object.keys(user).length == 0) return reject("No user attributes are provided");
  const updateExpression = [];
  const expressionAttributeValues = {};
  Object.keys(user).forEach(function(key) {
    const value = user[key];
    if (key == "name") key = "userName";
    updateExpression.push(key + " = " + ":" + key);
    expressionAttributeValues[":" + key] = value;
  });
  db.update({
    Key: {
      userId: Me.userId,
      groupId: Me.groupId,
    },
    UpdateExpression: "SET " + updateExpression.join(", "),
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: "attribute_exists(userId)",
    ReturnValues: "ALL_NEW"
  }, function(err, data) {
    if (err) return reject(err.message);
    return resolve(data.Attributes);
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

module.exports.build = function({query, mutation}) {
  query.me = {
    type: new GraphQLNonNull(type),
    resolve: function(root, args, {Me}) { return Me; },
  };

  mutation.editMe = {
    type: new GraphQLNonNull(type),
    args: {
      user: { type: new GraphQLNonNull(inputType) },
    },
    resolve: function(_, {user}, {db, Me}) {
      return new Promise(function(resolve, reject) {
        return updateMe({db, user, Me, resolve, reject});
      });
    },
  };
};

