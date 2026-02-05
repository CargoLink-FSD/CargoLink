import React from 'react';
import { usePlaceOrder } from '../../hooks/usePlaceOrder';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { Button } from '../../components/forms';
import '../../styles/PlaceOrder.css';

const GOODS_TYPES = [
  { value: '', label: 'Select goods type' },
  { value: 'general', label: 'General Merchandise' },
  { value: 'fragile', label: 'Fragile Items' },
  { value: 'perishable', label: 'Perishable Goods' },
  { value: 'hazardous', label: 'Hazardous Materials' },
  { value: 'machinery', label: 'Vehicles & Machinery' },
  { value: 'furniture', label: 'Household Furniture' },
  { value: 'agricultural', label: 'Agricultural Commodities' },
  { value: 'construction', label: 'Construction Material' },
  { value: 'other', label: 'Other' }
];

const VEHICLE_TYPES = [
  { value: '', label: 'Select vehicle type' },
  { value: 'van', label: 'Van' },
  { value: 'truck-small', label: 'Small Truck' },
  { value: 'truck-medium', label: 'Medium Truck' },
  { value: 'truck-large', label: 'Large Truck' },
  { value: 'refrigerated', label: 'Refrigerated Truck' },
  { value: 'flatbed', label: 'Flatbed Truck' },
  { value: 'container', label: 'Container Truck' },
  { value: 'any', label: 'Any' }
];

