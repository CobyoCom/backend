"use strict";
const fs = require("fs");
const uuidv4 = require("uuid/v4");
const https = require("https");
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
fs.readdirSync(__dirname + "/schema").forEach(function(file) {
  if (file.startsWith(".")) return;
  require("./schema/" + file).build({query, mutation});
});

const {
  graphql,
  GraphQLSchema,
  GraphQLObjectType
} = require("graphql");

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

const slackOptions = {
  hostname: "hooks.slack.com",
  path: process.env.SLACK_WEBHOOK_PATH,
  method: "POST",
  headers: { "Content-type": "application/json" },
};

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
    graphqlConfig.contextValue = { db, Me };
    return graphql(graphqlConfig);
  }).then(function(data) {
    return new Promise(function(resolve) {
      if (data.errors) throw data.errors.messages[0];
      return resolve(data.data);
    });
  }).then(function(data) {
    if (process.env.SLACK_WEBHOOK_PATH) https.request(slackOptions).end(JSON.stringify({
//console.log(JSON.stringify({
      attachments: [{
        color: (sessionId) ? "good" : "warning",
        text: ((sessionId) ? "User " : "New User ") + ((Me.userName) ? Me.userName : "(no name)") + " (" + Me.uuid + ")",
        mrkdwn_in: ["fields"],
        fields: [{
          title: "Query",
          value: "```" + graphqlConfig.source + "```",
        }, {
          title: "Variables",
          value: "```" + graphqlConfig.variableNames + "```",
        }, {
          title: "Response",
          value: "```" + JSON.stringify(data, null, 2) + "```",
        }],
      }],
    }));
    return new Promise(function(resolve) {
      return resolve({data});
    });
  }, function(err) {
    if (process.env.SLACK_WEBHOOK_PATH) https.request(slackOptions).end(JSON.stringify({
      attachments: [{
        color: "danger",
        text: "Error From Production: " + ((sessionId) ? "User " : "New User ") + ((Me.userName) ? Me.userName : "(no name)") + " (" + Me.uuid + ")",
        mrkdwn_in: ["fields"],
        fields: [{
          title: "Query",
          value: "```" + graphqlConfig.source + "```",
        }, {
          title: "Variables",
          value: "```" + graphqlConfig.variableNames + "```",
        }, {
          title: "Error",
          value: "```" + err.toString() + "```",
        }],
      }],
    }));
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

