import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNotification } from '../../context/NotificationContext';
import { registerManager } from '../../api/manager';
import tokenStorage from '../../utils/token';
import { restoreSession } from '../../store/slices/authSlice';
import Header from '../../components/common/Header';
import './ManagerLogin.css';

export default function ManagerRegister() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { showError, showSuccess } = useNotification();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [invitationCode, setInvitationCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim() || !email.trim() || !password.trim() || !invitationCode.trim()) {
            showError('All fields are required');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const data = await registerManager({ name, email, password, invitationCode: invitationCode.trim() });

            // Store tokens and restore session
            if (data.accessToken && data.refreshToken) {
                tokenStorage.setTokens(data.accessToken, data.refreshToken);
                dispatch(restoreSession());
            }

            showSuccess('Registration successful! Welcome aboard.');
            setTimeout(() => navigate('/manager/dashboard', { replace: true }), 500);
        } catch (err) {
            showError(err?.message || 'Registration failed. Please check your invitation code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Header />
            <div className="manager-login-container">
                <div className="manager-login-card" style={{ maxWidth: 480 }}>
                    <div className="manager-login-header">
                        <div className="manager-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h1>Manager Registration</h1>
                        <p>Register with your invitation code from admin</p>
                    </div>

                    <form onSubmit={handleSubmit} className="manager-login-form">
                        <div className="form-group">
                            <label htmlFor="invitationCode">Invitation Code *</label>
                            <input
                                type="text"
                                id="invitationCode"
                                value={invitationCode}
                                onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                                placeholder="Enter invitation code from admin"
                                style={{ letterSpacing: '2px', fontFamily: 'monospace', fontWeight: 700 }}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="name">Full Name *</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email *</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password *</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a password"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="toggle-password-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password *</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your password"
                                autoComplete="new-password"
                            />
                        </div>

                        <button type="submit" className="manager-login-btn" disabled={loading}>
                            {loading ? 'Registering...' : 'Register'}
                        </button>

                        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.88rem', color: '#64748b' }}>
                            Already registered?{' '}
                            <Link to="/manager/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                                Sign in here
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </>
    );
}
