const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const carRoutes = require('./routes/cars');

const app = express();

// CORS konfigurimi - lejo frontend-in në Vercel
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5001',
  'https://car-dealership-frontend-8fjx.vercel.app',
  'https://car-dealership-frontend-git-main-lulilulix1.vercel.app',
  /\.vercel\.app$/  // lejo të gjitha subdomain-et e Vercel
];

app.use(cors({
  origin: function(origin, callback) {
    // Lejo kërkesat pa origin (si Postman, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => 
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    )) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Për zhvillim, lejoji të gjitha
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rrugët
app.use('/api/cars', carRoutes);

// Rrugë testuese për të parë nëse backend-i punon
app.get('/', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// MongoDB lidhja
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB u lidh me sukses!'))
  .catch(err => console.log('❌ Gabim në lidhjen me MongoDB:', err));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Serveri po punon në portën ${PORT}`));