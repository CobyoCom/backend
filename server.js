const express = require("express");
const bodyParser = require("body-parser");
const sqlite = require("sql.js");

//const fs = require("fs");
//const filebuffer = fs.readFileSync("db.sqlite3");
//const db = new sqlite.Database(filebuffer);
//if (process.env.NODE_ENV === "production") {app.use(express.static("client/build"))}

const db = new sqlite.Database();

function perror(req, res, msg, ecode=500) {
  console.error("%s %s %s", req.method, req.originalUrl, msg);
  res.sendStatus(ecode)
}
function logResult(req, res, resMap) {
  console.log("%s %s -> %s", req.method, req.originalUrl, JSON.stringify(resMap));
  res.json(resMap);
}


db.run(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE Events (
    eventId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    placeId TEXT NOT NULL,
    eventTime TEXT NOT NULL
  );
  CREATE TABLE EventUsers (
    eventId INTEGER NOT NULL,
    userName TEXT NOT NULL,
    estimatedArrivalTime TEXT NOT NULL,
    lastUpdatedTime TEXT NOT NULL,
    PRIMARY KEY (eventId, userName),
    FOREIGN KEY (eventId) REFERENCES Events (eventId) ON DELETE CASCADE
  ) WITHOUT ROWID;
  INSERT INTO Events (placeId, eventTime) VALUES ('ABC', '2018-01-13 18:20');
  INSERT INTO EventUsers (eventId, userName, estimatedArrivalTime, lastUpdatedTime)
    VALUES (1, 'Josh', '2018-01-13 18:25', '2018-01-13 17:30');
`);

const app = express();
app.use(bodyParser.json());
app.set("port", process.env.PORT || 3001);

app.post("/api/events", (req, res) => {
  if (!req.body.placeId || !req.body.eventTime) {
    perror(req, res, "missing placeId or eventTime in body");
    return;
  }
  const r = db.exec(`
    INSERT INTO Events (placeId, eventTime) 
      VALUES ("${req.body.placeId}", "${req.body.eventTime}");
    SELECT last_insert_rowid();
  `);
  
  if (!r || !r[0] || !r[0].values || r[0].values[0].length != 1) {
    perror(req, res, "last_insert_rowid() failed");
    return;
  }
  logResult(req, res, {eventId: r[0].values[0][0]});
});

app.get("/api/events/:eventId", (req, res) => { 
  if (!req.params.eventId) {
    perror(req, res, "eventId missing");
    return;
  }
  if (!req.params.eventId.match(/^[0-9]+$/)) {
    perror(req, res, "eventId not positive integer", 404);
    return;
  }
  const eventId = Number(req.params.eventId);
  const r = db.exec(`
    SELECT placeId, eventTime from Events where eventId=${eventId} limit 1
  `);
  if (r && !r[0]) {
    perror(req, res, "eventId doesn't exist", 404);
    return;
  }
  if (!r || !r[0].values || !r[0].values[0] || r[0].values[0].length != 2) {
    perror(req, res, "select eventId from Events table failed");
    return;
  }
  logResult(req, res, {placeId: r[0].values[0][0], eventTime: r[0].values[0][1]});
});

app.post("/api/events/:eventId", (req, res) => { 
  if (!req.params.eventId || !req.body.userName || 
      !req.body.estimatedArrivalTime || !req.body.lastUpdatedTime) {
    perror(req, res, "eventId or userName or estimatedArrivalTime or lastUpdatedTime missing");
    return;
  }
  if (!req.params.eventId.match(/^[0-9]+$/)) {
    perror(req, res, "eventId not positive integer", 404);
    return;
  }
  const eventId = Number(req.params.eventId);
  var r = db.exec(`
    SELECT placeId, eventTime FROM Events WHERE eventId=${eventId} LIMIT 1
  `);
  if (r && !r[0]) {
    perror(req, res, "eventId doesn't exist", 404);
    return;
  }
  if (!r || !r[0].values || !r[0].values[0] || r[0].values[0].length != 2) {
    perror(req, res, "select eventId from Events table failed");
    return;
  }
  const resMap = {placeId: r[0].values[0][0], eventTime: r[0].values[0][1], 
    users: {}};
  
  r = db.exec(`
    REPLACE INTO EventUsers (eventId, userName, estimatedArrivalTime, 
      lastUpdatedTime) VALUES (${eventId}, "${req.body.userName}", 
      "${req.body.estimatedArrivalTime}", "${req.body.lastUpdatedTime}");
    SELECT userName, estimatedArrivalTime, lastUpdatedTime FROM EventUsers
      WHERE eventId=${eventId};
  `);
  if (!r || !r[0] || !r[0].values || r[0].values.length == 0 || 
      !r[0].values.every((user) => user.length == 3)) {
    perror(req, res, "select eventId from EventUsers table failed");
    return;
  }
  console.log(resMap);
  r[0].values.forEach((user) => resMap.users[user[0]] = 
    {estimatedArrivalTime: user[1], lastUpdatedTime: user[2]});
  logResult(req, res, resMap);
});

app.listen(app.get("port"));
console.log("Running localhost:%s/api", app.get("port"))

