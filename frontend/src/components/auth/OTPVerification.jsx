import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../forms';
import './OTPVerification.css';

const OTPVerification = ({ 
  email, 
  onVerify, 
  onResend, 
  loading = false,
  error = null,
  purpose = 'signup' // 'signup' or 'forgot-password'
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only take the last digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (i < 6) newOtp[i] = digit;
        });
        setOtp(newOtp);
        if (digits.length > 0) {
          inputRefs.current[Math.min(digits.length, 5)]?.focus();
        }
      });
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');
    const newOtp = [...otp];
    digits.forEach((digit, i) => {
      if (i < 6) newOtp[i] = digit;
    });
    setOtp(newOtp);
    if (digits.length > 0) {
      inputRefs.current[Math.min(digits.length, 5)]?.focus();
    }
  };

  const handleVerify = () => {
    const otpString = otp.join('');
    if (otpString.length === 6) {
      onVerify(otpString);
    }
  };

  const handleResend = () => {
    setOtp(['', '', '', '', '', '']);
    setTimeLeft(60);
    setCanResend(false);
    onResend();
  };

  const otpComplete = otp.every(digit => digit !== '');

  return (
    <div className="otp-verification">
      <div className="otp-header">
        <h3>Verify Your Email</h3>
        <p className="otp-instruction">
          We've sent a 6-digit verification code to<br />
          <strong>{email}</strong>
        </p>
      </div>

      <div className="otp-inputs" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={`otp-input ${error ? 'otp-input-error' : ''}`}
            autoFocus={index === 0}
            disabled={loading}
          />
        ))}
      </div>

      {error && (
        <div className="otp-error">
          <span className="error-message">{error}</span>
        </div>
      )}

      <div className="otp-actions">
        <Button
          type="button"
          variant="primary"
          onClick={handleVerify}
          disabled={!otpComplete || loading}
          loading={loading}
          fullWidth
        >
          Verify OTP
        </Button>
      </div>

      <div className="otp-resend">
        {canResend ? (
          <button type="button" className="resend-link" onClick={handleResend} disabled={loading}>
            Didn't receive the code? <strong>Resend OTP</strong>
          </button>
        ) : (
          <p className="resend-timer">
            Resend OTP in <strong>{timeLeft}s</strong>
          </p>
        )}
      </div>

      <div className="otp-footer">
        <p className="otp-note">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 12H7V7h2v5zm0-6H7V4h2v2z"/>
          </svg>
          The OTP is valid for 10 minutes. Please do not share it with anyone.
        </p>
      </div>
    </div>
  );
};

export default OTPVerification;
