const mongoose = require('mongoose');

async function connectDatabase() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/CargoLink');
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection failed:', err);
    }
}

module.exports = connectDatabase;
