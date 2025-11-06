import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from "../components/AuthLayout";
import SimpleMap from "../components/SimpleMap";
import { supabase } from "../lib/supabase";
import { useCustomerData } from "../hooks/useCustomerData";
import { geocodeZipcode } from "../utils/geocoding"; // keep this path as your helper
import 'maplibre-gl/dist/maplibre-gl.css';
import './RegistrationPage.css';


const RegistrationPage = () => {
  const navigate = useNavigate();
  const { sites } = useCustomerData();
  const [nearbyMarkersCount, setNearbyMarkersCount] = useState(0);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    productInterest: {
      audiosight: false,
      sate: false,
      mRehab: false, // FIX: was missing; checkbox reads this
    },
    address: '',
    city: '',
    state: '',
    postalCode: '', // store the validated ZIP here
  });

  const [validatedAddress, setValidatedAddress] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const mapRef = useRef(null);

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
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const validateAddress = async () => {
    const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
    const url = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`;

    const combinedAddress = `${formData.address}, ${formData.city}, ${formData.state}`;
    const requestBody = { address: { addressLines: [combinedAddress] } };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.result?.address) {
        if (data.result.address.missingComponentTypes?.length) {
          setValidationError('Address is missing some components.');
          setValidatedAddress('');
          return;
        }

        const suggestedAddress = data.result.address.formattedAddress;
        const postal = data.result.address.postalAddress?.postalCode || '';
        const country = (data.result.address.postalAddress?.regionCode || 'US').toUpperCase();

        setValidatedAddress(suggestedAddress);
        setValidationError(null);

        const userConfirmed = window.confirm(`Is this the address you were looking for?\n\n${suggestedAddress}`);
        if (!userConfirmed) return;

        const [addr, city, state] = suggestedAddress.split(',').map(part => part.trim());
        setFormData((prev) => ({
          ...prev,
          address: addr || prev.address,
          city: city || prev.city,
          state: state || prev.state,
          postalCode: postal || prev.postalCode,
        }));

        // ZIP-only plotting
        if (postal) {
          const zipHit = await geocodeZipcode(postal, country);
          if (zipHit && mapRef.current) {
            const { latitude: zipLat, longitude: zipLng } = zipHit;
            mapRef.current.zoomToLocation(zipLat, zipLng);

            // Nearby markers relative to ZIP centroid
            const radius = 200; // km
            const sameProductMarkers = sites.filter((site) => {
              const distance = calculateDistance(zipLat, zipLng, site.latitude, site.longitude);
              return distance <= radius;
            });
            setNearbyMarkersCount(sameProductMarkers.length);
          }
        } else {
          setValidationError('Validated address has no postal code; cannot plot by ZIP.');
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
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // ZIP-only centroid for lat/lng
      let latitude = null;
      let longitude = null;
      let postal = formData.postalCode;

      if (!postal) {
        // Try extracting ZIP quickly if user didn't hit "Validate"
        try {
          const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
          const url = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`;
          const combinedAddress = `${formData.address}, ${formData.city}, ${formData.state}`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: { addressLines: [combinedAddress] } }),
          });
          const d = await resp.json();
          if (resp.ok && d.result?.address?.postalAddress?.postalCode) {
            postal = d.result.address.postalAddress.postalCode;
          }
        } catch (_) {}
      }

      if (postal) {
        try {
          const hit = await geocodeZipcode(postal, 'US');
          if (hit) {
            latitude = hit.latitude;
            longitude = hit.longitude;
          }
        } catch (zipErr) {
          console.warn('ZIP geocoding failed:', zipErr);
        }
      }

      // Build product interest array
      const productsInterested = [];
      if (formData.productInterest.audiosight) productsInterested.push('AudioSight');
      if (formData.productInterest.sate) productsInterested.push('SATE');
      if (formData.productInterest.mRehab) productsInterested.push('MRehab');

      // Prepare customer row (save ZIP + ZIP centroid if available)
      const customerData = {
        customer_type: 'customer',
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phoneNumber,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: postal || null, // FIX: remove duplicate & typo 'post'
        country: 'USA',
        latitude: latitude,          // ZIP centroid
        longitude: longitude,        // ZIP centroid
        products_interested: productsInterested.length ? productsInterested : null,
        status: 'lead',
        source_system: 'registration_form',
        registered_at: new Date().toISOString().split('T')[0],
        notes: `Registered via web form. Products interested: ${productsInterested.join(', ') || 'None selected'}`,
      };

      const { data: insertedData, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (error) throw new Error(error.message || 'Failed to save registration');

      setSubmitSuccess(true);

      // Navigate to map; if we have coords, zoom to ZIP centroid
      if (latitude && longitude) {
        setTimeout(() => {
          navigate('/', {
            state: {
              zoomToLocation: { latitude, longitude, name: insertedData.name }
            }
          });
        }, 1500);
      } else {
        setTimeout(() => { navigate('/'); }, 3000);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setSubmitError(err.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // inside return (
<AuthLayout title="Register" subtitle="Create an account to access the platform.">
  <div className="center-auth">
  <div className="registration-page">
    <div className="registration-container">
      

      <form className="registration-form" onSubmit={handleSubmit}>
        <p className="helper">
          Fields marked with <span style={{ color: 'red' }}>*</span> are required.
        </p>

        {/* Name */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">First Name <span style={{ color: 'red' }}>*</span></label>
            <input className="form-input" type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name <span style={{ color: 'red' }}>*</span></label>
            <input className="form-input" type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
          </div>
        </div>

        {/* Contact */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Email <span style={{ color: 'red' }}>*</span></label>
            <input className="form-input" type="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number <span style={{ color: 'red' }}>*</span></label>
            <input className="form-input" type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required />
          </div>
        </div>

        {/* Product Interest */}
        <fieldset className="fieldset">
          <legend className="legend">Product Interest <span style={{ color: 'red' }}>*</span></legend>
          <div className="checkbox-list">
            <label className="checkbox-item">
              <input type="checkbox" name="audiosight" checked={formData.productInterest.audiosight} onChange={handleChange} />
              <span>AudioSight</span>
            </label>
            <label className="checkbox-item">
              <input type="checkbox" name="sate" checked={formData.productInterest.sate} onChange={handleChange} />
              <span>SATE</span>
            </label>
            <label className="checkbox-item">
              <input type="checkbox" name="mRehab" checked={formData.productInterest.mRehab} onChange={handleChange} />
              <span>MRehab</span>
            </label>
          </div>
        </fieldset>

        {/* Address */}
        <div className="form-group">
          <label className="form-label">Address <span style={{ color: 'red' }}>*</span></label>
          <input className="form-input" type="text" name="address" value={formData.address} onChange={handleChange} required />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">City <span style={{ color: 'red' }}>*</span></label>
            <input className="form-input" type="text" name="city" value={formData.city} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">State <span style={{ color: 'red' }}>*</span></label>
            <input className="form-input" type="text" name="state" value={formData.state} onChange={handleChange} required />
          </div>
        </div>

        {/* Feedback */}
        {validationError && <p className="msg msg--error">{validationError}</p>}
        {submitError && <p className="msg msg--error">❌ {submitError}</p>}
        {submitSuccess && <p className="msg msg--success">✅ Registration successful! Your information has been saved.</p>}

        {/* Actions — same size & font. Side-by-side desktop, stacked mobile */}
        <div className="actions">
          <button type="button" className="btn" onClick={validateAddress}>Validate Address</button>
        </div>
      </form>

      <div className="map-block">
        <SimpleMap ref={mapRef} />
      </div>
      <div>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Register'}
        </button>
      </div>
    </div>
  </div>
  </div>
</AuthLayout>

  );
};

export default RegistrationPage;
