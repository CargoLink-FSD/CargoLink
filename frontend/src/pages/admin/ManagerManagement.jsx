import React, { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../../context/NotificationContext';
import {
    getAllManagers,
    generateInvitationCode,
    getAllInvitationCodes,
    updateManagerStatus,
    updateManagerCategories,
    deleteManager,
    getThresholdConfigs,
    updateThresholdConfig,
    resetThresholdAlert,
    getTicketVolumeByCategory,
} from '../../api/adminManager';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './AdminStyles.css';
import './ManagerManagement.css';

const ALL_CATEGORIES = [
    'Shipment Issue',
    'Payment Issue',
    'Transporter Complaint',
    'Customer Complaint',
    'Technical Issue',
    'Account Issue',
    'Other',
];

const ALL_VERIFICATION_CATEGORIES = [
    'transporter_verification',
    'driver_verification',
    'vehicle_verification',
];

const verifCatLabel = (cat) => cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

export default function ManagerManagement() {
    const { showNotification } = useNotification();
    const [activeTab, setActiveTab] = useState('managers');
    const [managers, setManagers] = useState([]);
    const [stats, setStats] = useState({});
    const [invitations, setInvitations] = useState([]);
    const [thresholds, setThresholds] = useState([]);
    const [ticketVolume, setTicketVolume] = useState([]);
    const [loading, setLoading] = useState(true);

    // Invite modal state
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteCategories, setInviteCategories] = useState([]);
    const [inviteVerifCategories, setInviteVerifCategories] = useState([]);
    const [inviteExpiry, setInviteExpiry] = useState(24);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');

    // Threshold edit modal
    const [editThreshold, setEditThreshold] = useState(null);
    const [thresholdValue, setThresholdValue] = useState('');

    // Category edit modal
    const [editCatManager, setEditCatManager] = useState(null);
    const [editCats, setEditCats] = useState([]);
    const [editVerifCats, setEditVerifCats] = useState([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [mgrData, invData, threshData, volData] = await Promise.all([
                getAllManagers(),
                getAllInvitationCodes(),
                getThresholdConfigs(),
                getTicketVolumeByCategory(),
            ]);
            setManagers(mgrData.managers || []);
            setStats(mgrData.stats || {});
            setInvitations(invData || []);
            setThresholds(threshData || []);
            setTicketVolume(volData || []);
        } catch (err) {
            showNotification({ message: 'Failed to load manager data', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleGenerateCode = async () => {
        if (inviteCategories.length === 0) {
            showNotification({ message: 'Select at least one category', type: 'error' });
            return;
        }
        setInviteLoading(true);
        try {
            const data = await generateInvitationCode({
                categories: inviteCategories,
                verificationCategories: inviteVerifCategories,
                expiresInHours: inviteExpiry,
            });
            setGeneratedCode(data.code);
            showNotification({ message: 'Invitation code generated!', type: 'success' });
            loadData();
        } catch (err) {
            showNotification({ message: err?.message || 'Failed to generate code', type: 'error' });
        } finally {
            setInviteLoading(false);
        }
    };

    const handleToggleStatus = async (mgr) => {
        const newStatus = mgr.status === 'active' ? 'inactive' : 'active';
        try {
            await updateManagerStatus(mgr._id, newStatus);
            showNotification({ message: `Manager ${newStatus === 'active' ? 'activated' : 'deactivated'}`, type: 'success' });
            loadData();
        } catch (err) {
            showNotification({ message: err?.message || 'Failed to update status', type: 'error' });
        }
    };

    const handleDelete = async (mgr) => {
        if (!window.confirm(`Are you sure you want to delete manager "${mgr.name}"?`)) return;
        try {
            await deleteManager(mgr._id);
            showNotification({ message: 'Manager deleted', type: 'success' });
            loadData();
        } catch (err) {
            showNotification({ message: err?.message || 'Failed to delete manager', type: 'error' });
        }
    };

    const handleUpdateCategories = async () => {
        if (!editCatManager) return;
        try {
            await updateManagerCategories(editCatManager._id, editCats, editVerifCats);
            showNotification({ message: 'Categories updated', type: 'success' });
            setEditCatManager(null);
            loadData();
        } catch (err) {
            showNotification({ message: err?.message || 'Failed to update categories', type: 'error' });
        }
    };

    const handleUpdateThreshold = async () => {
        if (!editThreshold) return;
        try {
            await updateThresholdConfig(editThreshold.category, parseInt(thresholdValue));
            showNotification({ message: 'Threshold updated', type: 'success' });
            setEditThreshold(null);
            loadData();
        } catch (err) {
            showNotification({ message: err?.message || 'Failed to update threshold', type: 'error' });
        }
    };

    const handleResetAlert = async (category) => {
        try {
            await resetThresholdAlert(category);
            showNotification({ message: 'Alert reset', type: 'success' });
            loadData();
        } catch (err) {
            showNotification({ message: err?.message || 'Failed to reset alert', type: 'error' });
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showNotification({ message: 'Copied to clipboard!', type: 'success' });
    };

    if (loading) {
        return (
            <><Header /><div className="admin-container"><div className="adm-loading"><div className="adm-spinner" /><p>Loading manager data...</p></div></div><Footer /></>
        );
    }

    return (
        <>
            <Header />
            <div className="admin-container">
                <div className="adm-page-header">
                    <h1 className="adm-page-title">Manager Management</h1>
                    <p className="adm-page-subtitle">Manage support managers, invitation codes, and alert thresholds</p>
                </div>

                {/* Stats Row */}
                <div className="adm-stats-row">
                    <div className="adm-stat-card purple">
                        <span className="adm-stat-label">Total Managers</span>
                        <span className="adm-stat-value">{stats.total || 0}</span>
                    </div>
                    <div className="adm-stat-card blue">
                        <span className="adm-stat-label">Active</span>
                        <span className="adm-stat-value">{stats.active || 0}</span>
                    </div>
                    <div className="adm-stat-card orange">
                        <span className="adm-stat-label">Open Tickets</span>
                        <span className="adm-stat-value">{stats.totalOpenTickets || 0}</span>
                    </div>
                    <div className="adm-stat-card green">
                        <span className="adm-stat-label">Total Resolved</span>
                        <span className="adm-stat-value">{stats.totalTicketsHandled || 0}</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mgmt-tabs">
                    <button className={`mgmt-tab ${activeTab === 'managers' ? 'active' : ''}`} onClick={() => setActiveTab('managers')}>
                        Managers
                    </button>
                    <button className={`mgmt-tab ${activeTab === 'invitations' ? 'active' : ''}`} onClick={() => setActiveTab('invitations')}>
                        Invitation Codes
                    </button>
                    <button className={`mgmt-tab ${activeTab === 'thresholds' ? 'active' : ''}`} onClick={() => setActiveTab('thresholds')}>
                        Alert Thresholds
                    </button>
                </div>

                {/* ─── Managers Tab ───────────────────────────────── */}
                {activeTab === 'managers' && (
                    <div className="adm-card">
                        <div className="mgmt-card-header">
                            <h3>All Managers</h3>
                            <button className="adm-btn adm-btn-primary" onClick={() => { setShowInviteModal(true); setGeneratedCode(''); setInviteCategories([]); setInviteVerifCategories([]); }}>
                                + Generate Invitation Code
                            </button>
                        </div>
                        <div className="adm-table-wrap">
                            <table className="adm-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Ticket Categories</th>
                                        <th>Verification</th>
                                        <th>Status</th>
                                        <th>Open Tickets</th>
                                        <th>Resolved</th>
                                        <th>Default</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {managers.length === 0 ? (
                                        <tr><td colSpan={10} className="adm-empty">No managers</td></tr>
                                    ) : managers.map(mgr => (
                                        <tr key={mgr._id}>
                                            <td style={{ fontWeight: 600 }}>{mgr.name}</td>
                                            <td>{mgr.email}</td>
                                            <td>
                                                <div className="cat-chips">
                                                    {mgr.categories?.map(c => (
                                                        <span key={c} className="cat-chip">{c}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="cat-chips">
                                                    {mgr.verificationCategories?.map(c => (
                                                        <span key={c} className="cat-chip verif-chip">{verifCatLabel(c)}</span>
                                                    ))}
                                                    {(!mgr.verificationCategories || mgr.verificationCategories.length === 0) && (
                                                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`adm-badge ${mgr.status === 'active' ? 'green' : 'red'}`}>
                                                    {mgr.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{mgr.openTicketCount || 0}</td>
                                            <td style={{ textAlign: 'center' }}>{mgr.totalResolved || 0}</td>
                                            <td style={{ textAlign: 'center' }}>{mgr.isDefault ? '✓' : '—'}</td>
                                            <td>{formatDate(mgr.createdAt)}</td>
                                            <td>
                                                <div className="mgmt-actions">
                                                    <button
                                                        className={`adm-btn adm-btn-sm ${mgr.status === 'active' ? 'adm-btn-outline' : 'adm-btn-primary'}`}
                                                        onClick={() => handleToggleStatus(mgr)}
                                                    >
                                                        {mgr.status === 'active' ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button
                                                        className="adm-btn adm-btn-sm adm-btn-outline"
                                                        onClick={() => { setEditCatManager(mgr); setEditCats([...mgr.categories]); setEditVerifCats([...(mgr.verificationCategories || [])]); }}
                                                    >
                                                        Edit Categories
                                                    </button>
                                                    {!mgr.isDefault && (
                                                        <button
                                                            className="adm-btn adm-btn-sm adm-btn-danger"
                                                            onClick={() => handleDelete(mgr)}
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ─── Invitations Tab ────────────────────────────── */}
                {activeTab === 'invitations' && (
                    <div className="adm-card">
                        <div className="mgmt-card-header">
                            <h3>Invitation Codes</h3>
                            <button className="adm-btn adm-btn-primary" onClick={() => { setShowInviteModal(true); setGeneratedCode(''); setInviteCategories([]); }}>
                                + Generate New Code
                            </button>
                        </div>
                        <div className="adm-table-wrap">
                            <table className="adm-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Categories</th>
                                        <th>Status</th>
                                        <th>Used By</th>
                                        <th>Expires At</th>
                                        <th>Created</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invitations.length === 0 ? (
                                        <tr><td colSpan={7} className="adm-empty">No invitation codes</td></tr>
                                    ) : invitations.map(inv => {
                                        const expired = new Date(inv.expiresAt) < new Date();
                                        const statusLabel = inv.used ? 'Used' : expired ? 'Expired' : 'Active';
                                        const statusColor = inv.used ? 'blue' : expired ? 'red' : 'green';
                                        return (
                                            <tr key={inv._id}>
                                                <td>
                                                    <code className="invite-code">{inv.code}</code>
                                                    <button className="copy-btn" onClick={() => copyToClipboard(inv.code)} title="Copy">📋</button>
                                                </td>
                                                <td>
                                                    <div className="cat-chips">
                                                        {inv.categories?.map(c => <span key={c} className="cat-chip">{c}</span>)}
                                                    </div>
                                                </td>
                                                <td><span className={`adm-badge ${statusColor}`}>{statusLabel}</span></td>
                                                <td>{inv.usedBy ? `${inv.usedBy.name} (${inv.usedBy.email})` : '—'}</td>
                                                <td>{formatDate(inv.expiresAt)}</td>
                                                <td>{formatDate(inv.createdAt)}</td>
                                                <td>
                                                    {!inv.used && !expired && (
                                                        <button className="adm-btn adm-btn-sm adm-btn-outline" onClick={() => copyToClipboard(inv.code)}>
                                                            Copy Code
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ─── Thresholds Tab ─────────────────────────────── */}
                {activeTab === 'thresholds' && (
                    <div className="adm-card">
                        <div className="mgmt-card-header">
                            <h3>Alert Thresholds (Tickets per Hour)</h3>
                        </div>

                        {/* Ticket volume chart */}
                        <div className="volume-grid">
                            {ALL_CATEGORIES.map(cat => {
                                const vol = ticketVolume.find(v => v.category === cat);
                                const threshold = thresholds.find(t => t.category === cat);
                                const count = vol?.count || 0;
                                const max = threshold?.maxTicketsPerHour || 10;
                                const pct = Math.min((count / max) * 100, 100);
                                const isAlert = threshold?.alertSent;
                                return (
                                    <div key={cat} className={`volume-card ${isAlert ? 'alert' : ''}`}>
                                        <div className="volume-header">
                                            <span className="volume-cat">{cat}</span>
                                            {isAlert && <span className="alert-badge">⚠️ ALERT</span>}
                                        </div>
                                        <div className="volume-bar-container">
                                            <div className="volume-bar" style={{ width: `${pct}%`, backgroundColor: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981' }} />
                                        </div>
                                        <div className="volume-info">
                                            <span>{count} / {max} tickets/hr</span>
                                            <div className="volume-actions">
                                                <button
                                                    className="adm-btn adm-btn-sm adm-btn-outline"
                                                    onClick={() => { setEditThreshold(threshold || { category: cat, maxTicketsPerHour: max }); setThresholdValue(String(max)); }}
                                                >
                                                    Edit
                                                </button>
                                                {isAlert && (
                                                    <button
                                                        className="adm-btn adm-btn-sm adm-btn-primary"
                                                        onClick={() => handleResetAlert(cat)}
                                                    >
                                                        Reset Alert
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─── Generate Invite Modal ──────────────────────── */}
                {showInviteModal && (
                    <div className="adm-modal-overlay" onClick={() => setShowInviteModal(false)}>
                        <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                            <div className="adm-modal-header">
                                <h3>Generate Invitation Code</h3>
                                <button className="adm-modal-close" onClick={() => setShowInviteModal(false)}>&times;</button>
                            </div>
                            <div className="adm-modal-body">
                                {generatedCode ? (
                                    <div className="generated-code-box">
                                        <p>Share this code with the new manager:</p>
                                        <div className="code-display">
                                            <code>{generatedCode}</code>
                                            <button className="copy-btn-large" onClick={() => copyToClipboard(generatedCode)}>📋 Copy</button>
                                        </div>
                                        <p className="code-note">This code expires in {inviteExpiry} hours and can be used once.</p>
                                        <button className="adm-btn adm-btn-primary" onClick={() => setShowInviteModal(false)} style={{ marginTop: 16 }}>Done</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="form-field">
                                            <label>Ticket Categories for this manager *</label>
                                            <div className="cat-checkbox-grid">
                                                {ALL_CATEGORIES.map(cat => (
                                                    <label key={cat} className="cat-checkbox">
                                                        <input
                                                            type="checkbox"
                                                            checked={inviteCategories.includes(cat)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setInviteCategories(prev => [...prev, cat]);
                                                                } else {
                                                                    setInviteCategories(prev => prev.filter(c => c !== cat));
                                                                }
                                                            }}
                                                        />
                                                        <span>{cat}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Verification Categories (optional)</label>
                                            <div className="cat-checkbox-grid">
                                                {ALL_VERIFICATION_CATEGORIES.map(cat => (
                                                    <label key={cat} className="cat-checkbox">
                                                        <input
                                                            type="checkbox"
                                                            checked={inviteVerifCategories.includes(cat)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setInviteVerifCategories(prev => [...prev, cat]);
                                                                } else {
                                                                    setInviteVerifCategories(prev => prev.filter(c => c !== cat));
                                                                }
                                                            }}
                                                        />
                                                        <span>{verifCatLabel(cat)}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Expiry (hours)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="168"
                                                value={inviteExpiry}
                                                onChange={e => setInviteExpiry(Number(e.target.value))}
                                                className="adm-input"
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                            <button className="adm-btn adm-btn-outline" onClick={() => setShowInviteModal(false)}>Cancel</button>
                                            <button className="adm-btn adm-btn-primary" onClick={handleGenerateCode} disabled={inviteLoading}>
                                                {inviteLoading ? 'Generating...' : 'Generate Code'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Edit Categories Modal ─────────────────────── */}
                {editCatManager && (
                    <div className="adm-modal-overlay" onClick={() => setEditCatManager(null)}>
                        <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                            <div className="adm-modal-header">
                                <h3>Edit Categories — {editCatManager.name}</h3>
                                <button className="adm-modal-close" onClick={() => setEditCatManager(null)}>&times;</button>
                            </div>
                            <div className="adm-modal-body">
                                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Ticket Categories</label>
                                <div className="cat-checkbox-grid">
                                    {ALL_CATEGORIES.map(cat => (
                                        <label key={cat} className="cat-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={editCats.includes(cat)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setEditCats(prev => [...prev, cat]);
                                                    } else {
                                                        setEditCats(prev => prev.filter(c => c !== cat));
                                                    }
                                                }}
                                            />
                                            <span>{cat}</span>
                                        </label>
                                    ))}
                                </div>
                                <label style={{ fontWeight: 600, marginBottom: 8, marginTop: 16, display: 'block' }}>Verification Categories</label>
                                <div className="cat-checkbox-grid">
                                    {ALL_VERIFICATION_CATEGORIES.map(cat => (
                                        <label key={cat} className="cat-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={editVerifCats.includes(cat)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setEditVerifCats(prev => [...prev, cat]);
                                                    } else {
                                                        setEditVerifCats(prev => prev.filter(c => c !== cat));
                                                    }
                                                }}
                                            />
                                            <span>{verifCatLabel(cat)}</span>
                                        </label>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                    <button className="adm-btn adm-btn-outline" onClick={() => setEditCatManager(null)}>Cancel</button>
                                    <button className="adm-btn adm-btn-primary" onClick={handleUpdateCategories}>Save Changes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Edit Threshold Modal ───────────────────────── */}
                {editThreshold && (
                    <div className="adm-modal-overlay" onClick={() => setEditThreshold(null)}>
                        <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                            <div className="adm-modal-header">
                                <h3>Edit Threshold — {editThreshold.category}</h3>
                                <button className="adm-modal-close" onClick={() => setEditThreshold(null)}>&times;</button>
                            </div>
                            <div className="adm-modal-body">
                                <div className="form-field">
                                    <label>Max Tickets Per Hour</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={thresholdValue}
                                        onChange={e => setThresholdValue(e.target.value)}
                                        className="adm-input"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                    <button className="adm-btn adm-btn-outline" onClick={() => setEditThreshold(null)}>Cancel</button>
                                    <button className="adm-btn adm-btn-primary" onClick={handleUpdateThreshold}>Update</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
}
