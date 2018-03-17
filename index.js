"use strict";
const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient({endpoint: process.env.DYNAMODB_ENDPOINT, region: process.env.AWS_REGION}); 
const headers = {  
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,OPTIONS,POST,PUT",
  "access-control-allow-origin": "https://cobyo.me"
};

exports.handler = function(event, context, callback) {
  const ret = (code, js) => {
    if (code >= 400) console.error((js.message = "ERROR " + event.httpMethod + " " + event.path +  " " + (event.body || "(no body)") + ": " + code + ", " + (js.message || "(no message)")));
    callback(null, {statusCode: code, headers: headers, body: JSON.stringify(js)});
  }
  var body = {}, params, query = event.queryStringParameters;
  if (event.body) try {body = JSON.parse(event.body);} catch (error) {ret(400, {message: "Body cannot be parsed as JSON"}); return;}

  const put = () => {
    body.id = Math.floor(Math.random() * 10000).toString();
    db.put({TableName: process.env.TABLE_EVENT, Item: body, ConditionExpression: "attribute_not_exists(id)"}, (err, data) => (
      err && err.code == "ConditionalCheckFailedException")? put(): (err)? ret(err.statusCode || 500, err): ret(200, body));
  }  
	const exclude = (list) => {
	  if (query && query.exclude) for (var i = 0; i < list.length; i++) if (list[i].userName == query.exclude) {list.splice(i,1); break;}
	  return list;
	}
	const merge = (d) => {
    d = d || {message: "joined"};
    Object.keys(d).forEach((k)=>{if (!(k in body)) body[k]=d[k];});
    
    var ret = "";
	  if (d.hasLeft && !body.hasLeft) ret += "paused";
    else if (!d.hasLeft && body.hasLeft) ret += "departed";
    else if (d.hasLeft && body.hasLeft) {
      const x = Math.round((body.lastUpdated - d.lastUpdated + body.duration - d.duration)/(60*1000))
      if (x >= 5) ret += "is delayed by " + x + " minutes"
      else if (x <= -5) ret += "is earlier than expected by " + (-x) + " minutes"
    } 

    body["id"] = params[1] + "_" + params[2];
    body["eventId"] = params[1];
    body["userName"] = params[2];
    if (ret != "") body["message"] = ret;
    body["timestamp"] = body.lastUpdated;
    return true;
	}

	if ((params = ptr("/api/events", event.path)) && event.httpMethod == "POST")
	  put();
  else if ((params = ptr("/api/events/:id", event.path)) && event.httpMethod == "GET") 
    db.get({TableName: process.env.TABLE_EVENT, Key: {id: params[1]}}, (err, data) => {
      (err)? ret(err.statusCode || 500, err): (!data.Item)? ret(404, {message: "eventId " + params[1] + " doesn't exist on DB"}): ret(200, data.Item);
    });
  else if ((params = ptr("/api/events/:eventId/users", event.path)) && event.httpMethod == "GET")
		db.query({TableName: process.env.TABLE_USER, KeyConditionExpression: "eventId = :1", ExpressionAttributeValues: {":1": params[1]}}, (err, data) => {
		  (err)? ret(err.statusCode || 500, err): ret(200, exclude(data.Items));
		});
	else if ((params = ptr("/api/events/:eventId/users/:userName", event.path)) && event.httpMethod == "PUT")
		db.get({TableName: process.env.TABLE_USER, Key: {eventId: params[1], userName: params[2]}}, (err, data) => {
		  (err)? ret(err.statusCode || 500, err): merge(data.Item) && db.put({TableName: process.env.TABLE_USER, Item: body}, (e,d) => (e)? ret(err.statusCode || 500, e): ret(200, body));
		});
  else if ((params = ptr("/api/events/:eventId/notifications", event.path)) && event.httpMethod == "GET") 
    db.query({TableName: process.env.TABLE_USER, KeyConditionExpression: "eventId = :1", ExpressionAttributeValues: {":1": params[1]}}, (err, data) => {
      (err)? ret(err.statusCode || 500, err): ret(200, data.Items)
    });
  else if ((params = ptr("/api/log", event.path)) && event.httpMethod == "POST") {
    console.error("ERROR Client: " + (event.body || "(no body)"));
    ret(200, {});
  } else ret(400, {message: "URL is not a valid endpoint"});
}

function ptr(str, matchingPath) {
  const escapeString = (str) => str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1');
  var DEFAULT_DELIMITER = '/'
  var DEFAULT_DELIMITERS = './'
  var PATH_REGEXP = new RegExp(['(\\\\.)', '(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?'].join('|'), 'g')
  var tokens = []
  var key = 0
  var index = 0
  var path = ''
  var defaultDelimiter = DEFAULT_DELIMITER
  var delimiters = DEFAULT_DELIMITERS
  var pathEscaped = false
  var res
  while ((res = PATH_REGEXP.exec(str)) !== null) {
    var m = res[0]
    var escaped = res[1]
    var offset = res.index
    path += str.slice(index, offset)
    index = offset + m.length
    if (escaped) {
      path += escaped[1]
      pathEscaped = true
      continue
    }
    var prev = ''
    var next = str[index]
    var name = res[2]
    var capture = res[3]
    var group = res[4]
    var modifier = res[5]
    if (!pathEscaped && path.length) {
      var k = path.length - 1
      if (delimiters.indexOf(path[k]) > -1) {
        prev = path[k]
        path = path.slice(0, k)
      }
    }
    if (path) {
      tokens.push(path)
      path = ''
      pathEscaped = false
    }
    var partial = prev !== '' && next !== undefined && next !== prev
    var repeat = modifier === '+' || modifier === '*'
    var optional = modifier === '?' || modifier === '*'
    var delimiter = prev || defaultDelimiter
    var pattern = capture || group
    tokens.push({
      name: name || key++,
      prefix: prev,
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      partial: partial,
      pattern: pattern ? pattern.replace(/([=!:$/()])/g, '\\$1') : '[^' + escapeString(delimiter) + ']+?'
    })
  }
  if (path || index < str.length) {
    tokens.push(path + str.substr(index))
  }
  var strict = null;
  var end = true;
  var delimiter = escapeString(DEFAULT_DELIMITER)
  var delimiters = DEFAULT_DELIMITERS
  var endsWith = [].map(escapeString).concat('$').join('|')
  var route = ''
  var isEndDelimited = false
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]
    if (typeof token === 'string') {
      route += escapeString(token)
      isEndDelimited = i === tokens.length - 1 && delimiters.indexOf(token[token.length - 1]) > -1
    } else {
      var prefix = escapeString(token.prefix)
      var capture = token.repeat
        ? '(?:' + token.pattern + ')(?:' + prefix + '(?:' + token.pattern + '))*'
        : token.pattern
      if (token.optional) {
        if (token.partial) {
          route += prefix + '(' + capture + ')?'
        } else {
          route += '(?:' + prefix + '(' + capture + '))?'
        }
      } else {
        route += prefix + '(' + capture + ')'
      }
    }
  }
  if (end) {
    if (!strict) route += '(?:' + delimiter + ')?'
    route += endsWith === '$' ? '$' : '(?=' + endsWith + ')'
  } else {
    if (!strict) route += '(?:' + delimiter + '(?=' + endsWith + '))?'
    if (!isEndDelimited) route += '(?=' + delimiter + '|' + endsWith + ')'
  }
  return (new RegExp('^' + route, '')).exec(matchingPath);
}
