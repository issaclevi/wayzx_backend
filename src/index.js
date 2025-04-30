require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');
const router = require('./routes');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// Connect to MongoDB
connectDB();

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/api', router)

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