export default function PlaceOrder() {
  const {
    formData,
    errors,
    touched,
    loading,
    savedAddresses,
    cargoPhoto,
    cargoPhotoPreview,
    handleInputChange,
    handleShipmentChange,
    addShipmentItem,
    removeShipmentItem,
    loadAddress,
    handleSubmit,
    setFieldTouched,
    getBiddingEndTime,
    handleCargoPhotoChange,
    removeCargoPhoto
  } = usePlaceOrder();

  return (
    <>
      <Header />
      <main className="main-content container">
        <div className="page-header">
          <h1 className="page-title">Place Order</h1>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          {/* Shipment Details - Two Column Layout */}
          <div className="form-section">
            <h2 className="section-title">Shipment Details</h2>

            <div className="form-row">
              {/* Pickup Location */}
              <div className="form-group">
                <label htmlFor="pickup-street" className="form-label">Pickup Location</label>

                {savedAddresses.length > 0 && (
                  <select
                    id="pickup-address-select"
                    className="input-field"
                    onChange={(e) => loadAddress('pickup', e.target.value)}
                    defaultValue=""
                  >
                    <option value="">Select a saved address</option>
                    {savedAddresses.map((addr, idx) => (
                      <option key={idx} value={idx}>
                        {addr.address_label || 'Address'}
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="text"
                  id="pickup-street"
                  className={`input-field ${errors['pickup.street'] && touched['pickup.street'] ? 'error' : ''}`}
                  value={formData.pickup.street}
                  onChange={(e) => handleInputChange('pickup', 'street', e.target.value)}
                  onBlur={() => setFieldTouched('pickup.street')}
                  placeholder="Street Address"
                />
                {errors['pickup.street'] && touched['pickup.street'] && (
                  <span className="error-message">{errors['pickup.street']}</span>
                )}

                <div className="address-wrapper">
                  <input
                    type="text"
                    id="pickup-city"
                    className={`input-field ${errors['pickup.city'] && touched['pickup.city'] ? 'error' : ''}`}
                    value={formData.pickup.city}
                    onChange={(e) => handleInputChange('pickup', 'city', e.target.value)}
                    onBlur={() => setFieldTouched('pickup.city')}
                    placeholder="City"
                  />
                  <input
                    type="text"
                    id="pickup-state"
                    className={`input-field ${errors['pickup.state'] && touched['pickup.state'] ? 'error' : ''}`}
                    value={formData.pickup.state}
                    onChange={(e) => handleInputChange('pickup', 'state', e.target.value)}
                    onBlur={() => setFieldTouched('pickup.state')}
                    placeholder="State"
                  />
                </div>
                {(errors['pickup.city'] || errors['pickup.state']) && (touched['pickup.city'] || touched['pickup.state']) && (
                  <span className="error-message">{errors['pickup.city'] || errors['pickup.state']}</span>
                )}

                <input
                  type="text"
                  id="pickup-zip"
                  className={`input-field ${errors['pickup.pin'] && touched['pickup.pin'] ? 'error' : ''}`}
                  value={formData.pickup.pin}
                  onChange={(e) => handleInputChange('pickup', 'pin', e.target.value)}
                  onBlur={() => setFieldTouched('pickup.pin')}
                  placeholder="ZIP Code"
                  maxLength="6"
                />
                {errors['pickup.pin'] && touched['pickup.pin'] && (
                  <span className="error-message">{errors['pickup.pin']}</span>
                )}
              </div>

              {/* Drop-off Location */}
              <div className="form-group">
                <label htmlFor="dropoff-street" className="form-label">Drop-off Location</label>

                {savedAddresses.length > 0 && (
                  <select
                    id="dropoff-address-select"
                    className="input-field"
                    onChange={(e) => loadAddress('delivery', e.target.value)}
                    defaultValue=""
                  >
                    <option value="">Select a saved address</option>
                    {savedAddresses.map((addr, idx) => (
                      <option key={idx} value={idx}>
                        {addr.address_label || 'Address'}
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="text"
                  id="dropoff-street"
                  className={`input-field ${errors['delivery.street'] && touched['delivery.street'] ? 'error' : ''}`}
                  value={formData.delivery.street}
                  onChange={(e) => handleInputChange('delivery', 'street', e.target.value)}
                  onBlur={() => setFieldTouched('delivery.street')}
                  placeholder="Street Address"
                />
                {errors['delivery.street'] && touched['delivery.street'] && (
                  <span className="error-message">{errors['delivery.street']}</span>
                )}

                <div className="city-state-wrapper">
                  <input
                    type="text"
                    id="dropoff-city"
                    className={`input-field ${errors['delivery.city'] && touched['delivery.city'] ? 'error' : ''}`}
                    value={formData.delivery.city}
                    onChange={(e) => handleInputChange('delivery', 'city', e.target.value)}
                    onBlur={() => setFieldTouched('delivery.city')}
                    placeholder="City"
                  />
                  <input
                    type="text"
                    id="dropoff-state"
                    className={`input-field ${errors['delivery.state'] && touched['delivery.state'] ? 'error' : ''}`}
                    value={formData.delivery.state}
                    onChange={(e) => handleInputChange('delivery', 'state', e.target.value)}
                    onBlur={() => setFieldTouched('delivery.state')}
                    placeholder="State"
                  />
                </div>
                {(errors['delivery.city'] || errors['delivery.state']) && (touched['delivery.city'] || touched['delivery.state']) && (
                  <span className="error-message">{errors['delivery.city'] || errors['delivery.state']}</span>
                )}

                <input
                  type="text"
                  id="dropoff-zip"
                  className={`input-field ${errors['delivery.pin'] && touched['delivery.pin'] ? 'error' : ''}`}
                  value={formData.delivery.pin}
                  onChange={(e) => handleInputChange('delivery', 'pin', e.target.value)}
                  onBlur={() => setFieldTouched('delivery.pin')}
                  placeholder="ZIP Code"
                  maxLength="6"
                />
                {errors['delivery.pin'] && touched['delivery.pin'] && (
                  <span className="error-message">{errors['delivery.pin']}</span>
                )}
              </div>
            </div>

            {/* Date, Time, Distance Row */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pickup-date" className="form-label">Pickup Date</label>
                <input
                  type="date"
                  id="pickup-date"
                  className={`input-field ${errors['transit.date'] && touched['transit.date'] ? 'error' : ''}`}
                  value={formData.transit.date}
                  onChange={(e) => handleInputChange('transit', 'date', e.target.value)}
                  onBlur={() => setFieldTouched('transit.date')}
                  min={new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
                {errors['transit.date'] && touched['transit.date'] && (
                  <span className="error-message">{errors['transit.date']}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="pickup-time" className="form-label">Pickup Time</label>
                <input
                  type="time"
                  id="pickup-time"
                  className={`input-field ${errors['transit.time'] && touched['transit.time'] ? 'error' : ''}`}
                  value={formData.transit.time}
                  onChange={(e) => handleInputChange('transit', 'time', e.target.value)}
                  onBlur={() => setFieldTouched('transit.time')}
                />
                {errors['transit.time'] && touched['transit.time'] && (
                  <span className="error-message">{errors['transit.time']}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="distance" className="form-label">Distance (km)</label>
                <input
                  type="number"
                  id="distance"
                  className={`input-field ${errors['transit.distance'] && touched['transit.distance'] ? 'error' : ''}`}
                  value={formData.transit.distance}
                  onChange={(e) => handleInputChange('transit', 'distance', e.target.value)}
                  onBlur={() => setFieldTouched('transit.distance')}
                  min="0"
                  step="0.1"
                />
                {errors['transit.distance'] && touched['transit.distance'] && (
                  <span className="error-message">{errors['transit.distance']}</span>
                )}
              </div>
            </div>
          </div>

          {/* Cargo Information */}
          <div className="form-section">
            <h2 className="section-title">Cargo Information</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="goods-type" className="form-label">Type of Goods</label>
                <select
                  id="goods-type"
                  className={`input-field ${errors['cargo.type'] && touched['cargo.type'] ? 'error' : ''}`}
                  value={formData.cargo.type}
                  onChange={(e) => handleInputChange('cargo', 'type', e.target.value)}
                  onBlur={() => setFieldTouched('cargo.type')}
                >
                  {GOODS_TYPES.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors['cargo.type'] && touched['cargo.type'] && (
                  <span className="error-message">{errors['cargo.type']}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="vehicle-type" className="form-label">Vehicle Type Required</label>
                <select
                  id="vehicle-type"
                  className={`input-field ${errors['cargo.vehicle'] && touched['cargo.vehicle'] ? 'error' : ''}`}
                  value={formData.cargo.vehicle}
                  onChange={(e) => handleInputChange('cargo', 'vehicle', e.target.value)}
                  onBlur={() => setFieldTouched('cargo.vehicle')}
                >
                  {VEHICLE_TYPES.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors['cargo.vehicle'] && touched['cargo.vehicle'] && (
                  <span className="error-message">{errors['cargo.vehicle']}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="weight" className="form-label">Weight (tonnes)</label>
                <input
                  type="number"
                  id="weight"
                  className={`input-field ${errors['cargo.weight'] && touched['cargo.weight'] ? 'error' : ''}`}
                  value={formData.cargo.weight}
                  onChange={(e) => handleInputChange('cargo', 'weight', e.target.value)}
                  onBlur={() => setFieldTouched('cargo.weight')}
                  placeholder="Estimated weight"
                  min="0"
                  max="30"
                  step="0.1"
                />
                {errors['cargo.weight'] && touched['cargo.weight'] && (
                  <span className="error-message">{errors['cargo.weight']}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="num-item-types" className="form-label">Number of Item Types</label>
                <input
                  type="number"
                  id="num-item-types"
                  className="input-field"
                  value={formData.shipments.length}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 1;
                    const currentCount = formData.shipments.length;
                    if (count > currentCount) {
                      // Add items
                      for (let i = currentCount; i < count; i++) {
                        addShipmentItem();
                      }
                    } else if (count < currentCount && count >= 1) {
                      // Remove items
                      for (let i = currentCount; i > count; i--) {
                        removeShipmentItem(i - 1);
                      }
                    }
                  }}
                  placeholder="Number of different items"
                  min="1"
                />
              </div>
            </div>

            {/* Shipment Items */}
            <div id="item-details-container">
              {formData.shipments.map((item, index) => (
                <div key={index} className="shipment-item">
                  <div className="form-row">
                    <div className="form-group">
                      <input
                        type="text"
                        className={`input-field ${errors[`shipments.${index}.name`] && touched[`shipments.${index}.name`] ? 'error' : ''}`}
                        value={item.name}
                        onChange={(e) => handleShipmentChange(index, 'name', e.target.value)}
                        onBlur={() => setFieldTouched(`shipments.${index}.name`)}
                        placeholder="Item name"
                      />
                      {errors[`shipments.${index}.name`] && touched[`shipments.${index}.name`] && (
                        <span className="error-message">{errors[`shipments.${index}.name`]}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <input
                        type="number"
                        className={`input-field ${errors[`shipments.${index}.quantity`] && touched[`shipments.${index}.quantity`] ? 'error' : ''}`}
                        value={item.quantity}
                        onChange={(e) => handleShipmentChange(index, 'quantity', e.target.value)}
                        onBlur={() => setFieldTouched(`shipments.${index}.quantity`)}
                        placeholder="Quantity"
                        min="1"
                      />
                      {errors[`shipments.${index}.quantity`] && touched[`shipments.${index}.quantity`] && (
                        <span className="error-message">{errors[`shipments.${index}.quantity`]}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <input
                        type="number"
                        className={`input-field ${errors[`shipments.${index}.price`] && touched[`shipments.${index}.price`] ? 'error' : ''}`}
                        value={item.price}
                        onChange={(e) => handleShipmentChange(index, 'price', e.target.value)}
                        onBlur={() => setFieldTouched(`shipments.${index}.price`)}
                        placeholder="Price (₹)"
                        min="0"
                        step="0.01"
                      />
                      {errors[`shipments.${index}.price`] && touched[`shipments.${index}.price`] && (
                        <span className="error-message">{errors[`shipments.${index}.price`]}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label htmlFor="cargo-description" className="form-label">Cargo Description</label>
              <textarea
                id="cargo-description"
                className={`input-field ${errors['cargo.description'] && touched['cargo.description'] ? 'error' : ''}`}
                value={formData.cargo.description}
                onChange={(e) => handleInputChange('cargo', 'description', e.target.value)}
                onBlur={() => setFieldTouched('cargo.description')}
                placeholder="Provide details about your cargo"
              />
              {errors['cargo.description'] && touched['cargo.description'] && (
                <span className="error-message">{errors['cargo.description']}</span>
              )}
            </div>

            {/* Cargo Photo Upload */}
            <div className="form-group">
              <label htmlFor="cargo-photo" className="form-label">Cargo Photo (Optional)</label>
              <div className="file-upload-container">
                {!cargoPhotoPreview ? (
                  <div className="file-upload-area">
                    <input
                      type="file"
                      id="cargo-photo"
                      className="file-input"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleCargoPhotoChange}
                    />
                    <label htmlFor="cargo-photo" className="file-upload-label">
                      <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="upload-text">Click to upload cargo photo</span>
                      <span className="upload-hint">JPEG, PNG, GIF or WEBP (Max 5MB)</span>
                    </label>
                  </div>
                ) : (
                  <div className="file-preview-container">
                    <img src={cargoPhotoPreview} alt="Cargo preview" className="cargo-photo-preview" />
                    <button
                      type="button"
                      className="remove-photo-btn"
                      onClick={removeCargoPhoto}
                      aria-label="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <p className="form-hint">Upload a photo of your cargo to help transporters understand the shipment better</p>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="form-section-row">
            <div className="form-section form-section--half">
              <h2 className="section-title">Pricing & Bidding</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="max-price" className="form-label">Maximum Price</label>
                  <input
                    type="text"
                    id="max-price"
                    className={`input-field ${errors['cargo.maxPrice'] && touched['cargo.maxPrice'] ? 'error' : ''}`}
                    value={formData.cargo.maxPrice ? `₹${formData.cargo.maxPrice}` : ''}
                    onChange={(e) => handleInputChange('cargo', 'maxPrice', e.target.value)}
                    onBlur={() => setFieldTouched('cargo.maxPrice')}
                    placeholder={formData.transit.distance ? "Calculating..." : "Enter distance first"}
                    readOnly
                  />
                  <div className="form-info">
                    {formData.transit.distance ?
                      `Auto-calculated: ${formData.transit.distance} km × ${formData.transit.distance <= 1000 ? 30 : formData.transit.distance <= 2000 ? 28 : 25} rs/km`
                      : 'Fill in the Distance field above to auto-calculate the price'}
                  </div>
                  {errors['cargo.maxPrice'] && touched['cargo.maxPrice'] && (
                    <span className="error-message">{errors['cargo.maxPrice']}</span>
                  )}
                </div>
              </div>

              <div className="countdown-container">
                <div className="countdown-label">Bidding will end on</div>
                <div className="countdown-timer">{getBiddingEndTime()}</div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-submit">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              loading={loading}
            >
              Submit Order
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
}
