var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
mongoose.connect('mongodb://test:daniel6a3000@ds151402.mlab.com:51402/daniel6a3000');
var app = express();



app.set('view engine','ejs');

var SECRETKEY1 = 'I want to pass COMPS381F';
var SECRETKEY2 = 'Keep this to yourself';

var users = new Array(
	{name: 'developer', password: 'developer'},
	{name: 'guest', password: 'guest'}
);

app.set('view engine','ejs');


var restaurantsSchema = require('./model/restaurants');
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
    var Restaurants = mongoose.model('Restaurants', restaurantsSchema);
    var raman = new Restaurants({name: 'MkeRaman', owner: 'unknown'});

    raman.save(function(err) {
        if (err) throw err
        console.log('Restaurants created!')
        db.close();
    });
});


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

app.get('/login',function(req,res) {
	res.sendFile(__dirname + '/public/login.html');
});

app.post('/login',function(req,res) {
	for (var i=0; i<users.length; i++) {
		if (users[i].name == req.body.name &&
		    users[i].password == req.body.password) {
			req.session.authenticated = true;
			req.session.username = users[i].name;
		}
	}
	res.redirect('/');
});

app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});

app.listen(process.env.PORT || 8099);
