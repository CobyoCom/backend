const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const http = require("http");
const https = require("https");
const dbwrap = require("./dbwrap");

const THRESHOLD = 1;

const db = new dbwrap();
db.set("events", {placeId: "ChIJ7VHBwnZ644kRKRWP5Qe27v4", eventName: "Royale", 
	eventTime: ts(new Date())}, {});

const app = express();
app.use(bodyParser.json()
).use((req, res, next) => {
	console.log(["[" + ts(new Date()) + "]", req.method, req.path, 
			"params:", JSON.stringify(req.params), 
			"query:", JSON.stringify(req.query), 
			"body:", JSON.stringify(req.body)].join(" "));
	next(); 
}).get("/log/dump", (req, res) => {
	res.json(db.dump());
}).get("/log/*", (req, res) => {
	res.sendFile(__dirname + req.path);
}).post("/api/events", (req, res) => {
	const ret = db.set("events", req.body);
	db.set("eventNotifications", {
		eventId: ret.id, timestamp: ts(new Date()), message: "Event created."
	});
	res.json(ret);
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
	res.json(db.get("eventNotifications", req.body, req.query, false));
});
	
if (process.env.NODE_ENV != "production") {
	http.createServer(app).listen(3001, () => {
		console.log("[" + ts(new Date()) + "] DEV API server started at 3001");
	});
} else {
	app.use(express.static(__dirname + "/build")).get("*", (req, res) => {
		res.sendFile(__dirname + "/build/index.html");
	});
	https.createServer({
		key: fs.readFileSync("https.key"), 
		cert: fs.readFileSync("https.crt"), 
	}, app).listen(3000, () => {
		console.log("[" + ts(new Date()) + "] PROD WEB server started at 3000");
	});
}

function ts(t) {return t.toISOString().replace(/T/, ' ').replace(/\..+/, '');}
function etats(lut, dur) {return ts(new Date(new Date(lut).getTime()+dur));}
function durts(dur) {
	if (dur < 60) return dur + " seconds";
	else if (dur < 3600) return Math.round(dur/60) + " minutes";
	else return Math.round(dur/360)/10 + " hours";
}

function changes(a, b) {
	if (!b.eventId || !b.userName) return;
	const ret = [b.userName];
	
	if (!Object.keys(a).length) {
	 	ret.push(" joined");
		if (b.hasLeft == "true" && b.lastUpdated && b.duration)
			ret.push(" with ETA of ", etats(b.lastUpdated, b.duration));
		else if (b.hasLeft != "true" && b.duration) 
			ret.push(" with duration of ", durts(b.duration));
	} else if (a.hasLeft == "true" && b.hasLeft != "true") {
		ret.push(" cancelled leaving");
		if (b.duration) ret.push(", duration", durts(b.duration));
	} else if (a.hasLeft != "true" && b.hasLeft == "true") {
	 	ret.push(" started leaving");
		if (b.lastUpdated && b.duration) 
			ret.push(", ETA", etats(b.lastUpdated, b.duration));
	} else if (a.hasLeft != "true" && b.hasLeft != "true" && 
		b.duration && (!a.duration || Math.abs(a.duration - b.duration) > THRESHOLD)) {
		ret.push(" changed duration to ", durts(b.duration));
	} else if (a.hasLeft == "true" && b.hasLeft == "true" && 
			b.duration && b.lastUpdated && (!a.duration || !a.lastUpdated || 
				Math.abs(new Date(a.lastUpdated).getTime() + a.duration - 
					new Date(b.lastUpdated).getTime() - b.duration) > THRESHOLD)) {
		ret.push(" changed ETA to ", etats(b.lastUpdated, b.duration));
	} else if (b.travelMode && b.travelMode != a.travelMode) {
		ret.push(" changed travel mode to");
	} else 
		return;
	
	if (b.travelMode) ret.push(" by", b.travelMode.lowerCase());
	db.set("eventNotifications", {
		eventId: b.eventId, timestamp: ts(new Date()), message: ret.join("") + "."
	});
}

