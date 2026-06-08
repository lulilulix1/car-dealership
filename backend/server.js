const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const carRoutes = require('./routes/cars');

const app = express();

// CORS konfigurimi
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5001',
  'https://car-dealership-frontend-8fjx.vercel.app',
  'https://car-dealership-frontend-git-main-lulilulix1.vercel.app',
  /\.vercel\.app$/
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => 
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Endpoint për nxjerrjen e të dhënave nga URL e jashtme (i përmirësuar)
app.post('/api/extract-car-data', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL është e detyrueshme' });
  }
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(data);
    
    // --- 1. Nxirr fotot (të filtruara) ---
    const images = new Set();
    
    // Kërko për Open Graph image (zakonisht foto kryesore)
    $('meta[property="og:image"]').each((i, el) => {
      let img = $(el).attr('content');
      if (img && img.startsWith('http') && !img.includes('placeholder') && !img.includes('blank')) {
        // Konverto në foto të madhe nëse është thumbnail
        img = img.replace(/thumbnail|thumb|small|mini/gi, 'large');
        images.add(img);
      }
    });
    
    // Kërko për të gjitha imazhet e mëdha
    $('img').each((i, el) => {
      let img = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-original');
      if (img) {
        // Konverto URL relative në absolute
        if (img.startsWith('//')) img = 'https:' + img;
        else if (img.startsWith('/')) img = new URL(img, url).href;
        
        // Filtro vetëm foto të vlefshme
        if (img && img.match(/\.(jpg|jpeg|png|webp)/i) && 
            img.startsWith('http') &&
            !img.includes('placeholder') &&
            !img.includes('blank') &&
            !img.includes('thumbnail') &&
            !img.includes('icon') &&
            !img.includes('logo')) {
          
          // Konverto në foto të madhe
          img = img.replace(/thumbnail|thumb|small|mini|w_100|w_200|h_100|h_200/gi, '');
          images.add(img);
        }
      }
    });
    
    // Filtro foto të dyfishta dhe merr maksimumi 15 foto
    const uniqueImages = Array.from(images).slice(0, 15);
    
    // --- 2. Nxirr titullin ---
    let title = '';
    $('meta[property="og:title"]').each((i, el) => {
      title = $(el).attr('content') || title;
    });
    if (!title) title = $('title').text();
    
    // --- 3. Nxirr markën dhe modelin ---
    let brand = '';
    let model = '';
    const commonBrands = ['BMW', 'Audi', 'Mercedes', 'Volkswagen', 'VW', 'Ford', 'Opel', 'Renault', 'Peugeot', 'Citroen', 'Toyota', 'Honda', 'Nissan', 'Hyundai', 'Kia', 'Volvo', 'Fiat', 'Skoda', 'Seat', 'Mazda', 'Mitsubishi', 'Subaru', 'Jeep', 'Land Rover', 'Porsche', 'Tesla', 'Dacia', 'Suzuki', 'Lexus', 'Jaguar', 'Alfa Romeo', 'Mini', 'Chevrolet'];
    
    for (const b of commonBrands) {
      if (title.toUpperCase().includes(b.toUpperCase())) {
        brand = b;
        model = title.replace(new RegExp(b, 'i'), '').trim();
        break;
      }
    }
    
    // --- 4. Nxirr vitin ---
    let year = '';
    const yearRegex = /\b(19[0-9]{2}|20[0-9]{2})\b/g;
    const bodyText = $('body').text();
    const years = bodyText.match(yearRegex);
    if (years && years.length > 0) {
      year = years[0];
    }
    
    // --- 5. Nxirr çmimin ---
    let price = '';
    const priceRegex = /(?:€|EUR|Euro)\s*([0-9.,]+)|([0-9.,]+)\s*(?:€|EUR|Euro)/i;
    const priceMatch = bodyText.match(priceRegex);
    if (priceMatch) {
      price = (priceMatch[1] || priceMatch[2]).replace(/[.,]/g, '');
    }
    
    // --- 6. Nxirr kilometrazhin ---
    let km = '';
    const kmRegex = /([0-9.,]+)\s*(?:km|kilometer|kilometra)/i;
    const kmMatch = bodyText.match(kmRegex);
    if (kmMatch) {
      km = kmMatch[1].replace(/[.,]/g, '');
    }
    
    // --- 7. Nxirr karburantin ---
    let fuel = 'Benzine';
    const fuels = ['Benzine', 'Diesel', 'Elektrike', 'Hibrid', 'GPL', 'Metan'];
    for (const f of fuels) {
      if (bodyText.toLowerCase().includes(f.toLowerCase())) {
        fuel = f;
        break;
      }
    }
    
    // --- 8. Nxirr transmetimin ---
    let transmission = 'Manual';
    if (bodyText.toLowerCase().includes('automatik') || bodyText.toLowerCase().includes('automatic')) {
      transmission = 'Automatik';
    }
    
    // --- 9. Nxirr madhësinë e motorit ---
    let engineSize = '';
    const engineRegex = /([0-9]+(?:[.,][0-9]+)?)\s*(?:l|liter|litra|L)/i;
    const engineMatch = bodyText.match(engineRegex);
    if (engineMatch) {
      let size = engineMatch[1].replace('.', ',');
      engineSize = size + ' L';
    }
    
    // --- 10. Nxirr lokacionin ---
    let lokacioni = 'Tiranë';
    const locations = ['Tiranë', 'Durrës', 'Prishtinë', 'Prizren', 'Pejë', 'Mitrovicë', 'Gjakovë', 'Ferizaj', 'Gjilan', 'Fushë Kosovë', 'Shkodër', 'Vlorë'];
    for (const loc of locations) {
      if (bodyText.toLowerCase().includes(loc.toLowerCase())) {
        lokacioni = loc;
        break;
      }
    }
    
    res.json({
      success: true,
      images: uniqueImages,
      carData: {
        brand: brand,
        model: model,
        year: year,
        price: price,
        km: km,
        fuel: fuel,
        transmission: transmission,
        engineSize: engineSize,
        lokacioni: lokacioni,
        description: title
      }
    });
    
  } catch (error) {
    console.error('Gabim në nxjerrjen e të dhënave:', error.message);
    res.status(500).json({ 
      error: 'Nuk mund të nxirren të dhënat nga kjo URL',
      details: error.message 
    });
  }
});

// Rrugët e veturave
app.use('/api/cars', carRoutes);

// Rrugë testuese
app.get('/', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// MongoDB lidhja
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB u lidh me sukses!'))
  .catch(err => console.log('❌ Gabim në lidhjen me MongoDB:', err));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Serveri po punon në portën ${PORT}`));