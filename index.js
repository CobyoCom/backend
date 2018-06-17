"use strict";

const {graphql, GraphQLSchema, GraphQLObjectType} = require("graphql");
const fs = require("fs");
const AWS = require("aws-sdk");
const webPush = require("web-push");
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

  if (event.httpMethod == "OPTIONS") {
    callback(null, ret);
    return;
  }

  if (event.path == "/graphql") {
    const body = JSON.parse(event.body);
    const query = {};
    const mutation = {};
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
    return;
  }

  if (event.path == "/push") {
    webPush.setVapidDetails(
      "https://cobyo.me",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    webPush.sendNotification(JSON.parse(event.body)).then(function() {
      ret["statusCode"] = 201;
      callback(null, ret);
    }).catch(function(error) {
      ret["statusCode"] = 500;
      console.error(error);
      callback(null, ret);
    });
    return;
  } 

  if (event.path == "/vapidPublicKey") 
    ret["body"] = process.env.VAPID_PUBLIC_KEY;
  else if (event.path == "/log") 
    console.error("CLIENT ERROR: " + event.body);
  else {
    ret["statusCode"] = 404;
    console.error("ERROR " + event.httpMethod + " " + event.path +  " " + (event.body || "(no body)") + ": 400, invalid path");
  }

  callback(null, ret);
};
