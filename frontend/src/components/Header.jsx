import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Ticket, PlusCircle, User, LogOut, Shield } from 'lucide-react';
import Button from './Button';
import './Header.css';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, [location]);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const isActive = (path) => location.pathname === path ? 'active' : '';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/');
        window.location.reload();
    };

    return (
        <header className="punk-header">
            <div className="container header-content">
                <Link to="/" className="logo">
                    Winners
                </Link>

                {/* Desktop Navigation */}
                <nav className="desktop-nav">
                    <Link to="/" className={`nav-link ${isActive('/')}`}>Inicio</Link>
                    <Link to="/rifas" className={`nav-link ${isActive('/rifas')}`}>Explorar Rifas</Link>
                    {user && <Link to="/crear" className={`nav-link ${isActive('/crear')}`}>Crear Rifa</Link>}
                    {user?.role === 'ADMIN' && (
                        <Link to="/admin" className={`nav-link ${isActive('/admin')}`}>
                            <Shield size={16} /> Admin
                        </Link>
                    )}
                </nav>

                <div className="header-actions">
                    {user ? (
                        <div className="user-menu">
                            <span className="user-name">{user.name}</span>
                            <button onClick={handleLogout} className="logout-btn">
                                <LogOut size={18} /> Salir
                            </button>
                        </div>
                    ) : (
                        <Link to="/login">
                            <Button variant="secondary" className="small-btn">Ingresar</Button>
                        </Link>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button className="mobile-menu-btn" onClick={toggleMenu}>
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Navigation overlay */}
            {isMenuOpen && (
                <div className="mobile-nav">
                    <Link to="/" onClick={toggleMenu} className="mobile-link">
                        Inicio
                    </Link>
                    <Link to="/rifas" onClick={toggleMenu} className="mobile-link">
                        <Ticket size={20} /> Explorar
                    </Link>
                    {user && (
                        <Link to="/crear" onClick={toggleMenu} className="mobile-link">
                            <PlusCircle size={20} /> Crear Rifa
                        </Link>
                    )}
                    {user?.role === 'ADMIN' && (
                        <Link to="/admin" onClick={toggleMenu} className="mobile-link">
                            <Shield size={20} /> Admin
                        </Link>
                    )}
                    {user ? (
                        <button onClick={handleLogout} className="mobile-link logout-mobile">
                            <LogOut size={20} /> Salir ({user.name})
                        </button>
                    ) : (
                        <Link to="/login" onClick={toggleMenu} className="mobile-link">
                            <User size={20} /> Ingresar
                        </Link>
                    )}
                </div>
            )}
        </header>
    );
};

export default Header;
