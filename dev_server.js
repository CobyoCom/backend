require("express")().use(function(req, res, next) {
  req.body = "";
  req.on("data", function(d) { req.body += d });
  req.on("end", next);
}).post("/graphql", function(req, res, next) {
  console.log("\n--------------------------------------------------------------------");
  console.log("\nREQUEST: " + JSON.stringify({
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  }, null, 2) + "\n");
  require("./index").handler({
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
  }, null, function(err, data) {
    console.log("\nRESPONSE: " + JSON.stringify(data, null, 2));
    if (data.headers["Set-Cookie"]) data.headers["Set-Cookie"] = data.headers["Set-Cookie"].slice(0, -8);
    res.status(data.statusCode).set(data.headers).send(data.body);
  });
}).options("/graphql", function(req, res, next) {
  res.status(200).set({
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Origin": process.env.ALLOW_ORIGIN,
    "Access-Control-Allow-Credentials": true,
  }).send();
}).listen(process.env.BACKEND_PORT, function() {
  console.log("DEV API server started at " + process.env.GRAPHQL_ENDPOINT);
});
