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
const axios = require('axios');
const cheerio = require('cheerio');

// Endpoint për të nxjerrë fotot nga një URL e jashtme
app.post('/api/extract-images', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL është e detyrueshme' });
  }
  
  try {
    // Shkarko faqen
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    // Ngarko HTML në cheerio
    const $ = cheerio.load(data);
    const images = new Set(); // Përdor Set për të shmangur dyfishimet
    
    // 1. Kërko për Open Graph image (metoda më e besueshme)
    $('meta[property="og:image"]').each((i, el) => {
      const img = $(el).attr('content');
      if (img && img.startsWith('http')) images.add(img);
    });
    
    // 2. Kërko për të gjitha imazhet në galeri
    $('img').each((i, el) => {
      let img = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
      if (img) {
        // Konverto URL relative në absolute
        if (img.startsWith('//')) img = 'https:' + img;
        else if (img.startsWith('/')) img = new URL(img, url).href;
        
        if (img && img.match(/\.(jpg|jpeg|png|webp|gif)/i) && img.startsWith('http')) {
          images.add(img);
        }
      }
    });
    
    // 3. Kërko për background images në style
    $('[style*="background-image"]').each((i, el) => {
      const style = $(el).attr('style');
      const match = style.match(/url\(["']?([^"')]+)["']?\)/);
      if (match && match[1]) {
        let img = match[1];
        if (img.startsWith('//')) img = 'https:' + img;
        else if (img.startsWith('/')) img = new URL(img, url).href;
        if (img.startsWith('http')) images.add(img);
      }
    });
    
    // 4. Kërko për linke direkte të imazheve në tekst
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
        let img = href;
        if (img.startsWith('//')) img = 'https:' + img;
        else if (img.startsWith('/')) img = new URL(img, url).href;
        if (img.startsWith('http')) images.add(img);
      }
    });
    
    // Kthe array-in e unikëve
    const imageList = Array.from(images);
    
    res.json({
      success: true,
      count: imageList.length,
      images: imageList
    });
    
  } catch (error) {
    console.error('Gabim në nxjerrjen e fotove:', error.message);
    res.status(500).json({ 
      error: 'Nuk mund të nxirren fotot nga kjo URL',
      details: error.message 
    });
  }
});

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