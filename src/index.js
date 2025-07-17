require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');
const router = require('./routes');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// Connect to MongoDB
connectDB();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://wayzx-admin-panel.onrender.com',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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