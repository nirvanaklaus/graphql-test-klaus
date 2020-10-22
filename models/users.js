const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    notes: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Note'
        }
    ]
},{
    timestamps: true
})

module.exports = mongoose.model('User', UserSchema);