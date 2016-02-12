var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var beacon = require("eddystone-beacon");
var handlebars = require("handlebars");
var MongoClient = require("mongodb").MongoClient;
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

var port = process.env.PORT || options.port;

var layout = handlebars.compile(fs.readFileSync("./layout.html", "utf8"));
var remain = handlebars.compile(fs.readFileSync("./remain.html", "utf8"));

MongoClient.connect("mongodb://" + options.mongodb.username + ":" + options.mongodb.password + "@" + options.mongodb.database, function(err, db) {
    if (err) {
        console.log(err);
    } else {
        console.log("MongoDB connected");

        app.get("/meter/:meter", function(req, res) {
            var cursor = db.collection("meters").find({
                "meter": req.params.meter
            });

            cursor.each(function(err, doc) {
                if (doc !== null) {
                    console.log(doc);

                    var startTime = parseInt(doc.startTime);
                    var totalTime = parseInt(doc.totalTime);

                    var seconds = startTime - Math.floor(Date.now() / 1000) + totalTime;
                    var minutes = Math.round(seconds / 60);

                    console.log(minutes);

                    if (minutes > 0) {
                        res.end(remain({
                            "error": false,
                            "startTime": startTime,
                            "totalTime": totalTime,
                            "time": hour(minutes) + ":" + minute(minutes)
                        }));
                    } else {
                        res.end(remain({
                            "error": false,
                            "startTime": 0,
                            "totalTime": 0,
                            "time": hour(0) + ":" + minute(0)
                        }));
                    }
                } else {
                    res.end(remain({
                        "error": true,
                        "startTime": 0,
                        "totalTime": 0,
                        "time": "0:00"
                    }));
                }
            });
        });

        app.post("/meter/:meter", function(req, res) {
            var query = req.body;

            if (query.minutes && query.card && query.exp_month && query.exp_year && query.cvc) {
                console.log("user is paying with card number:", query.card);

                stripe.charges.create({
                    amount: parseInt((query.minutes * 1 / 15) * 100),
                    currency: "usd",
                    source: {
                        exp_month: query.exp_month,
                        exp_year: query.exp_year,
                        number: query.card,
                        object: "card",
                        cvc: query.cvc
                    },
                    description: "Parking meter charge"
                }, function(err, charge) {
                    if (err) {
                        console.log(err.message);
                        res.redirect("/?err=" + encodeURI(err.message));
                    } else {
                        console.log(charge);

                        db.collection("meters").find({
                            "meter": req.params.meter
                        }).toArray(function(err, docs) {
                            if (err) {
                                console.log(err);
                            } else {
                                if (docs.length > 0) {
                                    db.collection("meters").update({
                                        "meter": req.params.meter
                                    }, {
                                        "meter": req.params.meter,
                                        "startTime": Math.floor(Date.now() / 1000),
                                        "totalTime": query.minutes * 60
                                    });
                                } else {
                                    db.collection("meters").insert({
                                        "meter": req.params.meter,
                                        "startTime": Math.floor(Date.now() / 1000),
                                        "totalTime": query.minutes * 60
                                    });
                                }

                                finish();
                            }
                        });
                    }
                });
            } else {
                finish();
            }

            function finish() {
                var cursor = db.collection("meters").find({
                    "meter": req.params.meter
                });

                cursor.each(function(err, doc) {
                    if (doc !== null) {
                        console.log(doc);

                        var startTime = parseInt(doc.startTime);
                        var totalTime = parseInt(doc.totalTime);

                        var seconds = startTime - Math.floor(Date.now() / 1000) + totalTime;
                        var minutes = Math.round(seconds / 60);

                        if (minutes > 0) {
                            res.end(remain({
                                "error": false,
                                "startTime": startTime,
                                "totalTime": totalTime,
                                "time": hour(minutes) + ":" + minute(minutes)
                            }));
                        } else {
                            res.end(remain({
                                "error": false,
                                "startTime": 0,
                                "totalTime": 0,
                                "time": hour(0) + ":" + minute(0)
                            }));
                        }
                    } else {
                        res.end(remain({
                            "error": true,
                            "startTime": 0,
                            "totalTime": 0,
                            "time": "0:00"
                        }));
                    }
                });
            }
        });

        app.get("/", function(req, res) {
            var query = req.query;

            res.end(layout({
                "error": query.err ? query.err : "undefined"
            }));
        });
    }
});

app.use(express.static(__dirname + "/public"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

function hour(t) {
    return Math.floor(t / 60);
}

function minute(t) {
    if (t < 10) {
        return "0" + Math.floor(t % 60);
    } else {
        return Math.floor(t % 60);
    }
}

app.listen(port, function() {
    console.log("Listening on port", port);
});

beacon.advertiseUrl(options.url);
