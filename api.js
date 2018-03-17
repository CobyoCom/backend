"use strict";
const app = require("express")();
const index = require("./index");

//db.set("events", {placeId: "ChIJ7VHBwnZ644kRKRWP5Qe27v4", eventName: "Royale", eventTime: Date.now()});

app.use((req, res, next) => {
  req.body = "";
  req.on('data', (d) => {req.body += d});
  req.on('end', next);
}).all("*", (req, res, next) => {
  index.handler({
    httpMethod: req.method, 
    path: req.path, 
    queryParameters: req.query
  }, null, (err, data) => {
    res.status(data.statusCode).set(data.headers).send(data.body);
  });});
	
app.listen(3001, () => {console.log("DEV API server started at http://localhost:3001");});

