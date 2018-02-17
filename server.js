const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const http = require("http");
const https = require("https");
const moment = require('moment');
const dbwrap = require("./dbwrap");

const THRESHOLD = 1;

const db = new dbwrap();
db.set("events", {
	placeId: "ChIJ7VHBwnZ644kRKRWP5Qe27v4", eventName: "Royale", 
	eventTime: moment().format("YYYY-MM-DD hh:mm:ss A")
}, {});

const app = express();
app.use(bodyParser.json()
).use((req, res, next) => {
	console.log(["[" + moment().format("YYYY-MM-DD hh:mm:ss A") + "]", 
			req.method, req.path, 
			"params:", JSON.stringify(req.params), 
			"query:", JSON.stringify(req.query), 
			"body:", JSON.stringify(req.body)].join(" "));
	next(); 
}).get("/log/dump", (req, res) => {
	res.json(db.dump());
}).get("/log/*", (req, res) => {
	res.sendFile(__dirname + req.path);
}).post("/api/events", (req, res) => {
	res.json(db.set("events", req.body));
}).get("/api/events/:id", (req, res) => {
	res.json(db.get("events", req.params, req.query));
}).get("/api/events/:eventId/users", (req, res) => { 
	res.json(db.get("eventUsers", req.params, req.query, false));
}).put("/api/events/:eventId/users/:userName", (req, res) => { 
	const old = db.get("eventUsers", req.params, req.query);
	const ret = db.set("eventUsers", req.body, req.params);
	changes(old, ret);
	res.json(ret);
}).get("/api/events/:eventId/notifications", (req, res) => {
	res.json(db.get("eventNotifications", req.body, req.query, false).reverse());
});
	
if (process.env.NODE_ENV != "production") {
	http.createServer(app).listen(3001, () => {
		console.log("[" + moment().format("YYYY-MM-DD hh:mm:ss A") + "] DEV API 3001");
	});
} else {
	app.use(express.static(__dirname + "/build")).get("*", (req, res) => {
		res.sendFile(__dirname + "/build/index.html");
	});
	https.createServer({
		key: fs.readFileSync("https.key"), 
		cert: fs.readFileSync("https.crt"), 
	}, app).listen(3000, () => {
		console.log("[" + moment().format("YYYY-MM-DD hh:mm:ss A") + "] PROD WEB 3000");
	});
}

function changes(a, b) {
	if (!b.eventId || !b.userName) return;
	const ret = [];
	
	if (!Object.keys(a).length) 
		ret.push("joined");
	else if (a.hasLeft && !b.hasLeft) 
		ret.push("cancelled");
	else if (!a.hasLeft && b.hasLeft && b.lastUpdated && b.duration) 
		ret.push("departed, ETA", moment(b.lastUpdated).add(b.duration,"s").format("hh:mm A"));
	else if (a.hasLeft && b.hasLeft && a.duration && a.lastUpdated && b.duration && b.lastUpdated) {
		x = Math.round(moment(b.lastUpdated).add(b.duration, "s").diff(moment(a.lastUpdated).add(a.duration))/(1000*60));
		if (x > THRESHOLD) 
			ret.push("is delayed by", x, "minutes");
		else if (x < -THRESHOLD) 
			ret.push("is earlier than expected by", -x, "minutes");
		else 
			return;
	} else 
		return;
	
	db.set("eventNotifications", {
		eventId: b.eventId, 
		userName: b.userName, 
		timestamp: moment().format("YYYY-MM-DD hh:mm:ss A"),
		message: ret.join(" ") + "."
	});
}

