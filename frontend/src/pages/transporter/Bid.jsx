import React from 'react';
import { useBids } from '../../hooks/useBids';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import '../../styles/Bid.css';

export default function BidPage() {
  const {
    loading,
    submitting,
    filters,
    filteredOrders,
    handleFilterChange,
    placeBid,
    loadOrders,
  } = useBids();

  // Calculate bidding end time (2 days before scheduled pickup)
  const getBiddingEndTime = (scheduledAt) => {
    if (!scheduledAt) return 'N/A';
    const pickupDate = new Date(scheduledAt);
    const biddingEndDate = new Date(pickupDate);
    biddingEndDate.setDate(pickupDate.getDate() - 2);

    return biddingEndDate.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate time remaining until bidding closes
  const getTimeRemaining = (scheduledAt) => {
    if (!scheduledAt) return '';
    const pickupDate = new Date(scheduledAt);
    const biddingEndDate = new Date(pickupDate);
    biddingEndDate.setDate(pickupDate.getDate() - 2);

    const now = new Date();
    const diff = biddingEndDate - now;

    if (diff <= 0) return 'Closed';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${minutes}m`;
    }
  };

  return (
    <>
      <Header />
      <div className="main-content-bid">
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">Available Orders</h1>
            <button className="btn btn-primary" onClick={loadOrders} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <section className="filter-section">
            <h2>Filter Orders</h2>
            <div className="filter-controls">
              <div className="filter-control">
                <label htmlFor="location">Location</label>
                <select id="location" name="location" value={filters.location} onChange={handleFilterChange}>
                  <option value="">All Locations</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Pune">Pune</option>
                  <option value="Delhi">Delhi</option>
                </select>
              </div>
              <div className="filter-control">
                <label htmlFor="vehicleType">Vehicle Type</label>
                <select id="vehicle-type" name="vehicleType" value={filters.vehicleType} onChange={handleFilterChange}>
                  <option value="">All Types</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                  <option value="tanker">Tanker</option>
                  <option value="heavyload">Heavy Load</option>
                  <option value="refrigerated">Refrigerated</option>
                  <option value="flatbed">Flatbed</option>
                </select>
              </div>
              <div className="filter-control">
                <label htmlFor="minPrice">Min Price ($)</label>
                <input type="number" id="price-min" name="minPrice" value={filters.minPrice} onChange={handleFilterChange} placeholder="Minimum price" />
              </div>
              <div className="filter-control">
                <label htmlFor="maxPrice">Max Price ($)</label>
                <input type="number" id="price-max" name="maxPrice" value={filters.maxPrice} onChange={handleFilterChange} placeholder="Maximum price" />
              </div>
              <div className="filter-control">
                <label>&nbsp;</label>
                <button className="btn btn-primary" onClick={() => setFilters(f => ({ ...f }))}>Apply Filters</button>
              </div>
            </div>
          </section>
          {loading && <div style={{ padding: '2rem', textAlign: 'center' }}>Loading available orders...</div>}
          {!loading && filteredOrders.length === 0 && <div className="no-bids-message"><p>No available bids at this time.</p></div>}
          <section className="bid-grid" style={{ display: filteredOrders.length ? 'grid' : 'none' }}>
            {filteredOrders.map((bid, index) => (
              <div className="bid-card" key={bid._id} id={`bid-card-${index}`}>
                <div className="bid-header">
                  <div className="bid-price" data-original-price={bid.max_price}>${bid.max_price}</div>
                  <div className="bid-timer">{getTimeRemaining(bid.scheduled_at)}</div>
                </div>
                <div className="bid-body">
                  <div className="bid-details">
                    <div className="bid-detail"><span className="detail-label">Order ID:</span><span>{bid._id}</span></div>
                    <div className="bid-detail"><span className="detail-label">Scheduled Date:</span><span>{new Date(bid.scheduled_at).toLocaleDateString()}</span></div>
                    <div className="bid-detail"><span className="detail-label">Scheduled Time:</span><span>{new Date(bid.scheduled_at).toLocaleTimeString()}</span></div>
                    <div className="bid-detail"><span className="detail-label">Bidding Ends:</span><span style={{ color: '#e67e22', fontWeight: '600' }}>{getBiddingEndTime(bid.scheduled_at)}</span></div>
                    <div className="bid-detail"><span className="detail-label">Pickup:</span><span>{bid.pickup?.city}, {bid.pickup?.state}</span></div>
                    <div className="bid-detail"><span className="detail-label">Delivery:</span><span>{bid.delivery?.city}, {bid.delivery?.state}</span></div>
                    <div className="bid-detail"><span className="detail-label">Distance:</span><span>{bid.distance} km</span></div>
                    <div className="bid-detail"><span className="detail-label">Truck Type:</span><span>{bid.truck_type}</span></div>
                    <div className="bid-detail"><span className="detail-label">Weight:</span><span>{bid.weight} kg</span></div>
                    <div className="bid-detail"><span className="detail-label">Goods Type:</span><span>{bid.goods_type}</span></div>
                  </div>
                  <div className="bid-form">
                    <label htmlFor={`bid-amount-${index}`}>Your Bid Amount ($)</label>
                    <input type="number" id={`bid-amount-${index}`} placeholder="Enter your bid" />
                    <label htmlFor={`notes-${index}`}>Notes (Optional)</label>
                    <textarea id={`notes-${index}`} rows={2} placeholder="Add any notes about your bid" />
                    <div className="bid-actions">
                      <a href={`/transporter/orders/${bid._id}`} className="btn btn-secondary">More Info</a>
                      {bid.already_bid ? (
                        <button className="btn" disabled>Bid Placed</button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          onClick={() => placeBid(index, bid._id)}
                          disabled={submitting}
                        >
                          {submitting ? 'Submitting...' : 'Submit Bid'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
