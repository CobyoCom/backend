const express = require("express");
const sqlite = require("sql.js");

//const fs = require("fs");
//const filebuffer = fs.readFileSync("db.sqlite3");
//const db = new sqlite.Database(filebuffer);
//if (process.env.NODE_ENV === "production") {app.use(express.static("client/build"))}

const db = new sqlite.Database();
db.run(
  `CREATE TABLE Events (
    eventId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    placeId TEXT NOT NULL,
    time TEXT NOT NULL
  );
  CREATE TABLE EventUsers (
    eventId INTEGER NOT NULL,
    userName TEXT NOT NULL,
    estimatedArrivalTime TEXT NOT NULL,
    lastUpdatedTime TEXT NOT NULL,
    PRIMARY KEY (eventId, userName)
  );
  INSERT INTO Events (placeId, time)
    VALUES ('ABC', '2018-01-13 18:20');
  INSERT INTO EventUsers (eventId, userName, estimatedArrivalTime, lastUpdatedTime)
    VALUES (1, 'Josh', '2018-01-13 18:25', '2018-01-13 17:30');`
);

const app = express();
app.set("port", process.env.PORT || 3001);


app.get("/api/events/:eventId", (req, res) => {  
  const eventId = req.params.eventId;
  
  if (!eventId) {
    console.log("URL eventID missing"); 
    res.json([]); 
    return;
  }

  const r = db.exec(`SELECT placeId, time from Events where eventId=${eventId} limit 1`);
  
  if (!r || !r[0] || !r[0].values) {
    console.log("Events table eventID=%d missing", eventId); 
    res.json([]); 
    return;
  }
  
  const eventInfo = r[0].values[0];

  const resMap = {};
  resMap["placeId"] = eventInfo[0];
  resMap["time"] = eventInfo[1];
  console.log(resMap);
  res.json(resMap);
});

app.listen(app.get("port"));
