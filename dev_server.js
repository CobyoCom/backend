require("express")().use(function(req, res, next) {
  req.body = "";
  req.on("data", function(d) { req.body += d });
  req.on("end", next);
}).post(process.env.API_PATH, function(req, res, next) {
  console.log("\n--------------------------------------------------------------------");
  console.log("\nREQUEST: ");
  console.log(req.headers["cookie"] || req.headers["Cookie"]);
  console.log(req.body);
  require("./index").handler({
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
  }, null, function(err, data) {
    console.log("\nRESPONSE: ");
    console.log(data.headers["Set-Cookie"]);
    console.log(data.body);
    if (data.headers["Set-Cookie"]) data.headers["Set-Cookie"] = data.headers["Set-Cookie"].slice(0, -8);
    res.status(data.statusCode).set(data.headers).send(data.body);
  });
}).options(process.env.API_PATH, function(req, res, next) {
  res.status(200).set({
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Origin": process.env.ALLOW_ORIGIN,
    "Access-Control-Allow-Credentials": true,
  }).send();
}).listen(process.env.DEV_API_PORT, function() {
  console.log("DEV API server started at http://localhost:" + process.env.DEV_API_PORT + process.env.API_PATH);
});
