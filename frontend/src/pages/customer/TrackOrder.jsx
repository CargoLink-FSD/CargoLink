import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import http from '../../api/http';
import '../../pages/customer/CustomerOrders.css';

export default function TrackOrder(){
  const { id } = useParams();
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);

  useEffect(()=>{
    async function load(){
      try{
        const res = await http.get(`/customer/track/${id}`);
        setData(res.order || res);
      }catch(err){setError(err.message)}finally{setLoading(false)}
    }
    load();
  },[id]);

  if(loading) return <div className="orders-container"><p>Loading tracking info...</p></div>
  if(error) return <div className="orders-container"><p className="error-state">{error}</p></div>
  if(!data) return <div className="orders-container"><p>No tracking data</p></div>

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h1>Track Order</h1>
      </div>

      <div className="order-card">
        <div className="order-header">
          <div>
            <h3>Order</h3>
            <div className="order-id">#{data.id || data.orderId || data.orderId}</div>
            <div className="date">{data.pickupDate || data.pickup_date || data.pickup_date}</div>
          </div>
          <div style={{marginLeft:'auto'}}>
            <span className={`status-badge ${String(data.status || '').toLowerCase().replace(/\s+/g,'-')}`}>{data.status}</span>
          </div>
        </div>

        <div className="order-details">
          <div className="route-box">
            <div className="route-left">
              <span className="icon">📍</span>
              <div className="route-text">
                <div className="from">{data.pickupLocation || data.from || 'N/A'}</div>
                <div className="to">{data.deliveryLocation || data.to || 'N/A'}</div>
              </div>
            </div>
            <div className="route-right">
              <div className="distance">{data.distance ? `${data.distance} km` : '—'}</div>
              <div className="scheduled" style={{marginTop:6}}>{data.pickupDate || data.date || ''}</div>
            </div>
          </div>

          <div style={{marginTop:12}}>
            <strong>Assigned Vehicle:</strong> {data.vehicleAssigned || data.assignment?.vehicle_number || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}
