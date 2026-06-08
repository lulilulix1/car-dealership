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

// Endpoint për nxjerrjen e të dhënave nga URL e jashtme
app.post('/api/extract-car-data', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL është e detyrueshme' });
  }
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(data);
    
    // --- 1. Nxirr fotot nga Encar / Autoscout ---
    const imagesSet = new Set();
    
    // Funksion për të pastruar URL-në e fotos
    function cleanImageUrl(img) {
      if (!img) return null;
      if (img.startsWith('//')) img = 'https:' + img;
      if (img.startsWith('http://')) img = img.replace('http://', 'https://');
      if (!img.match(/\.(jpg|jpeg|png|webp)/i)) return null;
      if (img.includes('placeholder') || img.includes('blank') || img.includes('no-image')) return null;
      
      // Konverto në foto të madhe (1080x608 për Encar)
      img = img.replace(/_[0-9]+x[0-9]+\./, '.');
      img = img.replace(/\?d=[0-9]+x[0-9]+/, '?d=1080x608');
      img = img.replace(/\/thumb\//, '/origin/');
      
      return img;
    }
    
    // Meta og:image
    $('meta[property="og:image"]').each((i, el) => {
      const img = cleanImageUrl($(el).attr('content'));
      if (img) imagesSet.add(img);
    });
    
    // Div-at me foto (Encar)
    $('div[class*="photo"], div[class*="image"], div[class*="swiper-slide"], li[class*="photo"]').each((i, el) => {
      const style = $(el).attr('style');
      if (style && style.includes('background-image')) {
        const match = style.match(/url\(["']?([^"')]+)["']?\)/);
        if (match && match[1]) {
          const img = cleanImageUrl(match[1]);
          if (img) imagesSet.add(img);
        }
      }
      $(el).find('img').each((j, imgEl) => {
        const imgSrc = $(imgEl).attr('src') || $(imgEl).attr('data-src');
        const img = cleanImageUrl(imgSrc);
        if (img) imagesSet.add(img);
      });
    });
    
    // Të gjitha imazhet
    $('img').each((i, el) => {
      const imgSrc = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
      const img = cleanImageUrl(imgSrc);
      if (img && !img.includes('icon') && !img.includes('logo')) {
        imagesSet.add(img);
      }
    });
    
    // Script me foto JSON
    $('script').each((i, el) => {
      const scriptContent = $(el).html();
      if (scriptContent && (scriptContent.includes('imageUrl') || scriptContent.includes('photoUrl'))) {
        const urlMatches = scriptContent.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp)/gi);
        if (urlMatches) {
          urlMatches.forEach(img => {
            const cleanImg = cleanImageUrl(img);
            if (cleanImg) imagesSet.add(cleanImg);
          });
        }
      }
    });
    
    // Konverto Set në Array dhe merr 6-8 foto
    let uniqueImages = Array.from(imagesSet).slice(0, 8);
    
    // Nëse nuk ka foto, provo me parametër tjetër
    if (uniqueImages.length === 0) {
      $('img').each((i, el) => {
        let img = $(el).attr('src');
        if (img && img.match(/\.(jpg|jpeg|png)/i) && img.includes('encar')) {
          img = img.replace(/\?type=.+/, '?d=1080x608');
          uniqueImages.push(img);
        }
      });
    }
    
    console.log(`📸 Nxjerrë: ${uniqueImages.length} foto nga ${url.includes('encar') ? 'Encar' : 'faqja'}`);
    
    // --- 2. Nxirr titullin ---
    let title = '';
    $('meta[property="og:title"]').each((i, el) => {
      title = $(el).attr('content') || title;
    });
    if (!title) title = $('title').text();
    if (title.includes('|')) title = title.split('|')[0].trim();
    
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
    const priceRegex = /([0-9,]+)\s*(?:만|원|KRW)/;
    const priceMatch = bodyText.match(priceRegex);
    if (priceMatch) {
      let rawPrice = priceMatch[1].replace(/,/g, '');
      if (priceMatch[0].includes('만')) {
        price = (parseInt(rawPrice) * 10000).toString();
      } else {
        price = rawPrice;
      }
    }
    if (!price) {
      const euroMatch = bodyText.match(/(?:€|EUR)\s*([0-9.,]+)/i);
      if (euroMatch) price = euroMatch[1].replace(/[.,]/g, '');
    }
    
    // --- 6. Nxirr kilometrazhin ---
    let km = '';
    const kmRegex = /([0-9,]+)\s*(?:km|킬로미터)/i;
    const kmMatch = bodyText.match(kmRegex);
    if (kmMatch) {
      km = kmMatch[1].replace(/,/g, '');
    }
    
    // --- 7. Nxirr karburantin ---
    let fuel = 'Benzine';
    const fuels = ['Benzine', 'Diesel', 'Elektrike', 'Hibrid', 'GPL', 'Metan', 'Electric', 'Hybrid', '가솔린', '디젤'];
    for (const f of fuels) {
      if (bodyText.toLowerCase().includes(f.toLowerCase())) {
        fuel = f === '가솔린' ? 'Benzine' : (f === '디젤' ? 'Diesel' : f);
        break;
      }
    }
    
    // --- 8. Nxirr transmetimin ---
    let transmission = 'Manual';
    if (bodyText.toLowerCase().includes('automatik') || bodyText.toLowerCase().includes('automatic') || bodyText.toLowerCase().includes('오토')) {
      transmission = 'Automatik';
    }
    
    // --- 9. Nxirr madhësinë e motorit ---
    let engineSize = '';
    const engineRegex = /([0-9]+(?:[.,][0-9]+)?)\s*(?:l|liter|litra|L|리터)/i;
    const engineMatch = bodyText.match(engineRegex);
    if (engineMatch) {
      engineSize = engineMatch[1].replace('.', ',');
    }
    
    // --- 10. Nxirr lokacionin ---
    let lokacioni = 'Durrës';
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
        description: title.substring(0, 200)
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