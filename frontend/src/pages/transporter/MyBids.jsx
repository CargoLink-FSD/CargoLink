import React from 'react';
import { useMyBids } from '../../hooks/useMyBids';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import '../../styles/Bid.css';

export default function MyBidsPage() {
  const { myBids, loading } = useMyBids();

  return (
    <>
      <Header />
      <div className="main-content-bid">
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">My Bids</h1>
          </div>
          {loading && <div style={{ padding: '1rem' }}>Loading...</div>}
          {!loading && myBids.length === 0 && (
            <div className="no-bids-message"><p>You have not placed any bids yet.</p></div>
          )}
          {!loading && myBids.length > 0 && (
            <table className="my-bids-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Pickup Location</th>
                  <th>Dropoff Location</th>
                  <th>Bid Amount ($)</th>
                  <th>Bid Time</th>
                  <th>Notes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myBids.map(bid => (
                  <tr key={bid._id}>
                    <td>{bid.order_id?._id || 'N/A'}</td>
                    <td>
                      {bid.order_id?.pickup 
                        ? `${bid.order_id.pickup.city}, ${bid.order_id.pickup.state}` 
                        : 'N/A'}
                    </td>
                    <td>
                      {bid.order_id?.delivery 
                        ? `${bid.order_id.delivery.city}, ${bid.order_id.delivery.state}` 
                        : 'N/A'}
                    </td>
                    <td>{bid.bid_amount}</td>
                    <td>{new Date(bid.createdAt).toLocaleString()}</td>
                    <td>{bid.notes || 'N/A'}</td>
                    <td>{bid.order_id?.status || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
