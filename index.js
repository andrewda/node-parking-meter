var http = require("http");
var url = require("url");
var beacon = require("eddystone-beacon");
var handlebars = require("handlebars");
var fs = require("fs");
var stripe = require("stripe")(
    "sk_test_key"
);

var options = {};

try {
    options = JSON.parse(fs.readFileSync("options.json", "utf8"));
} catch (err) {
    throw err;
}

var layout = handlebars.compile(fs.readFileSync("./layout.html", "utf8"));
var remain = handlebars.compile(fs.readFileSync("./remain.html", "utf8"));

http.createServer(function(req, res) {
    var command = url.parse(req.url).pathname.slice(1);
    var query = url.parse(req.url, true).query;

    res.writeHead(200, {
        "Content-Type": "text/html"
    });

    console.log(command);
    console.log(query);
    if (command === "pay" && (query.minutes && query.card && query.exp_month && query.exp_year && query.cvc)) {
        console.log("user is paying with card number:", query.card)

        stripe.charges.create({
            amount: parseInt((query.minutes * 1 / 15) * 100),
            currency: "usd",
            source: {
                exp_month: query.exp_month,
                exp_year: query.exp_year,
                number: query.card,
                //number: "4242424242424242",
                object: "card",
                cvc: query.cvc
            },
            description: "Parking meter charge"
        }, function(err, charge) {
            if (err) {
                console.log(err.message);
                res.end(layout({
                    "error": err.message,
                    "pay_success": false
                }));
            } else {
                console.log(charge);
                res.end(remain({
                    "minutes": query.minutes,
                    "time": hour(query.minutes) + ":" + minute(query.minutes)
                }));
            }
        });
    } else {
        res.end(layout({
            "error": "",
            "pay_success": false
        }));
    }
}).listen(options.port);

function hour(minutes) {
    return Math.floor(minutes / 60)
}

function minute(minutes) {
    var minutes = Math.floor(minutes % 60);

    if (minutes < 10) {
        return "0" + Math.floor(minutes % 60);
    } else {
        return Math.floor(minutes % 60);
    }
}

beacon.advertiseUrl(options.url);
