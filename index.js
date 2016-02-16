var express = require("express");
var app = express();
var bodyParser = require("body-parser");
//var beacon = require("eddystone-beacon");
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

var main = handlebars.compile(fs.readFileSync("./html/main.html", "utf8"));
var remain = handlebars.compile(fs.readFileSync("./html/remain.html", "utf8"));
var admin = handlebars.compile(fs.readFileSync("./html/admin.html", "utf8"));

MongoClient.connect("mongodb://" + options.mongodb.username + ":" + options.mongodb.password + "@" + options.mongodb.database, function(err, db) {
    if (err) {
        console.log(err);
    } else {
        console.log("MongoDB connected");
        
        app.get("/", function(req, res) {
            var query = req.query;

            res.end(main({
                error: query.err
            }));
        });
        
        app.get("/admin", function(req, res) {
            var query = req.query;
            
            var cursor = db.collection("meters").find().sort({
                meter: 1
            });

            cursor.toArray(function(err, docs) {
                if (err) {
                    console.log(err);
                } else {
                    var meters = [];
                    
                    docs.forEach(function(doc) {
                        meters.push({
                            meter: doc.meter,
                            color: doc.startTime + doc.totalTime - Math.floor(Date.now() / 1000) > 0 ? "green" : "red",
                            remaining: doc.startTime + doc.totalTime - Math.floor(Date.now() / 1000) > 0 ? (doc.startTime + doc.totalTime - Math.floor(Date.now() / 1000)) / 60 : 0,
                            total: doc.totalTime / 60
                        });
                    });
                    
                    res.end(admin({
                        meters: meters
                    }));
                }
            });
        });

        app.get("/meter/:meter", function(req, res) {
            var cursor = db.collection("meters").find({
                meter: parseInt(req.params.meter)
            });

            cursor.each(function(err, doc) {
                if (doc !== null) {
                    var startTime = parseInt(doc.startTime);
                    var totalTime = parseInt(doc.totalTime);

                    var seconds = startTime - Math.floor(Date.now() / 1000) + totalTime;
                    var minutes = Math.round(seconds / 60);

                    if (minutes > 0) {
                        res.end(remain({
                            startTime: startTime,
                            totalTime: totalTime,
                            load: "loading..."
                        }));
                    } else {
                        res.end(remain({
                            startTime: 0,
                            totalTime: 0,
                            load: "0:00"
                        }));
                    }
                } else {
                    res.end(remain({
                        error: true,
                        startTime: 0,
                        totalTime: 0,
                        load: "0:00"
                    }));
                }
            });
        });

        app.post("/meter/:meter", function(req, res) {
            var query = req.body;

            if (query.minutes && query.card && query.exp_month && query.exp_year && query.cvc) {
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
                        db.collection("meters").find({
                            meter: parseInt(req.params.meter)
                        }).toArray(function(err, docs) {
                            if (err) {
                                console.log(err);
                            } else {
                                if (docs.length > 0) {
                                    docs.forEach(function(doc) {
                                        if (doc.startTime + doc.totalTime <= Math.floor(Date.now() / 1000)) {
                                            db.collection("meters").update({
                                                meter: parseInt(req.params.meter)
                                            }, {
                                                $set: {
                                                    startTime: Math.floor(Date.now() / 1000),
                                                    totalTime: query.minutes * 60
                                                }
                                            }, function(err) {
                                                if (err) {
                                                    console.log(err);
                                                }
                                                
                                                finish();
                                            });
                                            
                                            finish();
                                        } else {
                                            db.collection("meters").update({
                                                meter: parseInt(req.params.meter)
                                            }, {
                                                $set: {
                                                    totalTime: doc.totalTime + query.minutes * 60
                                                }
                                            }, function(err) {
                                                if (err) {
                                                    console.log(err);
                                                }
                                                
                                                finish();
                                            });
                                        }
                                    });
                                } else {
                                    db.collection("meters").insert({
                                        meter: parseInt(req.params.meter),
                                        startTime: Math.floor(Date.now() / 1000),
                                        totalTime: query.minutes * 60
                                    }, function(err) {
                                        console.log(err);
                                        
                                        finish();
                                    });
                                }
                            }
                        });
                    }
                });
            } else {
                finish();
            }

            function finish() {
                var cursor = db.collection("meters").find({
                    meter: parseInt(req.params.meter)
                });
    
                cursor.each(function(err, doc) {
                    if (doc !== null) {
                        var startTime = parseInt(doc.startTime);
                        var totalTime = parseInt(doc.totalTime);
    
                        var seconds = startTime - Math.floor(Date.now() / 1000) + totalTime;
                        var minutes = Math.round(seconds / 60);
    
                        if (minutes > 0) {
                            res.end(remain({
                                startTime: startTime,
                                totalTime: totalTime,
                                load: "loading..."
                            }));
                        } else {
                            res.end(remain({
                                startTime: 0,
                                totalTime: 0,
                                load: "0:00"
                            }));
                        }
                    } else {
                        res.end(remain({
                            error: true,
                            startTime: 0,
                            totalTime: 0,
                            load: "0:00"
                        }));
                    }
                });
            }
        });
    }
});

app.use(express.static(__dirname + "/public"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.listen(port, function() {
    console.log("Listening on port", port);
});

//beacon.advertiseUrl(options.url);
