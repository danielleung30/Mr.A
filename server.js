var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');

var http = require('http');
var url  = require('url');
var MongoClient = require('mongodb').MongoClient; 
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var mongourl = 'mongodb://hellowah5:hellowah5@ds149682.mlab.com:49682/11664934';
//var mongourl = 'mongodb://test:daniel6a3000@ds151402.mlab.com:51402/daniel6a3000';
var mongoose = require('mongoose');
//mongoose.connect('mongodb://test:daniel6a3000@ds151402.mlab.com:51402/daniel6a3000');

var fs = require('fs');
var formidable = require('formidable');

var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var util = require('util');

var app = express();

app.set('view engine','ejs');

var SECRETKEY1 = 'I want to pass COMPS381F';
var SECRETKEY2 = 'Keep this to yourself';

app.set('view engine','ejs');

app.use(session({
  name: 'session',
  keys: [SECRETKEY1,SECRETKEY2]
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/',function(req,res) {
	console.log(req.session);
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
		res.status(200);
		res.redirect('/read');
		//res.render('secrets',{name:req.session.username});
	}
});

//login
app.get('/login',function(req,res) {
	res.sendFile(__dirname + '/public/login.html');
});

app.post('/login',function(req,res) {
	var userData = { userid: req.body.name, password: req.body.password }
	MongoClient.connect(mongourl, function (err, db) {
		if (err) throw err
		db.collection("users").findOne(userData, function (err, result) {
			if (!err) {
				if (result) {
					console.log('login success')
					req.session.authenticated = true
					req.session.username = result.userid
					res.redirect('/')
				} else {
					console.log('invalid username or password')
					res.redirect('/')
				}
			}
			db.close()
		})
	})
});

//register
app.get('/register', function (req, res) {
	res.sendFile(__dirname + '/public/register.html')
})

app.post('/register', function (req, res) {
	MongoClient.connect(mongourl, function (err, db) {
		if (err) throw err
		var username = req.body.userid
		var pwd = req.body.password
		var userData = { userid: username, password: pwd }
		db.collection("users").findOne({ userid: username }, function (err, result) {
			if (err) throw err
			if (result === null) {
				db.collection("users").insertOne(userData, function (err, res) {
					if (err) throw err
					console.log("Registration completed!")
				})
			} else {
				console.log('Username existed, please use another one')
			}
			db.close()
		})
	})
	res.redirect('/');
})

//create new restaurant
app.get('/create', function (req, res) {
	res.sendFile(__dirname + '/public/create.html')
	//res.render('create');
})

app.post('/create', function (req, res) {

	if (req.url == '/create' && req.method.toLowerCase() == 'post') {
		var form = new formidable.IncomingForm();
		console.log("About to parse...");		
		form.parse(req, function (err, fields, files) {
			if(err){
				console.log(err);
			}
			console.log("Parsing done.");
			// console.log(fields);
			// console.log(files);
			mongoose.connect(mongourl);
			//mongoose.createConnection(mongourl)	
			var restaurantsSchema = require('./model/restaurants');
			var db = mongoose.connection;
			var name = fields.name;
			var borough = fields.borough;
			var cuisine = fields.cuisine;
			var street = fields.street;
			var building = fields.building;
			var zipcode = fields.zipcode;
			var lat = fields.lat;
			var lon = fields.lon;						
			var filename = files.photo.path;
			var photo
			if (files.photo.type) {
				var mimetype = files.photo.type;
			}
			fs.readFile(filename, function(err,data) {
				photo = new Buffer(data).toString('base64');
			})			
			db.on('error', console.error.bind(console, 'connection error:'));
			db.once('open', function (callback) {
				var Restaurants = mongoose.model('Restaurants', restaurantsSchema)
				var newRestaurant = new Restaurants({
					name: name, borough: borough,
					cuisine: cuisine, 
					photoMimetype: mimetype, 
					photo: photo, 
					address: [{
						street: street, building: building,
						zipcode: zipcode, coord: [{ lat: lat, lon: lon }]
					}], 
					owner: req.session.username
				})

				console.log(typeof newRestaurant);

				newRestaurant.validate(function (err) {
					console.log(err);
				})
	
				newRestaurant.save(function (err,documentInserted) {
					if (err) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.write(JSON.stringify({status:'failed'}));
						db.close();
					}else{
					console.log('Restaurants created!')
                    res.writeHead(200, { 'Content-Type': 'application/json' });
					res.write(JSON.stringify({status:'ok',_id:documentInserted._id}));
					db.close();
					}
				});
			});

		})
		return
	}	
});

//Search
app.get('/search',function(req,res){
	res.render('search',{});
});

app.post('/search',function(req,res){
    MongoClient.connect(mongourl, function (err, db) {
        var name = req.body.name;
        var borough = req.body.borough;
        var cuisine = req.body.cuisine;

        var find = {};
        if (name != "") {
            find.name = name;
        }
        if (borough != "") {
            find.borough = borough;
        }
        if (cuisine != "") {
            find.cuisine = cuisine;
        }
        console.log(find);
        db.collection("restaurants").find(find).toArray(function (err, result) {
            if (err) throw err

            if (result.length != 0) {
				console.log(result);
				var lat = result[0].address[0].coord[0].lat
				var lon = result[0].address[0].coord[0].lon;
				var showGmap = ((lat&&lon) != null);
				console.log(showGmap);
				res.render('display.ejs',{restaurants:result, g: showGmap});
                //res.render('landing',{msg:result});
            } else {
                res.render('landing', {msg:[{name:'you found nothing'}]});
            }
            db.close()
        })
    })
})

