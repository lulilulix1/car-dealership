const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  price: { type: Number, required: true },
  km: { type: Number, required: true },
  fuel: { type: String, required: true },
  transmission: { type: String, default: 'Manual' }, // Manual, Automatik
  engineSize: { type: String, default: '' }, // p.sh. "1.6 L", "2.0 L"
  images: [{ type: String }], // Array me URL të fotove
  description: String,
  isDoganuar: { type: Boolean, default: false },
  transportNePort: { type: Boolean, default: false },
  lokacioni: { type: String, default: 'Tiranë' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Car', carSchema);