import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from "../components/AuthLayout";
import MapComp from "../pages/MapComp";
import { supabase } from "../lib/supabase";
import { useCustomerData } from "../hooks/useCustomerData";
import { apiGetCustomers, apiGetProducts } from '../lib/api';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const RegistrationPage = () => {
  const navigate = useNavigate();
  const { sites, loading, error } = useCustomerData();
  const [nearbyMarkersCount, setNearbyMarkersCount] = useState(0);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    productInterest: {
      audiosight: false,
      sate: false,
    },
    address: '',
    city: '',
    state: '',
  });

  const [validatedAddress, setValidatedAddress] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const mapRef = useRef(null); // Reference to the MapComp

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        productInterest: {
          ...prev.productInterest,
          [name]: checked,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

  const validateAddress = async () => {
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
  const url = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`;

  const combinedAddress = `${formData.address}, ${formData.city}, ${formData.state}`;

  const requestBody = {
    address: {
      addressLines: [combinedAddress],
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (response.ok && data.result && data.result.address) {
      console.log(data.result);
      if (data.result.address.missingComponentTypes && data.result.address.missingComponentTypes.length > 0) {
        setValidationError('Address is missing some components.');
        setValidatedAddress('');
        return;
      }

      const suggestedAddress = data.result.address.formattedAddress;
      const latitude = parseFloat(data.result.geocode.location.latitude);
      const longitude = parseFloat(data.result.geocode.location.longitude);

      setValidatedAddress(suggestedAddress);
      setValidationError(null);

      const userConfirmed = window.confirm(`Is this the address you were looking for?\n\n${suggestedAddress}`);
      if (userConfirmed) {
        const [address, city, state] = suggestedAddress.split(',').map(part => part.trim());
        setFormData((prev) => ({
          ...prev,
          address: address || prev.address,
          city: city || prev.city,
          state: state || prev.state,
        }));

        if (mapRef.current) {
          
          mapRef.current.zoomToLocation(latitude, longitude);

          // Calculate nearby markers interested in the same product
          const radius = 200; // Radius in kilometers
          const sameProductMarkers = sites.filter((site) => {
            console.log('Sites data:', site.latitude, latitude);
            const distance = calculateDistance(latitude, longitude, site.latitude, site.longitude);
            // const isInterested = Object.keys(formData.productInterest).some(
            //   (product) => formData.productInterest[product] && site.products_interested?.includes(product)
            // );
            return distance <= radius;
          });

          setNearbyMarkersCount(sameProductMarkers.length);
          console.log(`Found ${sameProductMarkers.length} nearby markers interested in the same product.`);
        }
      }
    } else {
      setValidatedAddress('');
      setValidationError('Unable to validate the address. Please check and try again.');
    }
  } catch (error) {
    setValidatedAddress('');
    setValidationError('An error occurred while validating the address.');
    console.error('Address validation error:', error);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form Data:', formData);
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Geocode the address to get latitude and longitude
      let latitude = null;
      let longitude = null;

      try {
        const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
        const url = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`;
        const combinedAddress = `${formData.address}, ${formData.city}, ${formData.state}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: {
              addressLines: [combinedAddress],
            },
          }),
        });

        const data = await response.json();
        if (response.ok && data.result && data.result.geocode) {
          latitude = parseFloat(data.result.geocode.location.latitude);
          longitude = parseFloat(data.result.geocode.location.longitude);
        }
      } catch (geocodeError) {
        console.warn('Geocoding failed:', geocodeError);
        // Continue with submission even if geocoding fails
      }

      // Build product interest array
      const productsInterested = [];
      if (formData.productInterest.audiosight) productsInterested.push('AudioSight');
      if (formData.productInterest.sate) productsInterested.push('SATE');

      // Prepare customer data for database
      const customerData = {
        customer_type: 'customer',
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phoneNumber,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: null,
        country: 'USA',
        latitude: latitude,
        longitude: longitude,
        products_interested: productsInterested.length > 0 ? productsInterested : null,
        status: 'lead',
        source_system: 'registration_form',
        registered_at: new Date().toISOString().split('T')[0],
        notes: `Registered via web form. Products interested: ${productsInterested.join(', ') || 'None selected'}`
      };

      console.log('Submitting customer data:', customerData);

      // Insert into Supabase
      const { data: insertedData, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Failed to save registration');
      }

      console.log('Registration successful:', insertedData);
      
      setSubmitSuccess(true);
      
      // Navigate to map with location data to zoom to the new customer
      if (latitude && longitude) {
        setTimeout(() => {
          navigate('/', {
            state: {
              zoomToLocation: {
                latitude,
                longitude,
                name: insertedData.name
              }
            }
          });
        }, 1500); // Show success message briefly before navigating
      } else {
        // If no coordinates, just navigate to map after a longer delay
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }

    } catch (error) {
      console.error('Registration error:', error);
      setSubmitError(error.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Register"
      subtitle="Create an account to access the platform."
    >
      <form onSubmit={handleSubmit}>
        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
          Fields marked with <span style={{ color: 'red' }}>*</span> are required.
        </p>

        <label className="form-label">
          First Name <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          className="form-input"
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          required
        />

        <label className="form-label" style={{ marginTop: 10 }}>
          Last Name <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          className="form-input"
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          required
        />

        <label className="form-label" style={{ marginTop: 10 }}>
          Email <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          className="form-input"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <label className="form-label" style={{ marginTop: 10 }}>
          Phone Number <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          className="form-input"
          type="tel"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          required
        />

        <label className="form-label" style={{ marginTop: 10 }}>
          Product Interest <span style={{ color: 'red' }}>*</span>
        </label>
        <div style={{ marginBottom: 10, marginTop: 10 }}>
          <label style={{ display: "block" }}>
            <input
              type="checkbox"
              name="audiosight"
              checked={formData.productInterest.audiosight}
              onChange={handleChange}
            />
            AudioSight
          </label>
          <label style={{ display: "block" }}>
            <input
              type="checkbox"
              name="sate"
              checked={formData.productInterest.sate}
              onChange={handleChange}
            />
            SATE
          </label>
        </div>

        <label className="form-label" style={{ marginTop: 10 }}>
          Address <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          className="form-input"
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
        />
        <label className="form-label" style={{ marginTop: 10 }}>
        City <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          className="form-input"
          type="text"
          name="city"
          value={formData.city}
          onChange={handleChange}
          required
        />

        <label className="form-label" style={{ marginTop: 10 }}>
          State <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          className="form-input"
          type="text"
          name="state"
          value={formData.state}
          onChange={handleChange}
          required
        />
        <button
          type="button"
          onClick={validateAddress}
          style={{
            marginTop: 20,
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Validate Address
        </button>

        <br />

        {/* {validatedAddress && (
          <p style={{ marginTop: 10, color: '#10b981' }}>
            Suggested Address: {validatedAddress}
          </p>
        )} */}
        {validationError && (
          <p style={{ marginTop: 10, color: '#ef4444' }}>
            {validationError}
          </p>
        )}

        {submitError && (
          <p style={{ marginTop: 10, color: '#ef4444', backgroundColor: '#fee2e2', padding: '10px', borderRadius: '4px' }}>
            ❌ {submitError}
          </p>
        )}

        {submitSuccess && (
          <p style={{ marginTop: 10, color: '#10b981', backgroundColor: '#d1fae5', padding: '10px', borderRadius: '4px' }}>
            ✅ Registration successful! Your information has been saved.
          </p>
        )}

        <button
          className="btn primary"
          type="submit"
          style={{ marginTop: 14 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Register'}
        </button>
      </form>
      {/* Include the Map */}
      <MapComp ref={mapRef} sites={sites} />

        {nearbyMarkersCount > 0 && (
  <p style={{ marginTop: 10, color: '#3b82f6' }}>
    There are {nearbyMarkersCount} people near you that are interested in the same product!
  </p>
)}

    </AuthLayout>
  );
};

export default RegistrationPage;


