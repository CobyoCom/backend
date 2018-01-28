const express = require("express");
const bodyParser = require("body-parser");
const sqlite = require("sql.js");
const fs = require("fs");
const selfSignedHttps = require("self-signed-https");

const db = new sqlite.Database();
const app = express();

dbSeed();

app.use(bodyParser.json());
app.post("/api/events", createEvent);
app.get("/api/events/:eventId", getEvent);
app.post("/api/events/:eventId", updateEvent) 

fs.stat("./build/", (err, stats) => {
  if (err) { app.listen(3001); } 
  else {
    app.use(express.static(__dirname + "/build"));
    selfSignedHttps(app).listen(3000, '0.0.0.0');
  }
});

function dbSeed() {
  db.run(`
    PRAGMA FOREIGN_KEYS = ON;
    CREATE TABLE Events ( eventId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, placeId TEXT NOT NULL, eventTime TEXT NOT NULL );
    CREATE TABLE EventUsers ( eventId INTEGER NOT NULL, userName TEXT NOT NULL, estimatedArrivalTime TEXT NOT NULL, lastUpdatedTime TEXT NOT NULL, PRIMARY KEY (eventId, userName), FOREIGN KEY (eventId) REFERENCES Events (eventId) ON DELETE CASCADE ) WITHOUT ROWID;
    INSERT INTO Events (placeId, eventTime) VALUES ('ChIJ_TSYQfV544kRLjVKmCw9xD0', '2018-01-13 18:20');
    INSERT INTO EventUsers (eventId, userName, estimatedArrivalTime, lastUpdatedTime) VALUES (1, 'Josh', '2018-01-13 18:25', '2018-01-13 17:30');
  `);
}

function createEvent(req, res) {
  if (!req.body.placeId || !req.body.eventTime) { perror(req, res, "missing placeId or eventTime in body"); return; }
  const r = db.exec(`INSERT INTO Events (placeId, eventTime) VALUES ("${req.body.placeId}", "${req.body.eventTime}"); SELECT last_insert_rowid();`);
  if (!r || !r[0] || !r[0].values || r[0].values[0].length != 1) { perror(req, res, "last_insert_rowid() failed"); return; }
  logResult(req, res, {eventId: r[0].values[0][0]});
}

function getEvent(req, res) { 
  if (!req.params.eventId) { perror(req, res, "eventId missing"); return; }
  if (!req.params.eventId.match(/^[0-9]+$/)) { perror(req, res, "eventId not positive integer", 404); return; }
  const eventId = Number(req.params.eventId);
  const r = db.exec(`SELECT placeId, eventTime FROM Events WHERE eventId = ${eventId} LIMIT 1`);
  if (r && !r[0]) { perror(req, res, "eventId doesn't exist", 404); return; }
  if (!r || !r[0].values || !r[0].values[0] || r[0].values[0].length != 2) { perror(req, res, "select eventId from Events table failed"); return; }
  logResult(req, res, {placeId: r[0].values[0][0], eventTime: r[0].values[0][1]});
}

function updateEvent(req, res) {
  if (!req.params.eventId || !req.body.userName || !req.body.estimatedArrivalTime || !req.body.lastUpdatedTime) { perror(req, res, "eventId or userName or estimatedArrivalTime or lastUpdatedTime missing"); return; }
  if (!req.params.eventId.match(/^[0-9]+$/)) { perror(req, res, "eventId not positive integer", 404); return; }
  const eventId = Number(req.params.eventId);
  db.run(`REPLACE INTO EventUsers (eventId, userName, estimatedArrivalTime, lastUpdatedTime) VALUES (${eventId}, "${req.body.userName}", "${req.body.estimatedArrivalTime}", "${req.body.lastUpdatedTime}");`);
  const r = db.exec(`SELECT userName, estimatedArrivalTime, lastUpdatedTime FROM EventUsers WHERE eventId = ${eventId} AND userName != "${req.body.userName}" ORDER BY userName COLLATE NOCASE ASC;`);
  const users = []; 
  if (r && r[0] && r[0].values && r[0].values[0] && r[0].values.every((user) => user.length == 3)) { r[0].values.forEach((user) => users.push({userName: user[0], estimatedArrivalTime: user[1], lastUpdatedTime: user[2]})); }
  logResult(req, res, users);
}

function perror(req, res, msg, ecode=500) { console.error("%s %s %s", req.method, req.originalUrl, msg); res.sendStatus(ecode) }
function logResult(req, res, resMap) { console.log("%s %s -> %s", req.method, req.originalUrl, JSON.stringify(resMap)); res.json(resMap); }

