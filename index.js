var http = require("http");
var url = require("url");
var beacon = require("eddystone-beacon");
var handlebars = require("handlebars");
var fs = require("fs");

var options = {};

try {
	options = JSON.parse(fs.readFileSync('options.json', 'utf8'));
} catch (err) {
	throw err;
}

var layout = handlebars.compile(fs.readFileSync("./layout.html", "utf8"));

http.createServer(function (req, res) {
	var command = url.parse(req.url).pathname.slice(1);
	var query = url.parse(req.url,true).query;

	res.writeHead(200, { "Content-Type": "text/html" });

	if (query.m) {
		if (command === "pay") {
			//do pay stuff
		}
	}

	res.end(layout(data));

}).listen(options.port);

beacon.advertiseUrl(options.url);
