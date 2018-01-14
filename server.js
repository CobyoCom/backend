const express = require("express");
const fs = require("fs");
const sqlite = require("sql.js");
const filebuffer = fs.readFileSync("db.sqlite3");
const db = new sqlite.Database(filebuffer);
const app = express();
const COLUMNS = ["id","name","time"];

app.set("port", process.env.PORT || 3001);
//if (process.env.NODE_ENV === "production") {app.use(express.static("client/build"))}

app.get("/api", (req, res) => {
  const param = req.query.id;
  if (!param) {res.json({error: "Missing required parameter `q`"}); return;}
	const r = db.exec(`select ${COLUMNS.join(", ")} from entries where id=${param} limit 1`);
  if (r[0]) {res.json(r[0].values.map(entry => {const e = {}; COLUMNS.forEach((c, idx) => {e[c] = entry[idx];}); return e;}));} else {res.json([]);}
});

app.listen(app.get("port"));
