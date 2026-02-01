import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import http from '../../api/http';
import { formatCurrency } from '../../utils/currency';
import '../../pages/customer/CustomerOrders.css';
export default function OrderDetails(){
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load(){
      try{
        const data = await http.get(`/customer/order/${orderId}`);
        // backend returns { order }
        setOrder(data.order || data);
      }catch(err){
        setError(err.message || 'Failed to load order');
      }finally{setLoading(false)}
    }
    load();
  }, [orderId]);

  if(loading) return <div className="orders-container"><p>Loading...</p></div>
  if(error) return <div className="orders-container"><p className="error-state">{error}</p></div>
  if(!order) return <div className="orders-container"><p>No order found</p></div>

  // normalize fields (support legacy names)
  const id = order.orderId || order.orderId || order.id || order.shipment_id || order._id;
  const status = order.status;
  const pickupDate = order.pickup_date || order.scheduled_at || order.order_date;
  const pickupTime = order.pickup_time || '';
  const from = order.from || (order.pickup ? `${order.pickup.street || ''} ${order.pickup.city || ''}, ${order.pickup.state || ''}` : `${order.pickup_city || ''}, ${order.pickup_state || ''}`);
  const to = order.to || (order.delivery ? `${order.delivery.street || ''} ${order.delivery.city || ''}, ${order.delivery.state || ''}` : `${order.delivery_city || ''}, ${order.delivery_state || ''}`);
  const vehicleType = order.vehicleType || order.truck_type;
  const cargoType = order.cargoType || order.cargo_type || order.goods_type;
  const weight = order.weight;
  const price = order.price || order.final_price || order.max_price;
  const items = order.shipmentItems || order.shipments || [];
  const transporter = order.transporter || order.assigned_transporter_id || null;

  const handlePayNow = () => {
    // open backend paynow endpoint which renders payment success page
    window.open(`http://localhost:3000/customer/paynow?orderId=${id}`, '_blank');
  };

  const callTransporter = () => {
    if (!transporter || !transporter.primary_contact) return;
    window.location.href = `tel:${transporter.primary_contact}`;
  };

  const emailTransporter = () => {
    if (!transporter || !transporter.email) return;
    window.location.href = `mailto:${transporter.email}`;
  };

  return (
    <>
    <div className="orders-container">
      <div className="orders-header">
        <h1>Order Details <span style={{fontWeight:500,fontSize:'1rem', color:'#555'}}>#{id}</span></h1>
        <div style={{position:'absolute', right:24, top:28}}>Status: <strong style={{marginLeft:8}}>{status}</strong></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
        <div>
          <div className="order-card">
            <h3>Shipment Information</h3>
            <div style={{padding:'10px 0'}}>
              <div><small>Pickup Date & Time</small>
                <div style={{marginTop:8}}>{pickupDate ? new Date(pickupDate).toLocaleString() : 'Not specified'}{pickupTime ? ` • ${pickupTime}` : ''}</div>
              </div>

              <div style={{marginTop:14}}><small>Delivery ETA</small>
                <div style={{marginTop:8}}>{order.date || 'Not specified'}</div>
              </div>

              <div style={{marginTop:14}}><small>Pickup Location</small>
                <div style={{marginTop:8}}>{from}</div>
              </div>

              <div style={{marginTop:14}}><small>Delivery Location</small>
                <div style={{marginTop:8}}>{to}</div>
              </div>

              <div style={{marginTop:14}}><small>Cargo Description</small>
                <div style={{marginTop:8}}>{cargoType} - {items.length} items</div>
              </div>

              <div style={{marginTop:14}}><small>Weight</small>
                <div style={{marginTop:8}}>{weight || 'N/A'}</div>
              </div>

              <div style={{marginTop:14}}><small>Vehicle Assigned</small>
                <div style={{marginTop:8}}>{order.assignment ? order.assignment.vehicle_number || 'Assigned' : 'N/A'}</div>
              </div>

              <div style={{marginTop:14}}><small>Payment Amount</small>
                <div style={{marginTop:8}}>{formatCurrency(price)}</div>
              </div>
            </div>
          </div>

          <div className="order-card" style={{marginTop:18}}>
            <h3>Shipment Items</h3>
            <div style={{overflowX:'auto',marginTop:12}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'#f6f6f6'}}>
                    <th style={{textAlign:'left',padding:12}}>Item Name</th>
                    <th style={{textAlign:'left',padding:12}}>Quantity</th>
                    <th style={{textAlign:'left',padding:12}}>Price</th>
                    <th style={{textAlign:'left',padding:12}}>Delivery Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} style={{borderTop:'1px solid #eee'}}>
                      <td style={{padding:12}}>{it.name || it.itemName || it.description || 'Item'}</td>
                      <td style={{padding:12}}>{it.quantity || it.qty || it.count || '—'}</td>
                      <td style={{padding:12}}>{formatCurrency(it.price || it.bid_amount)}</td>
                      <td style={{padding:12}}>{it.delivery_status || it.status || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{marginTop:12,fontWeight:700}}>Total: {formatCurrency(price)}</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginTop:18}}>
            <div className="order-card">
              <h3>Live Tracking</h3>
              <div style={{height:220,display:'flex',alignItems:'center',justifyContent:'center',color:'#888'}}>Loading map...</div>
              <div style={{paddingTop:12}}><button className="btn btn-outline">View Route</button></div>
            </div>

            <div className="order-card">
              <h3>Chat</h3>
              <div style={{height:220}}></div>
              <div style={{marginTop:12}}>
                <Link to={`/chat/orders/${id}`} className="btn btn-primary">Open Chat</Link>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="order-card">
            <h3>Complete Delivery</h3>
            <div style={{padding:'14px 0'}}>
              <button className="btn btn-primary" onClick={handlePayNow}>Pay Now</button>
            </div>
          </div>

          <div className="order-card" style={{marginTop:18}}>
            <h3>Transporter Information</h3>
            <div style={{paddingTop:10}}>
              <div style={{fontSize:14,color:'#666'}}>Contact Person</div>
              <div style={{marginTop:6,fontWeight:700}}>{transporter ? transporter.name : 'N/A'}</div>

              <div style={{marginTop:12,fontSize:14,color:'#666'}}>Contact Phone</div>
              <div style={{marginTop:6}}>{transporter ? (transporter.primary_contact || transporter.contact || 'N/A') : 'N/A'}</div>

              <div style={{marginTop:12,fontSize:14,color:'#666'}}>Email</div>
              <div style={{marginTop:6}}>{transporter ? (transporter.email || transporter.contact_email) : 'N/A'}</div>

              <div style={{display:'flex',gap:10, marginTop:14}}>
                <button className="btn btn-primary" onClick={callTransporter}>Call Transporter</button>
                <button className="btn btn-outline" onClick={emailTransporter}>Email Transporter</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
