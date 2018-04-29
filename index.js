"use strict";
const AWS = require("aws-sdk");
const graphql = require('graphql');
const db = new AWS.DynamoDB.DocumentClient({endpoint: process.env.DYNAMODB_ENDPOINT, region: process.env.AWS_REGION}); 
const headers = {  
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,OPTIONS,POST,PUT",
  "access-control-allow-origin": process.env.ALLOW_ORIGIN
};

const schema = graphql.buildSchema(`
  type Event {
    eventId: Int! // Unique but not necessarily auto-increment
    eventUsers: [EventUser]
    notifications: [Notification]
  }
  type User {
    name: String! // Unique
    userEvents: [EventUser]
  }
  type EventUser {
    event: Event!
    user: User!
    duration: Int
    updatedAt: Int
    travelMode: String
    hasLeft: Boolean
  }
  type Notification {
    notificationId: Int!
    createdAt: Int!
    message: String!
    reactions: [Reaction]
  }
  type Reaction {
    user: User!
    emoji: String!
  }
  type Query {
    event(eventId: Int!): Event
    user(userName: String!): User
  }
  type Mutation {
    createEvent(placeId: String!): Event
    updateEventUser(eventId: Int!, userName: String!, duration: Int, lastUpdated: Int, travelMode: String, hasLeft: Boolean): EventUser
    createEventUser(eventId: Int!, userName: String!): EventUser
    createReaction(notificationId: Int!, userName: String!, emoji: String!): Reaction
    deleteReaction(notificationId: Int!, userName: String!, emoji: String!): Boolean
  }
`);

const root = {
  getEvent: (args, b, c) => {
    return Event.find(args.id);
  }, 
  createEvent: (args, b, c) => {
    return new Event(args.placeId);
  }
}

class Event {
  constructor() {
    this.id = id;
  }
}

class User {
}

class EventUser {
}

class Notification {
}

class Reaction {
}

  const put = () => {
    body.id = Math.floor(Math.random() * 10000).toString();
    db.put({TableName: process.env.TABLE_EVENT, Item: body, ConditionExpression: "attribute_not_exists(id)"}, (err, data) => (
      err && err.code == "ConditionalCheckFailedException")? put(): (err)? ret(err.statusCode || 500, err): ret(200, body));
  }  
	const exclude = (list) => {
	  if (query && query.exclude) for (var i = 0; i < list.length; i++) if (list[i].userName == query.exclude) {list.splice(i,1); break;}
	  return list;
	}
	const merge = (d) => {
    d = d || {message: "joined"};
    Object.keys(d).forEach((k)=>{if (!(k in body)) body[k]=d[k];});
    
    var ret = "";
	  if (d.hasLeft && !body.hasLeft) ret += "paused";
    else if (!d.hasLeft && body.hasLeft) ret += "departed";
    else if (d.hasLeft && body.hasLeft) {
      const x = Math.round((body.lastUpdated - d.lastUpdated + body.duration - d.duration)/(60*1000))
      if (x >= 5) ret += "is delayed by " + x + " minutes"
      else if (x <= -5) ret += "is earlier than expected by " + (-x) + " minutes"
    } 

    body["id"] = params[1] + "_" + params[2];
    body["eventId"] = params[1];
    body["userName"] = params[2];
    if (ret != "") body["message"] = ret;
    body["timestamp"] = body.lastUpdated;
    return true;
	}

	if ((params = ptr("/api/events", event.path)) && event.httpMethod == "POST")
	  put();
  else if ((params = ptr("/api/events/:id", event.path)) && event.httpMethod == "GET") 
    db.get({TableName: process.env.TABLE_EVENT, Key: {id: params[1]}}, (err, data) => {
      (err)? ret(err.statusCode || 500, err): (!data.Item)? ret(404, {message: "eventId " + params[1] + " doesn't exist on DB"}): ret(200, data.Item);
    });
  else if ((params = ptr("/api/events/:eventId/users", event.path)) && event.httpMethod == "GET")
		db.query({TableName: process.env.TABLE_USER, KeyConditionExpression: "eventId = :1", ExpressionAttributeValues: {":1": params[1]}}, (err, data) => {
		  (err)? ret(err.statusCode || 500, err): ret(200, exclude(data.Items));
		});
	else if ((params = ptr("/api/events/:eventId/users/:userName", event.path)) && event.httpMethod == "PUT")
		db.get({TableName: process.env.TABLE_USER, Key: {eventId: params[1], userName: params[2]}}, (err, data) => {
		  (err)? ret(err.statusCode || 500, err): merge(data.Item) && db.put({TableName: process.env.TABLE_USER, Item: body}, (e,d) => (e)? ret(err.statusCode || 500, e): ret(200, body));
		});
  else if ((params = ptr("/api/events/:eventId/notifications", event.path)) && event.httpMethod == "GET") 
    db.query({TableName: process.env.TABLE_USER, KeyConditionExpression: "eventId = :1", ExpressionAttributeValues: {":1": params[1]}}, (err, data) => {
      (err)? ret(err.statusCode || 500, err): ret(200, data.Items)
    });


exports.handler = function(event, context, callback) { 
  try {
    var code = 200, ret = {};
    const body = JSON.parse(event.body);
    if (event.path == "OPTIONS") {}
    if (event.path == "/graphql") graphql.graphql(schema, body.query, root, null, body.variables, body.operationName, null).then((response) => {
      if (response.errors) throw JSON.stringify(response.errors);
      ret = response;
    });
    else if (event.path == "/log") console.error("CLINET ERROR: " + event.body);
    else throw "URL is invalid enpoint";
  } catch (error) {
    code = 400;
    ret = {message: error.message};
    console.error("ERROR " + event.httpMethod + " " + event.path +  " " + (event.body || "(no body)") + ": 400, " + error.message);
  } finally {
    callback(null, {statusCode: code, headers: headers, body: JSON.stringify(ret)});
  }
}
