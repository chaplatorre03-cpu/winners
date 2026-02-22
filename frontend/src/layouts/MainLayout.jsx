import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const MainLayout = ({ children }) => {
    return (
        <div className="app-wrapper">
            <Header />
            <main className="main-content">
                {children}
            </main>
            <Footer />
        </div>
    );
};

export default MainLayout;
