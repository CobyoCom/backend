"use strict";

// AWS context
const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.DYNAMODB_ENDPOINT,
  params: { TableName: process.env.TABLE_NAME },
});

// Slack context
const https = require("https");
const isSlackEnabled = !!(process.env.SLACK_WEBHOOK_PATH)
const slackOptions = {
  hostname: "hooks.slack.com",
  path: process.env.SLACK_WEBHOOK_PATH,
  method: "POST",
  headers: { "Content-type": "application/json" },
};

// Web-push context
const webpush = require("web-push");
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// GraphQL context
const fs = require("fs");
const uuidv4 = require("uuid/v4");
const {graphql, GraphQLSchema, GraphQLObjectType} = require("graphql");
const query = {};
const mutation = {};
fs.readdirSync(__dirname + "/schema").forEach(function(file) {
  if (file.startsWith(".")) return;
  require("./schema/" + file).build({query, mutation});
});
const schema = new GraphQLSchema({
  query:    new GraphQLObjectType({ name: "Query", fields: query }),
  mutation: new GraphQLObjectType({ name: "Mutation", fields: mutation }),
});

// Default headers
const headers = {
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Origin": process.env.ALLOW_ORIGIN,
};

exports.handler = function(event, context, callback) {
  const graphqlConfig = {schema};
  var sessionId = null;
  var newUserUuid = null;
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
          newUserUuid = Item.uuid;
          return resolve();
        });
      }
      putUserRec();
    });
  }).then(function() {
    headers["Set-Cookie"] = "SESSION_ID=" + Me.uuid + "; Max-Age=86400; path=/graphql; HttpOnly; secure";
    graphqlConfig.contextValue = { db, Me };
    return graphql(graphqlConfig);
  }).then(function(data) {
    return new Promise(function(resolve) {
      if (data.errors) throw data.errors[0].message;
      return resolve(data.data);
    });
  }).then(function(data) {
    return new Promise(function(resolve) {
      return resolve({data});
    });
  }, function(err) {
    if (isSlackEnabled) {
      const text = [];
      text.push("*Error*: " + err.toString());
      text.push(((newUserUuid) ? "*New User*: " : "*User*: ") + ((Me.userName) ? Me.userName : "No name") + " | " + Me.uuid);
      if (graphqlConfig.variableValues) text.push("*Variables*: `" + JSON.stringify(graphqlConfig.variableValues) + "`");
      text.push("*Query*: ```" + graphqlConfig.source + "```");
      https.request(slackOptions).end(JSON.stringify({
        attachments: [{
          color: "danger",
          text: text.join("\n"),
          mrkdwn_in: ["text"],
        }],
      }));
    }
    return new Promise(function(resolve) {
      return resolve({errors: [{message: err.toString()}]});
    });
  }).then(function(body) {
    callback(null, {
      statusCode: 200,
      headers,
      body: JSON.stringify(body),
    });
  });
};

