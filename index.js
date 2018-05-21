"use strict";

const {graphql, GraphQLSchema, GraphQLObjectType} = require("graphql");
const fs = require("fs");
const AWS = require("aws-sdk");
const SCHEMA_DIR = "/schema"

exports.handler = function(event, context, callback) { 
  const ret = { 
    statusCode: 200, 
    headers: {  
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,OPTIONS,POST,PUT",
      "access-control-allow-origin": process.env.ALLOW_ORIGIN
    }
  };
  // Async graphql
  if (event.httpMethod == "OPTIONS") callback(null, ret);
  else if (event.path == "/graphql") handleGraphQL(event.body, ret, callback);
  else if (event.path == "/log") {
    console.error("CLIENT ERROR: " + event.body);
    callback(null, ret);
  } else {
    ret["statusCode"] = 404;
    console.error("ERROR " + event.httpMethod + " " + event.path +  " " + (event.body || "(no body)") + ": 400, invalid path");
    callback(null, ret);
  }
};

function handleGraphQL(params, ret, callback) {
  const body = JSON.parse(params);
  const query = {};
  const mutation = {};
  //TODO async?
  fs.readdirSync(__dirname + SCHEMA_DIR).forEach(function(file) {
    require("." + SCHEMA_DIR + "/" + file).build({query, mutation});
  });
  graphql({
    schema: new GraphQLSchema({ 
      query: new GraphQLObjectType({name: "Query", fields: query}),
      mutation: new GraphQLObjectType({name: "Mutation", fields: mutation})
    }),
    contextValue: {
      db: new AWS.DynamoDB.DocumentClient({
        endpoint: process.env.DYNAMODB_ENDPOINT, 
        region: process.env.AWS_REGION
      }),
      Events: process.env.TABLE_EVENT,
      Users: process.env.TABLE_USER
    },
    source: body.query,
    variableValues: body.variables,
    operationName: body.operationName
  }).then(function(data) {
    ret["body"] = JSON.stringify(data);
    callback(null, ret);
  });
};
