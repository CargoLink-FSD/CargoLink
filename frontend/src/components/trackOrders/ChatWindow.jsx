// src/components/trackOrder/ChatWindow.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sendChatMessage, fetchChatMessages, clearChat } from '../../store/slices/chatSlice';

const ChatWindow = ({ orderId, userType}) => {
  const dispatch = useDispatch();
  const chatWindowRef = useRef(null);
  const [message, setMessage] = useState('');
  
  const { messages, loading, error } = useSelector((state) => state.chat);

    dispatch(fetchChatMessages(orderId));


  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    try {
      await dispatch(sendChatMessage({ 
        orderId, 
        message: trimmedMessage, 
      })).unwrap();
      
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  console.log("messages: ", messages);
  

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (


    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Chat</h2>
      </div>
      <div className="chat-container">
        <div className="chat-window" id="chat-window" ref={chatWindowRef}>
          {loading && messages.length === 0 ? (
            <div className="chat-loading">
              <div className="loader"></div>
              <p>Loading messages...</p>
            </div>
          ) : (
            <div className="chat-messages">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.senderType === userType ? 'sent' : 'received'}`}
                >
                  <div className="message-bubble">{msg.content}</div>
                  <div className="message-time">{formatTime(msg.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="chat-error">
          <small>Error: {error}</small>
        </div>
      )}
      <div className="chat-input">
        <input
          type="text"
          id="chat-input"
          placeholder="Type your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button className="btn btn-primary" onClick={handleSendMessage}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;