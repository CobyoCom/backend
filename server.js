const express = require("express");
const bodyParser = require("body-parser");
const sqlite = require("sql.js");

//const fs = require("fs");
//const filebuffer = fs.readFileSync("db.sqlite3");
//const db = new sqlite.Database(filebuffer);
//if (process.env.NODE_ENV === "production") {app.use(express.static("client/build"))}

const db = new sqlite.Database();

db.run(`
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
    PRIMARY KEY (eventId, userName)
  );
  INSERT INTO Events (placeId, eventTime)
    VALUES ('ABC', '2018-01-13 18:20');
  INSERT INTO EventUsers (eventId, userName, estimatedArrivalTime, lastUpdatedTime)
    VALUES (1, 'Josh', '2018-01-13 18:25', '2018-01-13 17:30');
`);

const app = express();
app.use(bodyParser.json());

app.set("port", process.env.PORT || 3001);

app.post("/api/events", (req, res) => {
  const placeId = req.body.placeId;
  const eventTime = req.body.eventTime;
  if (!placeId || !eventTime) {
    console.log("POST /api/events missing placeId or eventTime in body");
    res.json([]);
    return;
  }
  const r = db.exec(`
    INSERT INTO Events (placeId, eventTime) VALUES ('${placeId}', '${eventTime}');
    SELECT last_insert_rowid();
  `);
  
  if (!r || !r[0] || !r[0].values || r[0].values[0].length != 1) {
    console.log("%s %s select last_insert_rowid() failed", req.method, req.originalUrl);
    res.json([]);
    return;
  }
  const resMap = {eventId: r[0].values[0][0]};
  console.log("%s %s response %s", req.method, req.originalUrl, JSON.stringify(resMap));
  res.json(resMap);
});

app.get("/api/events/:eventId", (req, res) => { 
  const eventIdString = req.params.eventId;
  if (!eventIdString || !eventIdString.match(/^[0-9]+$/)) {
    console.log("%s %s eventId missing or not positive integer", req.method, req.originalUrl);
    res.json([]); 
    return;
  }
  const eventId = Number(eventIdString);
  const r = db.exec(`
      SELECT placeId, eventTime from Events where eventId=${eventId} limit 1
  `);
  if (!r || !r[0] || !r[0].values || r[0].values[0].length != 2) {
    console.log("%s %s select eventId=%d from Events failed", req.method, req.originalUrl, eventId); 
    res.json([]); 
    return;
  }
  const resMap = {placeId: r[0].values[0][0], eventTime: r[0].values[0][1]};
  console.log("%s %s response %s", req.method, req.originalUrl, JSON.stringify(resMap));
  res.json(resMap);
});

app.listen(app.get("port"));
