"use strict";
const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient(); 
const headers = {
  "Access-Control-Allow-Origin": "https://cobyo.me",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "*"
};

exports.handler = function(event, context, callback) {
  const ok = (js) => callback(null, {
    statusCode: 200,
    headers: headers, 
    body: JSON.stringify(js)
  });
  const no = () => callback(null, {
    statusCode: 404,
    headers: headers,
    body: JSON.stringify({errorMessage: "Not Found"})
  });
  const er = (err) => callback(null, {
    statusCode: 500,
    headers: headers,
    body: JSON.stringify(err)    
  });
  
  const body = (event.body)? JSON.parse(event.body) : {};
  const query = event.queryStringParameters;
  var params;
  
  const put = () => {
    body.id = Math.floor(Math.random() * 10000).toString();
    db.put({TableName: "Events", Item: body, ConditionExpression: "attribute_not_exists(id)"}, (err, data) => (err && err.code == "ConditionalCheckFailedException")? put(): (err)? er(err) : ok(body));
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
      const x = Math.round(((Date.parse(body.lastUpdated) - Date.parse(d.lastUpdated))/1000 + Number(body.duration) - Number(d.duration))/60)
      if (x > 5) ret += "is delayed by " + x + " minutes"
      else if (x < -5) ret += "is earlier than expected by " + (-x) + " minutes"
    } 

    body["id"] = params[1] + "_" + params[2];
    body["eventId"] = params[1];
    body["userName"] = params[2];
    if (ret != "") body["message"] = ret;
    body["timestamp"] = body.lastUpdated;
    return body;
	}

	if ((params = ptr("/api/events", event.path)) && event.httpMethod == "POST")
	  put();
  else if ((params = ptr("/api/events/:id", event.path)) && event.httpMethod == "GET") 
    db.get({TableName: "Events", Key: {id: params[1]}}, (err, data) => (err)? er(err): (!data.Item)? no(): ok(data.Item));
  else if ((params = ptr("/api/events/:eventId/users", event.path)) && event.httpMethod == "GET")
		db.query({TableName: "EventUsers", KeyConditionExpression: "eventId = :1", ExpressionAttributeValues: {":1": params[1]}}, (err, data) => (err)? er(err): ok(exclude(data.Items)));
	else if ((params = ptr("/api/events/:eventId/users/:userName", event.path)) && event.httpMethod == "PUT")
		db.get({TableName: "EventUsers", Key: {eventId: params[1], userName: params[2]}}, (err, data) => (err)? er(err): merge(data.Item) && db.put({TableName: "EventUsers", Item: body}, (e,d) => (e)? er(e): ok(body)));
  else if ((params = ptr("/api/events/:eventId/notifications", event.path)) && event.httpMethod == "GET") 
    db.query({TableName: "EventUsers", KeyConditionExpression: "eventId = :1", ExpressionAttributeValues: {":1": params[1]}}, (err, data) => (err)? er(err): ok(data.Items));
  else 
    no();
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
