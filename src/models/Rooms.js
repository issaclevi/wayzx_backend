const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({

    name: { type: String, required: true },
    description: String,
    location: { type: String, required: true },
    pricePerHour: { type: Number, required: true },
    capacity: { type: Number, required: true },
    roomSize: { type: Number, required: true },
    spaceTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SpaceType',
        required: true,
    },
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
    openingHours: {
        monday: {
            open: String,
            close: String
        },
        tuesday: {
            open: String,
            close: String
        },
        wednesday: {
            open: String,
            close: String
        },
        thursday: {
            open: String,
            close: String
        },
        friday: {
            open: String,
            close: String
        },
        saturday: {
            open: String,
            close: String
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);