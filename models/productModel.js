const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

const ProductSchema = new Schema({
    Idproduct:String,
    Name:String,
    Price:Number,
    Cat_id:String,
    Title:String,
    Des:String,
    Img:Array,
    Creat_at: {
        type: Date,
        default: Date.now
    },
    Slide:{
        type:Number,
        default:0
    },
    Status:String,
    Color:String,
    Size:Number,
    KeyWork:Array,
    SuggestList: {
        type: Array,
        default: [],
    }
});

module.exports =mongoose.model('HHProduct', ProductSchema);