//restaurants list
app.get('/read', function (req, res) {
	console.log(req.session)
	if (!req.session.authenticated) {
		res.redirect('/login')
	} else {
		MongoClient.connect(mongourl, function(err,db) {
			try {
			  assert.equal(err,null);
			} catch (err) {
			  res.set({"Content-Type":"text/plain"});
			  res.status(500).end("MongoClient connect() failed!");
			}
			console.log('Connected to MongoDB');
			findRestaurants(db,{}, function (restaurants) {
			  db.close();
			  console.log('Disconnected MongoDB');
			  res.render('list.ejs',{name:req.session.username, restaurants:restaurants});
			});			
		});
	}
})

function findRestaurants(db,criteria, callback) {
	var cursor = db.collection('restaurants').find(criteria);
	var restaurants = [];	
	cursor.each(function (err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			restaurants.push(doc);
		} else {
			callback(restaurants);
		}
	});
}

//display restaurant
app.get('/display', function(req,res) {
	MongoClient.connect(mongourl, function(err,db) {
	  try {
		assert.equal(err,null);
	  } catch (err) {
		res.set({"Content-Type":"text/plain"});
		res.status(500).end("MongoClient connect() failed!");
	  }      
	  console.log('Connected to MongoDB');
	  var criteria = {};
	  criteria['_id'] = ObjectID(req.query._id);
	  findRestaurants(db,criteria, function(restaurants) {
		db.close();
		console.log('Disconnected MongoDB');
		var lat = restaurants[0].address[0].coord[0].lat
		var lon = restaurants[0].address[0].coord[0].lon;
		var showGmap = ((lat&&lon) != null);
		console.log(restaurants[0]);
		console.log("show Gmap:"+showGmap);
		res.render('display.ejs',{restaurants:restaurants, g: showGmap});
	  });
	});
});

//Edit
app.get('/change', function(req,res) {
	MongoClient.connect(mongourl, function(err,db) {
	  try {
		assert.equal(err,null);
	  } catch (err) {
		res.set({"Content-Type":"text/plain"});
		res.status(500).end("MongoClient connect() failed!");
	  }      
	  console.log('Connected to MongoDB');
	  var criteria = {};
	  criteria['_id'] = ObjectID(req.query._id);
	  findRestaurants(db,criteria, function(restaurants) {
		db.close();
		console.log('Disconnected MongoDB');		
		res.render('change.ejs',{restaurants:restaurants});
	  });
	});
});

app.post('/change', function (req, res) {
	var _id = req.query._id
	var ObjectID = require('mongodb').ObjectID
	var o_id = new ObjectID(_id)
	console.log(o_id)	
});

//delete
app.get('/delete', function (req, res) {
	MongoClient.connect(mongourl, function(err,db) {
		try {
		  assert.equal(err,null);
		} catch (err) {
		  res.set({"Content-Type":"text/plain"});
		  res.status(500).end("MongoClient connect() failed!");
		}      
		console.log('Connected to MongoDB');
		var criteria = {};
		criteria['_id'] = ObjectID(req.query._id);
		findRestaurants(db,criteria, function(restaurants) {
		  var isOwner = false;
		  if(restaurants[0].owner == req.session.username){
			isOwner = true;
			console.log("User: "+restaurants[0].owner+" Deleted Restaurants:" + restaurants[0].name);
			db.collection("restaurants").remove({ _id: criteria['_id'] });			
		  } else {
			console.log("You are not authorized to delete!!! ")
		  }
		  db.close();
		  console.log('Disconnected MongoDB');
		  res.render('remove.ejs',{g: isOwner});
		});
	});
})

//Gmap
app.get("/gmap", function(req,res) {
	res.render("gmap.ejs", {
		lat:req.query.lat,
		lon:req.query.lon,
		name:req.query.title
	});
	res.end();
});

app.get('/api/restaurant/:by/:value',function(req,res){

    MongoClient.connect(mongourl, function (err, db) {
		var by = req.params.by;
		var value = req.params.value;
    	console.log(by);
    	console.log(value);
		switch (by) {
			case 'name':
                db.collection("restaurants").find({name:value}).toArray(function (err, result) {
                    if (err) throw err
                    if (result != null) {
                        console.log(result);
						res.writeHead(200, { 'Content-Type': 'application/json' });
						result.forEach(function (ele) {
                            res.write(JSON.stringify(ele));
                        })
						res.end();
                    } else {
                        res.render('landing', {msg: 'you found nothing'});
                    }
                    db.close()
                })
				break;
			case 'borough':
                db.collection("restaurants").find({borough:value}).toArray(function (err, result) {
                    if (err) throw err
                    if (result != null) {
                        console.log(result);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        result.forEach(function (ele) {
                            res.write(JSON.stringify(ele));
                        })
                    } else {
                        res.render('landing', {msg: 'you found nothing'});
                    }
                    db.close()
                })
				break;
			case 'cuisine':
                db.collection("restaurants").find({cuisine:value}).toArray(function (err, result) {
                    if (err) throw err
                    if (result != null) {
                        console.log(result);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        result.forEach(function (ele) {
                            res.write(JSON.stringify(ele));
                        })
                    } else {
                        res.render('landing', {msg: 'you found nothing'});
                    }
                    db.close()
                })
        }
	});
})


var test = {daniel:123,ethan:456,Alan:789};






//logout
app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});

app.listen(process.env.PORT || 8099);
