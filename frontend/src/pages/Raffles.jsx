import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import RaffleCard from '../components/RaffleCard';
import './Raffles.css';

import { API_URL } from '../config';

const dummyRaffles = [
    {
        id: 1,
        title: "NFT Bored Ape #3421",
        price: 50,
        timeLeft: "02:14:30",
        participants: 124,
        image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop"
    },
    {
        id: 2,
        title: "Tesla Model S Plaid",
        price: 150,
        timeLeft: "05:00:00",
        participants: 892,
        image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=2070&auto=format&fit=crop"
    },
    {
        id: 3,
        title: "Viaje a Marte (SpaceX)",
        price: 500,
        timeLeft: "12:30:15",
        participants: 4500,
        image: "https://images.unsplash.com/photo-1541185933-710f50b90858?q=80&w=2071&auto=format&fit=crop"
    },
    {
        id: 4,
        title: "Setup Gaming Ultimate",
        price: 10,
        timeLeft: "00:45:00",
        participants: 340,
        image: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=2070&auto=format&fit=crop"
    },
    {
        id: 5,
        title: "Bitcoin (1 BTC)",
        price: 1000,
        timeLeft: "24:00:00",
        participants: 200,
        image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=2069&auto=format&fit=crop"
    },
    {
        id: 6,
        title: "Cyberpunk 2077 Ed. Coleccionista",
        price: 60,
        timeLeft: "01:20:00",
        participants: 56,
        image: "https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?q=80&w=1974&auto=format&fit=crop"
    }
];

const Raffles = () => {
    const [raffles, setRaffles] = useState(dummyRaffles);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRaffles();
    }, []);

    const fetchRaffles = async () => {
        try {
            const response = await fetch(`${API_URL}/raffles`);
            if (!response.ok) throw new Error('Error al cargar rifas');
            const data = await response.json();

            // If we have data from backend, use it; otherwise keep dummy data
            if (data && data.length > 0) {
                const formattedRaffles = data.map(raffle => ({
                    ...raffle,
                    timeLeft: calculateTimeLeft(raffle.endDate),
                    participants: raffle.ticketsSold || 0
                }));
                setRaffles(formattedRaffles);
            }
            setLoading(false);
        } catch (err) {
            console.log('Using dummy data - Backend not available:', err.message);
            setLoading(false);
            // Keep dummy data on error
        }
    };

    const calculateTimeLeft = (endDate) => {
        const end = new Date(endDate);
        const now = new Date();
        const diff = end - now;

        if (diff <= 0) return "Finalizada";

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <MainLayout>
            <div className="container raffles-page">
                <h1 className="page-title">EXPLORAR <span className="text-gradient">RIFAS</span></h1>

                <div className="filters-bar punk-border">
                    <span className="filter-active">Todas</span>
                    <span>Populares</span>
                    <span>Terminando Pronto</span>
                    <span>Crypto</span>
                </div>

                {loading && <p className="loading-text">Cargando rifas...</p>}

                <div className="raffles-grid">
                    {raffles.map(raffle => (
                        <RaffleCard key={raffle.id} {...raffle} />
                    ))}
                </div>
            </div>
        </MainLayout>
    );
};

export default Raffles;
