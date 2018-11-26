var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');

var http = require('http');
var url  = require('url');
var MongoClient = require('mongodb').MongoClient; 
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://hellowah5:hellowah5@ds149682.mlab.com:49682/11664934';
//var mongourl = 'mongodb://test:daniel6a3000@ds151402.mlab.com:51402/daniel6a3000';
var mongoose = require('mongoose');
//mongoose.connect('mongodb://test:daniel6a3000@ds151402.mlab.com:51402/daniel6a3000');

var fs = require('fs');
var formidable = require('formidable');


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
		res.render('secrets',{name:req.session.username});
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
			var photoMimetype
			if (files.photo.type) {
				photoMimetype = files.photo.type;
			}
			fs.readFile(filename, function(err,data) {
				photo = new Buffer(data).toString('base64');
			})			
			db.on('error', console.error.bind(console, 'connection error:'));
			db.once('open', function (callback) {
				var Restaurants = mongoose.model('Restaurants', restaurantsSchema)
				var newRestaurant = new Restaurants({
					name: name, borough: borough,
					cuisine: cuisine, photo: photo, 
					photoMimetype: photoMimetype, 
					address: [{
						street: street, building: building,
						zipcode: zipcode, coord: [{ lat: lat, lon: lon }]
					}], 
					owner: req.session.username
				})
	
				newRestaurant.validate(function (err) {
					console.log(err);
				})
	
				newRestaurant.save(function (err) {
					if (err) throw err
					console.log('Restaurants created!')
					db.close();
				});
			});

		})
		return
	}	
});

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
            if (result != null) {
                console.log(result);
                res.render('landing',{msg:result});
            } else {
                res.render('landing', {msg: 'you found nothing'});
            }
            db.close()
        })
    })
})


//logout
app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});

app.listen(process.env.PORT || 8099);
