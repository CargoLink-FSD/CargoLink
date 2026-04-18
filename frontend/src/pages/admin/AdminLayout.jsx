import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    LogOut,
    Package,
    Ticket,
    Truck,
    Users,
    Banknote,
} from 'lucide-react';
import { logoutUser } from '../../store/slices/authSlice';
import './AdminLayout.css';

const NAV_ITEMS = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/orders', icon: Package, label: 'Orders' },
    { to: '/admin/fleet', icon: Truck, label: 'Fleet' },
    { to: '/admin/tickets', icon: Ticket, label: 'Tickets' },
    { to: '/admin/managers', icon: User, label: 'Managers' },
    { to: '/admin/cashouts', icon: Banknote, label: 'Cashouts' },
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
                        <span className="adm-logo-icon" aria-hidden="true">
                            <Truck size={20} />
                        </span>
                        {!collapsed && <span className="adm-logo-text">CargoLink</span>}
                    </div>
                    <button
                        type="button"
                        className="adm-collapse-btn"
                        onClick={() => setCollapsed(!collapsed)}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
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
                            <span className="adm-nav-icon" aria-hidden="true">
                                <item.icon size={18} />
                            </span>
                            {!collapsed && <span className="adm-nav-label">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="adm-sidebar-footer">
                    <button className="adm-logout-btn" onClick={handleLogout}>
                        <span className="adm-nav-icon" aria-hidden="true">
                            <LogOut size={18} />
                        </span>
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
