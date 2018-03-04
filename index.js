"use strict";

moment().format("YYYY-MM-DD hh:mm:ss A")
const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient(); 
const ptr = require("path-to-regexp");

exports.handler = function(event, context, callback){
	var params;
	
	if ((params = ptr("/api/events").exec(event.path)) 
			&& event.httpMethod == "POST") {
		var e, ret;
		do {
			event.body.id = Math.floor(Math.random() * 10000);
			db.put({
				TableName: "Events",
				Item: event.body,
				ReturnValues: "ALL_NEW",
				ConditionExpression: "attribute_not_exists(id)"
			}, (err, data) => { e, ret = err, data; });
		} while (e && e.code == "ConditionalCheckFailedException");
		(e) ? callback(e) 
			: callback(null, {statusCode: 200, body: JSON.stringify(ret.Item)});

	} else if ((params = ptr("/api/events/:id").exec(event.path)) 
			&& event.httpMethod == "GET") {
		db.get({TableName: "Events", Key: {id: params[1]}}, (err, data) => {
			(err) ? callback(err) 
				: (!data.Item) ? callback(null, {statusCode:404})
				: callback(null, {statusCode: 200, body: JSON.stringify(data.Item)});
		});
	} else if ((params = ptr("/api/events/:eventId/users").exec(event.path)) 
			&& event.httpMethod == "GET") {
		// TODO event.querystuff
		db.query({
			TableName: "EventUsers",
			KeyConditionExpression: "eventId = :eventId",
			ExpressionAttributeValues: {":eventId": params[1]}
		}, (err, data) => {
			(err)? callback(err)
				: callback(null, {statusCode: 200, body: JSON.stringify(data.Items)});
		});

	} else if ((params = ptr("/api/events/:eventId/users/:userName").exec(event.path))
			&& event.httpMethod == "PUT") {
		event.body.eventId = params[1];
		event.body.userName = params[2];
		db.put({
			TableName: "EventUsers",
			Item: event.body,
			ReturnValues: "ALL_NEW"
		}, (err, data) => {
			(err)? callback(err)
				: callback(null, {statusCode: 200, body: JSON.stringify(data.Item)});
		});

	} else if ((params = ptr("/api/events/:eventId/notifications").exec(event.path)) 
			&& event.httpMethod == "GET") {
		db.query({
			TableName: "EventUsers",
			KeyConditionExpression: "eventId = :eventId",
			ExpressionAttributeValues: {":eventId": params[1]}
		}, (err, data) => {
			(err) ? callback(err)
				: callback(null, {statusCode: 200, body: JSON.stringify(data.Items)});
		});

	} else callback(null, {statusCode: 404});
}

