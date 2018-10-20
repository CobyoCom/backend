"use strict";
const fs = require("fs");
const SCHEMA_DIR = "/schema"
const uuidv4 = require("uuid/v4");
const {
  graphql,
  GraphQLSchema,
  GraphQLObjectType
} = require("graphql");
const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.DYNAMODB_ENDPOINT,
  params: {
    TableName: process.env.TABLE_NAME,
  },
});
const headers = {
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Origin": process.env.ALLOW_ORIGIN,
};
const query = {};
const mutation = {};
fs.readdirSync(__dirname + SCHEMA_DIR).forEach(function(file) {
  if (file.startsWith(".")) return;
  require("." + SCHEMA_DIR + "/" + file).build({query, mutation});
});
const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: query,
  }),
  mutation: new GraphQLObjectType({
    name: "Mutation",
    fields: mutation,
  }),
});

exports.handler = function(event, context, callback) {
  const graphqlConfig = {schema};
  var sessionId = null;
  var Me = null;

  (new Promise(function(resolve, reject) {
    try {
      const body = JSON.parse(event.body);
      graphqlConfig.source = body.query;
      graphqlConfig.variableValues = body.variables;
      graphqlConfig.operationName = body.operationName;
      if (event.headers) Object.keys(event.headers).forEach(function(elm) {
        if (elm.toLowerCase() != "cookie") return;
        event.headers[elm].split(";").forEach(function(cookie) {
          const keyValue = cookie.split("=");
          if (keyValue.length != 2) return;
          if (keyValue[0].trim() != "SESSION_ID") return;
          sessionId = keyValue[1].trim();
        });
      });
      return resolve();
    } catch (err) { reject(err); }
  })).then(function() {
    return new Promise(function(resolve) {
      if (!sessionId) return resolve();
      const userId = "User-" + sessionId;
      db.get({
        Key: {
          userId,
          groupId: userId,
        },
      }, function(err, data) {
        if (err) throw err;
        Me = data.Item;
        return resolve();
      });
    });
  }).then(function() {
    return new Promise(function(resolve) {
      if (Me) return resolve();
      const putUserRec = function() {
        const uuid = uuidv4();
        const userId = "User-" + uuid;
        const Item = { userId, groupId: userId, uuid };
        db.put({ Item, ConditionExpression: "attribute_not_exists(userId)" }, function(err, data) {
          if (err && err.code == "ConditionalCheckFailedException") return putUserRec(); //recursive
          if (err) throw err;
          Me = Item;
          return resolve();
        });
      }
      putUserRec();
    });
  }).then(function() {
    headers["Set-Cookie"] = "SESSION_ID=" + Me.uuid + "; Max-Age=86400; path=/graphql; HttpOnly; secure";
    return graphql(graphqlConfig);
  }).then(
    function(data) { callback(null, { statusCode: 200, headers, body: JSON.stringify(data) });},
    function(err) { console.error(err); callback(null, { statusCode: 500, headers, body: err.toString() }); }
  );
};

