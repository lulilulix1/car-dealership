const express = require('express');
const router = express.Router();
const Car = require('../models/car');

// Merr të gjitha veturat
router.get('/', async (req, res) => {
  try {
    const { brand, year, minPrice, maxPrice, minKm, maxKm, fuel, transmission } = req.query;
    let query = {};

    if (brand) query.brand = new RegExp(brand, 'i');
    if (year) query.year = Number(year);
    if (fuel) query.fuel = fuel;
    if (transmission) query.transmission = transmission;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (minKm || maxKm) {
      query.km = {};
      if (minKm) query.km.$gte = Number(minKm);
      if (maxKm) query.km.$lte = Number(maxKm);
    }

    const cars = await Car.find(query).sort({ createdAt: -1 });
    res.json(cars);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Shto veturë
router.post('/', async (req, res) => {
  try {
    const carData = { ...req.body };
    if (!carData.images || carData.images.length === 0) {
      delete carData.images;
    }
    const car = new Car(carData);
    const newCar = await car.save();
    res.status(201).json(newCar);
  } catch (err) {
    console.error('Gabim gjatë shtimit:', err);
    res.status(400).json({ message: err.message });
  }
});

// Fshij veturë
router.delete('/:id', async (req, res) => {
  try {
    const deletedCar = await Car.findByIdAndDelete(req.params.id);
    if (!deletedCar) return res.status(404).json({ message: 'Vetura nuk u gjet' });
    res.json({ message: 'Vetura u fshi me sukses' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Përditëso veturë
router.put('/:id', async (req, res) => {
  try {
    const updatedCar = await Car.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCar) return res.status(404).json({ message: 'Vetura nuk u gjet' });
    res.json(updatedCar);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Merr një veturë (për detajet)
router.get('/:id', async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: 'Vetura nuk u gjet' });
    res.json(car);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;