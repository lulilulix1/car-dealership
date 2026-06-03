const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const carRoutes = require('./routes/cars');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/cars', carRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB u lidh me sukses!'))
  .catch(err => console.log('Gabim në lidhjen me MongoDB:', err));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Serveri po punon në portën ${PORT}`));