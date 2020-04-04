"use strict";

const {GraphQLInputObjectType, GraphQLObjectType, GraphQLNonNull, GraphQLString} = require("graphql");

const type = new GraphQLObjectType({
  name: "Me",
  fields: function() { return {
    uuid: { type: GraphQLString },
    name: {
      type: GraphQLString,
      resolve: function(user) { return user.userName },
    },
    isWebSubscribed: require("./WebSubscription").MeToIsWebSubscribed,
  }; },
});

const inputType = new GraphQLInputObjectType({
  name: "MeInput",
  fields: function() { return {
    name: { type: GraphQLString },
    webSubscription: require("./WebSubscription").MeInputToWebSubscriptionInput,
  }; },
});

module.exports.build = function({query, mutation}) {
  query.me = {
    type: new GraphQLNonNull(type),
    resolve: function(root, args, {Me}) { return Me; },
  };

  mutation.editMe = {
    type: new GraphQLNonNull(type),
    args: {
      me: { type: new GraphQLNonNull(inputType) },
    },
    resolve: function(_, {me}, {db, Me}) {
      return new Promise(function(resolve, reject) {
        if (Object.keys(me).length == 0) return reject("No user attributes are provided");
        const updateExpression = [];
        const expressionAttributeValues = {};
        Object.keys(me).forEach(function(key) {
          const value = me[key];
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
      });
    },
  };
};
