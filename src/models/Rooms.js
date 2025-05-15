const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({

    name: { type: String, required: true },
    description: String,
    location: { type: String, required: true },
    pricePerHour: { type: Number, required: true },
    capacity: { type: Number, required: true },
    currency: {
        code: { type: String, default: 'IND' },
        symbol: { type: String, default: '₹' },
        name: { type: String, default: 'India' },
    },
    imageUrl: String,
    amenities: [
        {
            name: String,
            imageUrl: String,
            price: Number,
            isFree: Boolean
        },
    ],
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);