import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Shield, Zap, Users, TrendingUp, Award } from 'lucide-react';
import WinnersLogo from '../components/WinnersLogo';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="home-page">
            {/* Header/Navbar */}
            <header className="home-header">
                <div className="header-container">
                    <WinnersLogo size="medium" />
                    <nav className="nav-links">
                        <a href="#inicio">Inicio</a>
                        <a href="#caracteristicas">Características</a>
                        <a href="#precios">Precios</a>
                    </nav>
                    <div className="header-actions">
                        <button className="btn-login" onClick={() => navigate('/login')}>
                            Ingresar
                        </button>
                        <button className="btn-signup" onClick={() => navigate('/crear')}>
                            Crear Rifa
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero-section" id="inicio">
                <div className="hero-container">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            Crea y gestiona rifas <br />
                            <span className="hero-highlight">digitales</span> de forma profesional
                        </h1>
                        <p className="hero-description">
                            La plataforma más completa para organizar sorteos y rifas online.
                            Segura, fácil de usar y con todas las herramientas que necesitas.
                        </p>
                        <div className="hero-buttons">
                            <button className="btn-primary-large" onClick={() => navigate('/crear')}>
                                <Ticket size={20} />
                                Crear mi primera rifa
                            </button>
                            <button className="btn-outline-large" onClick={() => navigate('/demo')}>
                                Ver demostración
                            </button>
                        </div>
                        <div className="hero-stats">
                            <div className="stat">
                                <p className="stat-number">10,000+</p>
                                <p className="stat-label">Rifas creadas</p>
                            </div>
                            <div className="stat">
                                <p className="stat-number">50,000+</p>
                                <p className="stat-label">Usuarios activos</p>
                            </div>
                            <div className="stat">
                                <p className="stat-number">99.9%</p>
                                <p className="stat-label">Satisfacción</p>
                            </div>
                        </div>
                    </div>
                    <div className="hero-image">
                        <div className="floating-card card-1">
                            <Ticket size={32} className="card-icon" />
                            <p className="card-title">Talonario Digital</p>
                        </div>
                        <div className="floating-card card-2">
                            <Award size={32} className="card-icon" />
                            <p className="card-title">Sorteo Automático</p>
                        </div>
                        <div className="floating-card card-3">
                            <TrendingUp size={32} className="card-icon" />
                            <p className="card-title">Estadísticas en Tiempo Real</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section" id="caracteristicas">
                <div className="features-container">
                    <div className="section-header">
                        <h2 className="section-title">Todo lo que necesitas en un solo lugar</h2>
                        <p className="section-subtitle">
                            Herramientas profesionales para gestionar tus rifas de principio a fin
                        </p>
                    </div>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon-wrapper">
                                <Zap className="feature-icon" />
                            </div>
                            <h3 className="feature-title">Creación Rápida</h3>
                            <p className="feature-description">
                                Configura tu rifa en menos de 2 minutos. Solo necesitas el título, precio y cantidad de números.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper">
                                <Ticket className="feature-icon" />
                            </div>
                            <h3 className="feature-title">Talonario Digital</h3>
                            <p className="feature-description">
                                Tus participantes pueden ver y seleccionar números en tiempo real desde cualquier dispositivo.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper">
                                <Shield className="feature-icon" />
                            </div>
                            <h3 className="feature-title">100% Seguro</h3>
                            <p className="feature-description">
                                Sorteos justos y transparentes con verificación automática de ganadores.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper">
                                <Users className="feature-icon" />
                            </div>
                            <h3 className="feature-title">Gestión de Participantes</h3>
                            <p className="feature-description">
                                Administra fácilmente los estados de pago y mantén el control total de tu rifa.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper">
                                <TrendingUp className="feature-icon" />
                            </div>
                            <h3 className="feature-title">Estadísticas en Vivo</h3>
                            <p className="feature-description">
                                Monitorea el progreso de tu rifa con gráficos y métricas actualizadas al instante.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper">
                                <Award className="feature-icon" />
                            </div>
                            <h3 className="feature-title">Sorteo Automático</h3>
                            <p className="feature-description">
                                Selección aleatoria de ganadores con un solo clic. Justo e imparcial.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-container">
                    <h2 className="cta-title">¿Listo para crear tu primera rifa?</h2>
                    <p className="cta-description">
                        Únete a miles de organizadores que confían en Winners para sus sorteos
                    </p>
                    <button className="btn-cta" onClick={() => navigate('/crear')}>
                        Comenzar ahora gratis
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="home-footer">
                <div className="footer-container">
                    <div className="footer-brand">
                        <WinnersLogo size="small" />
                        <p className="footer-tagline">La plataforma profesional para rifas digitales</p>
                    </div>
                    <div className="footer-links">
                        <div className="footer-column">
                            <h4>Producto</h4>
                            <a href="#caracteristicas">Características</a>
                            <a href="#precios">Precios</a>
                            <a href="/demo">Demo</a>
                        </div>
                        <div className="footer-column">
                            <h4>Soporte</h4>
                            <a href="/ayuda">Centro de ayuda</a>
                            <a href="/contacto">Contacto</a>
                        </div>
                        <div className="footer-column">
                            <h4>Legal</h4>
                            <a href="/terms">Términos y condiciones</a>
                            <a href="/privacy">Política de privacidad</a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2025 Winners. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home;
