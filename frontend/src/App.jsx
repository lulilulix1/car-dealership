import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://car-dealership-api-b3mx.onrender.com/api/cars';
const CLOUDINARY_CLOUD_NAME = 'dleye4vxg';
const CLOUDINARY_UPLOAD_PRESET = 'car_dealership';

function App() {
  const [cars, setCars] = useState([]);
  const [filteredCars, setFilteredCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    brand: '', year: '', minPrice: 0, maxPrice: 100000, 
    minKm: 0, maxKm: 500000, fuel: '', transmission: '', engineSize: ''
  });
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const carsPerPage = 6;
  
  const [newCar, setNewCar] = useState({
    brand: '', model: '', year: '', price: '', km: '', fuel: 'Benzine',
    transmission: 'Manual', engineSize: '', images: [], description: '',
    isDoganuar: false, transportNePort: false, lokacioni: 'Durrës'
  });

  useEffect(() => {
    fetchCars();
  }, []);

  useEffect(() => {
    filterAndSortCars();
  }, [cars, filters, sortBy]);

  const fetchCars = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      setCars(res.data);
    } catch (error) {
      console.error("Gabim në marrjen e të dhënave", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCars = () => {
    let result = [...cars];
    
    if (filters.brand) {
      result = result.filter(car => car.brand.toLowerCase().includes(filters.brand.toLowerCase()));
    }
    if (filters.year) {
      result = result.filter(car => car.year === Number(filters.year));
    }
    if (filters.fuel) {
      result = result.filter(car => car.fuel === filters.fuel);
    }
    if (filters.transmission) {
      result = result.filter(car => car.transmission === filters.transmission);
    }
    if (filters.engineSize) {
      result = result.filter(car => (car.engineSize || '') === filters.engineSize);
    }
    result = result.filter(car => car.price >= filters.minPrice && car.price <= filters.maxPrice);
    result = result.filter(car => car.km >= filters.minKm && car.km <= filters.maxKm);
    
    switch(sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'year_asc':
        result.sort((a, b) => a.year - b.year);
        break;
      case 'year_desc':
        result.sort((a, b) => b.year - a.year);
        break;
      case 'km_asc':
        result.sort((a, b) => a.km - b.km);
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    setFilteredCars(result);
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      setShowPasswordPrompt(true);
    }
  };

  const checkPassword = () => {
    if (passwordInput === 'Luli123') {
      setIsAdmin(true);
      setShowPasswordPrompt(false);
      setPasswordInput('');
    } else {
      alert('Password i gabuar!');
      setPasswordInput('');
    }
  };

  const uploadImageToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData
      );
      return response.data.secure_url;
    } catch (error) {
      console.error('Gabim në upload:', error);
      return null;
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const imageUrl = await uploadImageToCloudinary(file);
    if (imageUrl) {
      setNewCar(prev => ({
        ...prev,
        images: [...(prev.images || []), imageUrl]
      }));
    }
    setUploading(false);
    e.target.value = '';
  };

  const extractCarData = async () => {
    if (!extractUrl.trim()) {
      alert('Ju lutem shkruani një URL');
      return;
    }
    
    setExtracting(true);
    try {
      const response = await axios.post('https://car-dealership-api-b3mx.onrender.com/api/extract-car-data', {
        url: extractUrl
      });
      
      if (response.data.success) {
        if (response.data.images && response.data.images.length > 0) {
          setNewCar(prev => ({
            ...prev,
            images: response.data.images
          }));
        }
        
        const data = response.data.carData;
        setNewCar(prev => ({
          ...prev,
          brand: data.brand || prev.brand,
          model: data.model || prev.model,
          year: data.year || prev.year,
          price: data.price || prev.price,
          km: data.km || prev.km,
          fuel: data.fuel || prev.fuel,
          transmission: data.transmission || prev.transmission,
          engineSize: data.engineSize || prev.engineSize,
          lokacioni: data.lokacioni || prev.lokacioni,
          description: data.description || prev.description
        }));
        
        alert(`U nxorrën ${response.data.images.length} foto dhe të dhënat e veturës! Kontrollo dhe ndrysho nëse duhet.`);
        setExtractUrl('');
      } else {
        alert('Nuk u gjet asnjë të dhënë në këtë faqe');
      }
    } catch (error) {
      console.error(error);
      alert('Gabim gjatë nxjerrjes së të dhënave!');
    } finally {
      setExtracting(false);
    }
  };

  const removeImage = (index) => {
    setNewCar({ ...newCar, images: newCar.images.filter((_, i) => i !== index) });
  };

  const handleAddCar = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(API_URL, newCar);
      setNewCar({
        brand: '', model: '', year: '', price: '', km: '', fuel: 'Benzine',
        transmission: 'Manual', engineSize: '', images: [], description: '',
        isDoganuar: false, transportNePort: false, lokacioni: 'Durrës'
      });
      setShowForm(false);
      fetchCars();
    } catch (error) {
      console.error(error);
      alert("Ndodhi një gabim gjatë shtimit të veturës!");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCar = async (id) => {
    if (window.confirm('A jeni i sigurt që doni ta fshini këtë veturë?')) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        fetchCars();
      } catch (error) {
        alert('Gabim gjatë fshirjes së veturës!');
      }
    }
  };

  const handleEditCar = (car) => {
    setEditingCar(car);
    setNewCar({
      brand: car.brand, model: car.model, year: car.year, price: car.price,
      km: car.km, fuel: car.fuel, transmission: car.transmission || 'Manual',
      engineSize: car.engineSize || '', images: car.images || [], description: car.description || '',
      isDoganuar: car.isDoganuar || false, transportNePort: car.transportNePort || false,
      lokacioni: car.lokacioni || 'Durrës'
    });
    setShowForm(true);
  };

  const handleUpdateCar = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${API_URL}/${editingCar._id}`, newCar);
      setEditingCar(null);
      setNewCar({
        brand: '', model: '', year: '', price: '', km: '', fuel: 'Benzine',
        transmission: 'Manual', engineSize: '', images: [], description: '',
        isDoganuar: false, transportNePort: false, lokacioni: 'Durrës'
      });
      setShowForm(false);
      fetchCars();
    } catch (error) {
      alert('Gabim gjatë përditësimit të veturës!');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingCar(null);
    setNewCar({
      brand: '', model: '', year: '', price: '', km: '', fuel: 'Benzine',
      transmission: 'Manual', engineSize: '', images: [], description: '',
      isDoganuar: false, transportNePort: false, lokacioni: 'Durrës'
    });
    setShowForm(false);
  };

  const kontaktShitesin = (car) => {
    const msg = encodeURIComponent(`Përshëndetje, jam i interesuar për ${car.brand} ${car.model} (${car.year}) që e keni në shitje me çmim ${car.price}€. Ku mund të vij ta shoh?`);
    window.open(`https://wa.me/37744304200?text=${msg}`, '_blank');
  };

  const indexOfLastCar = currentPage * carsPerPage;
  const indexOfFirstCar = indexOfLastCar - carsPerPage;
  const currentCars = filteredCars.slice(indexOfFirstCar, indexOfLastCar);
  const totalPages = Math.ceil(filteredCars.length / carsPerPage);

  const CarModal = ({ car, onClose }) => {
    if (!car) return null;
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = car.images && car.images.length > 0 ? car.images : ['https://images.unsplash.com/photo-1503376780354-7e6690d241a4?w=800&h=500&fit=crop'];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="relative bg-gray-900 min-h-[400px] flex items-center justify-center">
            <img src={images[currentImageIndex]} alt={car.model} className="max-w-full max-h-[400px] object-contain" />
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {images.map((_, idx) => (
                  <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-blue-600 w-6' : 'bg-gray-400'}`} />
                ))}
              </div>
            )}
            <button onClick={onClose} className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-opacity-75">✕</button>
          </div>
          <div className="p-6">
            <h2 className="text-2xl font-bold">{car.brand} {car.model} ({car.year})</h2>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div><span className="font-semibold">Çmimi:</span> <span className="text-blue-600 text-xl">{car.price.toLocaleString()} €</span></div>
              <div><span className="font-semibold">Kilometrazhi:</span> {car.km.toLocaleString()} km</div>
              <div><span className="font-semibold">Karburanti:</span> {car.fuel}</div>
              <div><span className="font-semibold">Transmetimi:</span> {car.transmission}</div>
              <div><span className="font-semibold">Madhësia e motorit:</span> {car.engineSize || 'N/A'}</div>
              <div><span className="font-semibold">Lokacioni:</span> 📍 {car.lokacioni}</div>
            </div>
            {car.isDoganuar && <p className="text-green-600 mt-2">✅ E doganuar</p>}
            {car.transportNePort && <p className="text-blue-600">🚢 Transporti përfshirë deri në Portin e Durrësit</p>}
            <p className="mt-4 text-gray-700">{car.description}</p>
            <button onClick={() => kontaktShitesin(car)} className="bg-green-500 text-white px-6 py-3 rounded-lg mt-6 w-full hover:bg-green-600 text-lg font-semibold flex items-center justify-center gap-2 transition">
              📞 Kontakto Shitësin
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-600">🚗 AutoMarket Kosovo</h1>
          <div className="flex gap-3">
            <button 
              onClick={handleAdminToggle}
              className={`p-2 rounded-full transition ${isAdmin ? 'bg-red-500 text-white' : 'bg-gray-400 text-white hover:bg-gray-500'}`}
              title={isAdmin ? 'Dil nga Admin Mode' : 'Hyr si Admin'}
            >
              {isAdmin ? '👑' : '🔒'}
            </button>
            
            {isAdmin && (
              <button onClick={() => {
                setEditingCar(null);
                setNewCar({
                  brand: '', model: '', year: '', price: '', km: '', fuel: 'Benzine',
                  transmission: 'Manual', engineSize: '', images: [], description: '',
                  isDoganuar: false, transportNePort: false, lokacioni: 'Durrës'
                });
                setShowForm(!showForm);
              }} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition text-sm md:text-base">
                {showForm ? '✕ Mbyll' : '+ Shto'}
              </button>
            )}
          </div>
        </header>

        {showPasswordPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <h3 className="text-lg font-bold mb-4">Admin Access</h3>
              <input 
                type="password" 
                placeholder="Shkruani password-in" 
                className="border p-2 rounded w-full mb-4"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && checkPassword()}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={checkPassword} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Hyr</button>
                <button onClick={() => setShowPasswordPrompt(false)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Anullo</button>
              </div>
            </div>
          </div>
        )}

        {isAdmin && showForm && (
          <form onSubmit={editingCar ? handleUpdateCar : handleAddCar} className="bg-white p-5 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="text" placeholder="Marka" className="border p-2 rounded text-sm" value={newCar.brand} onChange={e => setNewCar({...newCar, brand: e.target.value})} required />
              <input type="text" placeholder="Modeli" className="border p-2 rounded text-sm" value={newCar.model} onChange={e => setNewCar({...newCar, model: e.target.value})} required />
              <input type="number" placeholder="Viti" className="border p-2 rounded text-sm" value={newCar.year} onChange={e => setNewCar({...newCar, year: e.target.value})} required />
              <input type="number" placeholder="Çmimi (€)" className="border p-2 rounded text-sm" value={newCar.price} onChange={e => setNewCar({...newCar, price: e.target.value})} required />
              <input type="number" placeholder="Kilometrazhi" className="border p-2 rounded text-sm" value={newCar.km} onChange={e => setNewCar({...newCar, km: e.target.value})} required />
              <select className="border p-2 rounded text-sm" value={newCar.fuel} onChange={e => setNewCar({...newCar, fuel: e.target.value})}>
                <option value="Benzine">Benzine</option>
                <option value="Diesel">Diesel</option>
                <option value="Elektrike">Elektrike</option>
                <option value="Hibrid">Hibrid</option>
              </select>
              <select className="border p-2 rounded text-sm" value={newCar.transmission} onChange={e => setNewCar({...newCar, transmission: e.target.value})}>
                <option value="Manual">Manual</option>
                <option value="Automatik">Automatik</option>
              </select>
              <input type="text" placeholder="Madhësia e motorit (p.sh. 1.6, 2.0)" className="border p-2 rounded text-sm" value={newCar.engineSize} onChange={e => setNewCar({...newCar, engineSize: e.target.value})} />
              <textarea placeholder="Përshkrimi" className="border p-2 rounded md:col-span-2 text-sm" rows="2" value={newCar.description} onChange={e => setNewCar({...newCar, description: e.target.value})}></textarea>
              
              {/* Nxjerrja e të dhënave nga URL */}
              <div className="md:col-span-2 bg-purple-50 p-3 rounded-lg">
                <label className="font-semibold text-sm block mb-1">🔗 Nxirr të dhënat automatikisht:</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ngjit URL-në e faqes (Encar, Mobile.de, Autoscout)" 
                    className="border p-2 rounded text-sm flex-1"
                    value={extractUrl}
                    onChange={(e) => setExtractUrl(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={extractCarData}
                    disabled={extracting}
                    className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 transition"
                  >
                    {extracting ? 'Duke nxjerrë...' : '🔍 Nxirr të dhënat'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ngjit URL-në e plotë të veturës. Sistemi i nxjerr AUTOMATIKISHT fotot, markën, modelin, vitin, çmimin, kilometrazhin dhe specifikat.
                </p>
              </div>
              
              {/* Fotot */}
              <div className="md:col-span-2">
                <label className="font-semibold text-sm block mb-1">📸 Fotot:</label>
                <div className="flex gap-2">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="border p-1 rounded text-sm flex-1" disabled={uploading} />
                </div>
                {uploading && <span className="text-blue-500 text-xs">Duke ngarkuar...</span>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {newCar.images && newCar.images.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img} alt={`Foto ${idx+1}`} className="w-14 h-14 object-cover rounded" />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="md:col-span-2 flex gap-4">
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={newCar.isDoganuar} onChange={e => setNewCar({...newCar, isDoganuar: e.target.checked})} />
                  <span>✅ Doganuar</span>
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={newCar.transportNePort} onChange={e => setNewCar({...newCar, transportNePort: e.target.checked})} />
                  <span>🚢 Port Durrës</span>
                </label>
              </div>
              
              <input type="text" placeholder="Lokacioni" className="border p-2 rounded text-sm" value={newCar.lokacioni} onChange={e => setNewCar({...newCar, lokacioni: e.target.value})} />
              
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="bg-blue-600 text-white py-2 rounded flex-1 hover:bg-blue-700 text-sm">
                  {editingCar ? 'Përditëso' : 'Ruaj'}
                </button>
                {editingCar && (
                  <button type="button" onClick={cancelEdit} className="bg-gray-500 text-white py-2 rounded flex-1 hover:bg-gray-600 text-sm">
                    Anullo
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {/* Filtrat e Kërkimit */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            <input type="text" name="brand" placeholder="Marka" className="border p-2 rounded text-sm" onChange={handleFilterChange} />
            <input type="number" name="year" placeholder="Viti" className="border p-2 rounded text-sm" onChange={handleFilterChange} />
            <select name="fuel" className="border p-2 rounded text-sm" onChange={handleFilterChange}>
              <option value="">Karburanti</option>
              <option value="Benzine">Benzine</option>
              <option value="Diesel">Diesel</option>
              <option value="Elektrike">Elektrike</option>
            </select>
            <select name="engineSize" className="border p-2 rounded text-sm" onChange={handleFilterChange}>
              <option value="">Madhësia e motorit</option>
              <option value="1.0">1.0</option>
              <option value="1.2">1.2</option>
              <option value="1.3">1.3</option>
              <option value="1.4">1.4</option>
              <option value="1.5">1.5</option>
              <option value="1.6">1.6</option>
              <option value="1.7">1.7</option>
              <option value="1.8">1.8</option>
              <option value="1.9">1.9</option>
              <option value="2.0">2.0</option>
              <option value="2.2">2.2</option>
              <option value="2.4">2.4</option>
              <option value="2.5">2.5</option>
              <option value="3.0">3.0</option>
            </select>
            <select name="transmission" className="border p-2 rounded text-sm" onChange={handleFilterChange}>
              <option value="">Transmetimi</option>
              <option value="Manual">Manual</option>
              <option value="Automatik">Automatik</option>
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-semibold">Çmimi: {filters.minPrice}€ - {filters.maxPrice}€</label>
              <div className="flex gap-2">
                <input type="range" name="minPrice" min="0" max="100000" step="1000" value={filters.minPrice} onChange={handlePriceChange} className="flex-1" />
                <input type="range" name="maxPrice" min="0" max="100000" step="1000" value={filters.maxPrice} onChange={handlePriceChange} className="flex-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold">Kilometrazhi: {filters.minKm}km - {filters.maxKm}km</label>
              <div className="flex gap-2">
                <input type="range" name="minKm" min="0" max="500000" step="10000" value={filters.minKm} onChange={handlePriceChange} className="flex-1" />
                <input type="range" name="maxKm" min="0" max="500000" step="10000" value={filters.maxKm} onChange={handlePriceChange} className="flex-1" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border p-2 rounded text-sm">
              <option value="newest">Më të rejat</option>
              <option value="price_asc">Çmimi më i ulët</option>
              <option value="price_desc">Çmimi më i lartë</option>
              <option value="year_asc">Viti më i vjetër</option>
              <option value="year_desc">Viti më i ri</option>
              <option value="km_asc">Km më të ulëta</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentCars.map(car => (
                <div key={car._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer group flex flex-col h-full" onClick={() => setSelectedCar(car)}>
                  <div className="relative h-52 overflow-hidden bg-gray-200 flex-shrink-0">
                    <img 
                      src={car.images && car.images[0] ? car.images[0] : 'https://images.unsplash.com/photo-1503376780354-7e6690d241a4?w=400&h=250&fit=crop'} 
                      alt={car.model} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1503376780354-7e6690d241a4?w=400&h=250&fit=crop';
                      }}
                    />
                    {car.isDoganuar && <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">✓ Doganuar</span>}
                    {car.transportNePort && <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">🚢 Port Durrës</span>}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-white font-bold text-lg">{car.price.toLocaleString()} €</p>
                    </div>
                  </div>
                  <div className="p-3 flex-grow flex flex-col">
                    <h2 className="text-md font-bold">{car.brand} {car.model}</h2>
                    <p className="text-gray-500 text-xs">{car.year} | {car.fuel} | {car.km.toLocaleString()} km</p>
                    <p className="text-gray-500 text-xs">{car.transmission} | {car.engineSize}</p>
                    <p className="text-gray-500 text-xs mt-1">📍 {car.lokacioni}</p>
                    <button onClick={(e) => { e.stopPropagation(); kontaktShitesin(car); }} className="bg-green-500 text-white py-2 rounded text-sm w-full mt-3 hover:bg-green-600 transition">
                      📞 Kontakto
                    </button>
                    {isAdmin && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={(e) => { e.stopPropagation(); handleEditCar(car); }} className="bg-yellow-500 text-white py-1 rounded text-xs flex-1 hover:bg-yellow-600 transition">✏️ Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCar(car._id); }} className="bg-red-500 text-white py-1 rounded text-xs flex-1 hover:bg-red-600 transition">🗑️ Fshij</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition">«</button>
                {[...Array(totalPages)].map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)} className={`px-3 py-1 rounded transition ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>{i + 1}</button>
                ))}
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition">»</button>
              </div>
            )}
          </>
        )}
      </div>
      {selectedCar && <CarModal car={selectedCar} onClose={() => setSelectedCar(null)} />}
    </div>
  );
}

export default App;