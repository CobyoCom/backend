module.exports = dbwrap;

function dbwrap() { this.db = {}; }
function contains(a,b) { return (b != null) && (Object.keys(b).every((prop)=> (a[prop] == b[prop]))); }

dbwrap.prototype.create = function(table, cols) { };
dbwrap.prototype.del = function(table, where) { if (this.db[table]) this.db[table] = this.db[table].filter((row) => contains(row, where)); };
dbwrap.prototype.drop = function(table) { if (this.db[table]) delete this.db[table]; };
dbwrap.prototype.get = function(table, where, query, one=true) {
	var ret;
	if (!this.db[table]) this.db[table] = [];
	const ft = this.db[table].filter((row) => (contains(row, where) && !(query && query.exclude && row[query.sortBy] == query.exclude)));
	if (query && query.sortBy) ft.sort((a,b) => a[query.sortBy].localeCompare(b[query.sortBy], options={sensitivity: "base"}));
	if (ft.length == 0 && one) ret = {};
	else if (one) ret = ft[0];
	else ret = ft;
	console.log(table + " GET: " + JSON.stringify(ret));
	return JSON.parse(JSON.stringify(ret));
}
dbwrap.prototype.set = function(table, map, where=null){
	var ret;
	if (!this.db[table]) this.db[table] = [];
	const ft = this.db[table].filter((row) => contains(row, where));
	if (ft.length == 0) {
		for (prop in where) map[prop] = where[prop];
		map.id = this.db[table].length;
		this.db[table].push(map);
		ret = map;
	} else {
		for (prop in map) ft[0][prop] = map[prop];
		ret = ft[0];
	}
	console.log(table + " SET: " + JSON.stringify(ret));
	return JSON.parse(JSON.stringify(ret));
}
dbwrap.prototype.dump = function() { 
	console.log("DUMP: " + JSON.stringify(this.db));
	return this.db; 
}

