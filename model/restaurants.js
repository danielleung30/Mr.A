var mongoose = require('mongoose');


var restaurantsSchema = mongoose.Schema({
    restaurant_id: String,
    name: {type:String,required: true},
    brought: String,
    cuisine: String,
    photo : String,
    photoMineType: {type:String, enum:['jpeg','png']},
    address:[{
        street:String,
        building:String,
        address:String,
        coord:[Number,Number]
    }],
    grades:[{user:String,score:Number}],
    owner:{type:String,required: true}
});

module.exports = restaurantsSchema;