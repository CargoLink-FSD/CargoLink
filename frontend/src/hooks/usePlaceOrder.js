import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { placeNewOrder } from '../store/slices/ordersSlice';
import { getCustomerAddresses } from '../api/customer';
import { estimatePrice as apiEstimatePrice } from '../api/orders';
import { useNotification } from '../context/NotificationContext';

export function usePlaceOrder() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showError, showSuccess } = useNotification();
  const { loading } = useSelector((state) => state.orders);

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [formData, setFormData] = useState({
    pickup: { street: '', city: '', state: '', pin: '', coordinates: null },
    delivery: { street: '', city: '', state: '', pin: '', coordinates: null },
    transit: { date: '', time: '', distance: '' },
    cargo: { type: '', vehicle: '', weight: '', volume: '', description: '', maxPrice: '' },
    shipments: [{ name: '', quantity: '', price: '' }]
  });

  // Store coordinates from geocoding
  const [pickupCoords, setPickupCoords] = useState(null); // { lat, lng }
  const [deliveryCoords, setDeliveryCoords] = useState(null); // { lat, lng }
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [durationMin, setDurationMin] = useState(null);

  // Price breakdown returned by the backend pricing engine
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const [cargoPhoto, setCargoPhoto] = useState(null);
  const [cargoPhotoPreview, setCargoPhotoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Debounce timer refs
  const priceTimerRef = useRef(null);

  // Load saved addresses on mount
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const addresses = await getCustomerAddresses();
        setSavedAddresses(addresses || []);
      } catch (error) {
        console.error('Failed to load addresses:', error);
      }
    };
    loadAddresses();
  }, []);

  // Auto-calculate distance using Google Maps Geometry when both locations have coordinates.
  useEffect(() => {
    const pickup = formData.pickup.coordinates;
    const delivery = formData.delivery.coordinates;

    if (!pickup || !delivery) return;
    if (pickup.lat === undefined || pickup.lng === undefined) return;
    if (delivery.lat === undefined || delivery.lng === undefined) return;

    // Wait for Google Maps to load
    if (!window.google?.maps?.geometry) {
      console.log('Google Maps Geometry library not loaded yet');
      return;
    }

    setDistanceLoading(true);
    try {
      const pickupLatLng = new google.maps.LatLng(pickup.lat, pickup.lng);
      const deliveryLatLng = new google.maps.LatLng(delivery.lat, delivery.lng);

      const meters = google.maps.geometry.spherical.computeDistanceBetween(pickupLatLng, deliveryLatLng);
      const distanceKm = Number((meters / 1000).toFixed(1));

      setPickupCoords({ lat: pickup.lat, lng: pickup.lng });
      setDeliveryCoords({ lat: delivery.lat, lng: delivery.lng });
      setDurationMin(null);

      setFormData(prev => ({
        ...prev,
        transit: { ...prev.transit, distance: String(distanceKm) }
      }));
      setErrors(prev => ({ ...prev, 'transit.distance': '' }));
    } catch (error) {
      console.error('Google Maps distance calculation failed:', error);
      setPickupCoords(null);
      setDeliveryCoords(null);
      setDurationMin(null);
    } finally {
      setDistanceLoading(false);
    }
  }, [formData.pickup.coordinates, formData.delivery.coordinates]);

  // Auto-calculate max price via backend pricing engine
  // Triggers whenever distance, vehicle, weight, goods type, volume, or shipments change.
  useEffect(() => {
    if (priceTimerRef.current) clearTimeout(priceTimerRef.current);

    const distance = parseFloat(formData.transit.distance);
    const weight = parseFloat(formData.cargo.weight);

    // Need at least distance + weight to get a meaningful estimate
    if (!distance || distance <= 0 || !weight || weight <= 0) {
      setPriceBreakdown(null);
      setFormData(prev => ({ ...prev, cargo: { ...prev.cargo, maxPrice: '' } }));
      return;
    }

    // Compute declared cargo value (sum of quantity × price for each shipment item)
    const cargoValue = formData.shipments.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.price) || 0;
      return sum + qty * unitPrice;
    }, 0);

    priceTimerRef.current = setTimeout(async () => {
      setPriceLoading(true);
      try {
        const breakdown = await apiEstimatePrice({
          distance,
          vehicle_type: formData.cargo.vehicle || 'truck-medium',
          // weight in the UI is in tonnes; backend expects kg
          weight: weight * 1000,
          volume: formData.cargo.volume ? parseFloat(formData.cargo.volume) : null,
          goods_type: formData.cargo.type || 'general',
          cargo_value: cargoValue,
          insurance_tier: 'none', // user doesn't pick tier at order time; insurance baked into risk charge
          originCoords: pickupCoords || null,
          destCoords: deliveryCoords || null,
        });

        setPriceBreakdown(breakdown);
        setFormData(prev => ({
          ...prev,
          cargo: { ...prev.cargo, maxPrice: String(breakdown.suggested_max_price) }
        }));
        setErrors(prev => ({ ...prev, 'cargo.maxPrice': '' }));
      } catch (err) {
        console.error('Price estimation failed:', err);
        // Fall back to simple formula so the form remains usable
        const fallback = Math.max(distance * 20, 2000);
        setPriceBreakdown(null);
        setFormData(prev => ({
          ...prev,
          cargo: { ...prev.cargo, maxPrice: String(Math.round(fallback)) }
        }));
      } finally {
        setPriceLoading(false);
      }
    }, 800);

    return () => { if (priceTimerRef.current) clearTimeout(priceTimerRef.current); };
  }, [
    formData.transit.distance,
    formData.cargo.vehicle,
    formData.cargo.weight,
    formData.cargo.type,
    formData.cargo.volume,
    // Re-estimate when any shipment item's quantity or price changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(formData.shipments.map(s => ({ q: s.quantity, p: s.price }))),
    pickupCoords,
    deliveryCoords,
  ]);

  // Auto-recommend vehicle type based on goods type and weight
  useEffect(() => {
    const { type } = formData.cargo;
    const weight = parseFloat(formData.cargo.weight);

    if (!type || isNaN(weight)) return;

    let recommendedVehicle = getRecommendedVehicle(type, weight);

    setFormData(prev => ({
      ...prev,
      cargo: { ...prev.cargo, vehicle: recommendedVehicle }
    }));
  }, [formData.cargo.type, formData.cargo.weight]);

  // Distance is recalculated from selected coordinates

  // Handle location set from map picker
  const handleLocationSet = (type, { coordinates, address }) => {
    setFormData(prev => {
      const updated = { ...prev };
      if (coordinates) {
        updated[type] = { ...updated[type], coordinates };
      }
      if (address) {
        updated[type] = {
          ...updated[type],
          street: address.street || updated[type].street,
          city: address.city || updated[type].city,
          state: address.state || updated[type].state,
          pin: address.pin || updated[type].pin,
        };
      }
      return updated;
    });
  };

  // Get recommended vehicle based on goods type and weight
  const getRecommendedVehicle = (type, weight) => {
    switch (type) {
      case 'general':
        return weight < 1 ? 'van' : weight < 5 ? 'truck-small' : weight < 10 ? 'truck-medium' : 'truck-large';
      case 'fragile':
        return weight < 5 ? 'truck-small' : 'truck-medium';
      case 'perishable':
        return 'refrigerated';
      case 'hazardous':
        return 'container';
      case 'machinery':
        return weight < 10 ? 'flatbed' : 'truck-large';
      case 'furniture':
        return weight < 5 ? 'truck-small' : 'truck-medium';
      case 'agricultural':
        return weight < 10 ? 'truck-medium' : 'truck-large';
      case 'construction':
        return 'flatbed';
      default:
        return 'truck-medium';
    }
  };

  // Calculate bidding end time (2 days before pickup)
  const getBiddingEndTime = () => {
    const { date, time } = formData.transit;
    if (!date || !time) return 'Please select pickup date and time';

    const [hours, minutes] = time.split(':').map(Number);
    const pickupDate = new Date(date);
    pickupDate.setHours(hours, minutes, 0, 0);

    const biddingEndDate = new Date(pickupDate);
    biddingEndDate.setDate(pickupDate.getDate() - 2);

    return biddingEndDate.toLocaleString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Validation functions
  const validateField = (section, field, value) => {
    const pincodeRegex = /^[1-9][0-9]{5}$/;

    if (section === 'pickup' || section === 'delivery') {
      if (field === 'pin') {
        if (!value) return 'Pincode is required';
        if (!pincodeRegex.test(value)) return 'Invalid pincode format';
      }
      if (['street', 'city', 'state'].includes(field) && !value.trim()) {
        return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    }

    if (section === 'transit') {
      if (field === 'date') {
        if (!value) return 'Pickup date is required';
        const pickupDate = new Date(value);
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + 4);
        minDate.setHours(0, 0, 0, 0);
        pickupDate.setHours(0, 0, 0, 0);
        if (pickupDate < minDate) return 'Pickup date must be at least 4 days from today';
      }
      if (field === 'time' && !value) return 'Pickup time is required';
      if (field === 'distance') {
        if (!value) return 'Distance is required';
        if (parseFloat(value) <= 0) return 'Distance must be positive';
      }
    }

    if (section === 'cargo') {
      if (field === 'type' && !value) return 'Goods type is required';
      if (field === 'vehicle' && !value) return 'Vehicle type is required';
      if (field === 'weight') {
        if (!value) return 'Weight is required';
        if (parseFloat(value) <= 0) return 'Weight must be positive';
      }
      if (field === 'description' && !value.trim()) return 'Cargo description is required';
      if (field === 'maxPrice') {
        if (!value) return 'Maximum price is required';
        if (parseFloat(value) < 2000) return 'Maximum price must be at least ₹2000';
      }
    }

    return '';
  };

  const validateShipmentItem = (index, field, value) => {
    if (field === 'name' && !value.trim()) return 'Item name is required';
    if (field === 'quantity') {
      if (!value) return 'Quantity is required';
      if (parseInt(value) <= 0) return 'Quantity must be positive';
    }
    if (field === 'price') {
      if (!value) return 'Price is required';
      if (parseFloat(value) <= 0) return 'Price must be positive';
    }
    return '';
  };

  // Handle input changes
  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));

    setTouched(prev => ({
      ...prev,
      [`${section}.${field}`]: true
    }));

    const error = validateField(section, field, value);
    setErrors(prev => ({
      ...prev,
      [`${section}.${field}`]: error
    }));
  };

  const handleShipmentChange = (index, field, value) => {
    const newShipments = [...formData.shipments];
    newShipments[index][field] = value;
    setFormData(prev => ({ ...prev, shipments: newShipments }));

    setTouched(prev => ({
      ...prev,
      [`shipments.${index}.${field}`]: true
    }));

    const error = validateShipmentItem(index, field, value);
    setErrors(prev => ({
      ...prev,
      [`shipments.${index}.${field}`]: error
    }));
  };

  const addShipmentItem = () => {
    setFormData(prev => ({
      ...prev,
      shipments: [...prev.shipments, { name: '', quantity: '', price: '' }]
    }));
  };

  const removeShipmentItem = (index) => {
    if (formData.shipments.length === 1) {
      showError('At least one shipment item is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      shipments: prev.shipments.filter((_, i) => i !== index)
    }));
  };

  // Load saved address
  const loadAddress = (type, addressIndex) => {
    if (addressIndex === '') {
      setFormData(prev => ({
        ...prev,
        [type]: { street: '', city: '', state: '', pin: '', coordinates: null }
      }));
      return;
    }

    const address = savedAddresses[addressIndex];
    if (address) {
      setFormData(prev => ({
        ...prev,
        [type]: {
          street: address.street || '',
          city: address.city || '',
          state: address.state || '',
          pin: address.pin || '',
          coordinates: address.coordinates || null,
        }
      }));
    }
  };

  const setFieldTouched = (fieldPath) => {
    setTouched(prev => ({ ...prev, [fieldPath]: true }));
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark ALL fields as touched so errors display
    const allTouched = {};
    ['pickup', 'delivery'].forEach(section => {
      ['street', 'city', 'state', 'pin'].forEach(field => {
        allTouched[`${section}.${field}`] = true;
      });
    });
    ['date', 'time', 'distance'].forEach(field => {
      allTouched[`transit.${field}`] = true;
    });
    ['type', 'vehicle', 'weight', 'description', 'maxPrice'].forEach(field => {
      allTouched[`cargo.${field}`] = true;
    });
    formData.shipments.forEach((_, index) => {
      ['name', 'quantity', 'price'].forEach(field => {
        allTouched[`shipments.${index}.${field}`] = true;
      });
    });
    setTouched(prev => ({ ...prev, ...allTouched }));

    // Validate all fields
    const newErrors = {};
    let isValid = true;

    // Validate pickup and delivery
    ['pickup', 'delivery'].forEach(section => {
      ['street', 'city', 'state', 'pin'].forEach(field => {
        const error = validateField(section, field, formData[section][field]);
        if (error) {
          newErrors[`${section}.${field}`] = error;
          isValid = false;
        }
      });
    });

    // Validate transit
    ['date', 'time', 'distance'].forEach(field => {
      const error = validateField('transit', field, formData.transit[field]);
      if (error) {
        newErrors[`transit.${field}`] = error;
        isValid = false;
      }
    });

    // Validate cargo
    ['type', 'vehicle', 'weight', 'description', 'maxPrice'].forEach(field => {
      const error = validateField('cargo', field, formData.cargo[field]);
      if (error) {
        newErrors[`cargo.${field}`] = error;
        isValid = false;
      }
    });

    // Validate shipments
    formData.shipments.forEach((item, index) => {
      ['name', 'quantity', 'price'].forEach(field => {
        const error = validateShipmentItem(index, field, item[field]);
        if (error) {
          newErrors[`shipments.${index}.${field}`] = error;
          isValid = false;
        }
      });
    });

    setErrors(newErrors);

    if (!isValid) {
      showError('Please fix all validation errors before submitting');
      return;
    }

    // Prepare order data for backend
    const orderData = {
      pickup: {
        ...formData.pickup,
        coordinates: formData.pickup.coordinates || undefined,
      },
      delivery: {
        ...formData.delivery,
        coordinates: formData.delivery.coordinates || undefined,
      },
      scheduled_at: new Date(`${formData.transit.date}T${formData.transit.time}`).toISOString(),
      distance: parseFloat(formData.transit.distance),
      max_price: parseFloat(formData.cargo.maxPrice),
      goods_type: formData.cargo.type,
      weight: parseFloat(formData.cargo.weight) * 1000, // store in kg on backend
      volume: formData.cargo.volume ? parseFloat(formData.cargo.volume) : undefined,
      // Declared goods value (sum of all items)
      cargo_value: formData.shipments.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
      }, 0),
      toll_cost: priceBreakdown?.toll_cost ?? undefined,
      truck_type: formData.cargo.vehicle,
      description: formData.cargo.description,
      shipments: formData.shipments.map(item => ({
        item_name: item.name,
        quantity: parseInt(item.quantity),
        price: parseFloat(item.price)
      }))
    };

    try {
      await dispatch(placeNewOrder({ orderData, cargoPhoto })).unwrap();
      showSuccess('Order placed successfully!');
      navigate('/customer/orders');
    } catch (error) {
      showError(error || 'Failed to place order');
    }
  };

  // Handle cargo photo upload
  const handleCargoPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showError('Please upload a valid image file (JPEG, PNG, GIF, or WEBP)');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showError('File size must be less than 5MB');
        return;
      }

      setCargoPhoto(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCargoPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCargoPhoto = () => {
    setCargoPhoto(null);
    setCargoPhotoPreview(null);
  };

  return {
    formData,
    errors,
    touched,
    loading,
    savedAddresses,
    cargoPhoto,
    cargoPhotoPreview,
    distanceLoading,
    durationMin,
    priceBreakdown,
    priceLoading,
    handleInputChange,
    handleShipmentChange,
    addShipmentItem,
    removeShipmentItem,
    loadAddress,
    handleSubmit,
    setFieldTouched,
    getBiddingEndTime,
    handleCargoPhotoChange,
    removeCargoPhoto,
    handleLocationSet,
    navigate
  };
}
