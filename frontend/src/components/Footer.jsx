import React from 'react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="punk-footer">
            <div className="container footer-content">
                <div className="footer-brand">
                    <h2 className="footer-logo">WINNERS</h2>
                    <p>La plataforma de rifas del futuro. Transparencia, velocidad y diseño.</p>
                </div>

                <div className="footer-links">
                    <div className="link-column">
                        <h3>Plataforma</h3>
                        <a href="#">Cómo funciona</a>
                        <a href="#">Precios</a>
                        <a href="#">Explorar</a>
                    </div>
                    <div className="link-column">
                        <h3>Soporte</h3>
                        <a href="#">FAQ</a>
                        <a href="#">Contacto</a>
                        <a href="#">Términos</a>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; 2025 Winners. Todos los derechos reservados.</p>
            </div>
        </footer>
    );
};

export default Footer;
