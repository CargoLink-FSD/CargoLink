import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logoutUser } from '../../store/slices/authSlice';
import './AdminLayout.css';

const NAV_ITEMS = [
    { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/admin/users', icon: '👥', label: 'Users' },
    { to: '/admin/orders', icon: '📦', label: 'Orders' },
    { to: '/admin/fleet', icon: '🚛', label: 'Fleet' },
    { to: '/admin/tickets', icon: '🎫', label: 'Tickets' },
    { to: '/admin/managers', icon: '👔', label: 'Managers' },
];

export default function AdminLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = () => {
        dispatch(logoutUser());
        navigate('/login');
    };

    return (
        <div className={`adm-layout ${collapsed ? 'collapsed' : ''}`}>
            {/* Sidebar */}
            <aside className="adm-sidebar">
                <div className="adm-sidebar-header">
                    <div className="adm-logo">
                        <span className="adm-logo-icon">🚚</span>
                        {!collapsed && <span className="adm-logo-text">CargoLink</span>}
                    </div>
                    <button className="adm-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
                        {collapsed ? '▶' : '◀'}
                    </button>
                </div>

                {!collapsed && <div className="adm-sidebar-badge">Admin Panel</div>}

                <nav className="adm-nav">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `adm-nav-item ${isActive ? 'active' : ''}`}
                            title={item.label}
                        >
                            <span className="adm-nav-icon">{item.icon}</span>
                            {!collapsed && <span className="adm-nav-label">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="adm-sidebar-footer">
                    <button className="adm-logout-btn" onClick={handleLogout}>
                        <span className="adm-nav-icon">🚪</span>
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="adm-main">
                <Outlet />
            </main>
        </div>
    );
}
