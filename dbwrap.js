module.exports = dbwrap;

function dbwrap() { this.db = {}; }

function contains(a,b) { return (b != null) && (Object.keys(b).every((prop)=> (a[prop] == b[prop]))); }

dbwrap.prototype.create = function(table, cols) { };
dbwrap.prototype.del = function(table, where) { if (this.db[table]) this.db[table] = this.db[table].filter((row) => contains(row, where)); };
dbwrap.prototype.drop = function(table) { if (this.db[table]) delete this.db[table]; };

dbwrap.prototype.get = function(table, where, query, one=true) {
	if (!this.db[table]) return (one? {} : []);
	const ft = this.db[table].filter((row) => (contains(row, where) && !(query && query.exclude && row[query.sortBy] == query.exclude)));
	if (query && query.sortBy) ft.sort((a,b) => a[query.sortBy].localeCompare(b[query.sortBy], options={sensitivity: "base"}));
	if (ft.length == 0 && one) return {};
	else if (one) return ft[0];
	else return ft;
}

dbwrap.prototype.set = function(table, map, where=null) {
	if (!this.db[table]) this.db[table] = [];
	if (!map) map = {};
	const ft = this.db[table].filter((row) => contains(row, where));
	if (ft.length == 0) {
		for (prop in where) map[prop] = where[prop];
		map.id = this.db[table].length;
		this.db[table].push(map);
		return map;
	} else {
		for (prop in map) ft[0][prop] = map[prop];
		return ft[0];
	}
}

