import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import ChatWindow from '../../components/trackOrders/ChatWindow';
import '../../styles/TrackOrder.css';
import './TransporterChat.css';

export default function TransporterChat() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const userRole = useSelector((state) => state.auth?.user?.role) || 'transporter';

  return (
    <>
      <Header />
      <div className="track-order-page transporter-chat-page">
        <div className="transporter-chat-container">
          <div className="transporter-chat-header">
            <button className="transporter-chat-back" onClick={() => navigate('/transporter/orders')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Orders
            </button>
            <div>
              <h1>Order Chat</h1>
              <p>Order #{orderId?.slice(-8) || orderId}</p>
            </div>
          </div>

          <ChatWindow orderId={orderId} userType={userRole} />
        </div>
      </div>
      <Footer />
    </>
  );
}
