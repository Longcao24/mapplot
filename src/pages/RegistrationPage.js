import React, { useState, useRef } from 'react';
import AuthLayout from "../components/AuthLayout";
import MapComp from "../pages/MapComp";

const RegistrationPage = () => {
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

  const validateAddress = async () => {
  const apiKey = 'AIzaSyBvlretLtmUMeIXq-P8eUDx4ndOy7mnguI'; // Replace with your actual API key
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

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form Data:', formData);
    // Add logic to handle form submission
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

        <button
          className="btn primary"
          type="submit"
          style={{ marginTop: 14 }}
        >
          Register
        </button>
      </form>
      {/* Include the Map */}
      <MapComp ref={mapRef} />
    </AuthLayout>
  );
};

export default RegistrationPage;