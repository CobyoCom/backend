const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const http = require("http");
const https = require("https");
const dbwrap = require("./dbwrap");

const db = new dbwrap();
db.set("events", {placeId: "ChIJ7VHBwnZ644kRKRWP5Qe27v4", eventName: "Royale", 
	eventTime: now()}, {});

const app = express();
app.use(bodyParser.json()
).use((req, res, next) => {
	console.log(["[" + now() + "]", req.method, req.path, 
			"params:", JSON.stringify(req.params), 
			"query:", JSON.stringify(req.query), 
			"body:", JSON.stringify(req.body)].join(" "));
	next(); 
}).get("/api/dump", (req, res) => {
	res.json(db.dump());
}).post("/api/events", (req, res) => {
	res.json(db.set("events", req.body));
}).get("/api/events/:id", (req, res) => {
	res.json(db.get("events", req.params, req.query));
}).get("/api/events/:eventId/users", (req, res) => { 
	res.json(db.get("eventUsers", req.params, req.query, false));
}).put("/api/events/:eventId/users/:userName", (req, res) => { 
	res.json(db.set("eventUsers", req.body, req.params));
});
	
if (process.env.NODE_ENV != "production") {
	http.createServer(app).listen(3001, () => {
		console.log("[" + now() + "] DEV API server started at 3001");
	});
} else {
	app.use(express.static(__dirname + "/build"))
	.get("*", (req, res) => {
		res.sendFile(__dirname + "/build/index.html");
	});
	https.createServer({
		key: fs.readFileSync("https.key"), 
		cert: fs.readFileSync("https.crt"), 
	}, app).listen(3000, () => {
		console.log("[" + now() + "] PROD WEB server started at 3000");
	});
}

function now() {return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');}
