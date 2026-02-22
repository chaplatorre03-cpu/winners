import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Ticket, Clock, Users, Award } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/Button';
import './RaffleDetail.css';

import { API_URL } from '../config';

const RaffleDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [raffle, setRaffle] = useState(null);
    const [selectedTickets, setSelectedTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchRaffle();
    }, [id]);

    const fetchRaffle = async () => {
        try {
            const response = await fetch(`${API_URL}/raffles/${id}`);
            const data = await response.json();
            setRaffle(data);
            setLoading(false);
        } catch (err) {
            setError('Error loading raffle');
            setLoading(false);
        }
    };

    const toggleTicket = (ticketNumber) => {
        if (selectedTickets.includes(ticketNumber)) {
            setSelectedTickets(selectedTickets.filter(t => t !== ticketNumber));
        } else {
            setSelectedTickets([...selectedTickets, ticketNumber]);
        }
    };

    const handlePurchase = async () => {
        if (!token) {
            navigate('/login');
            return;
        }

        if (selectedTickets.length === 0) {
            setError('Selecciona al menos un ticket');
            return;
        }

        setPurchasing(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/raffles/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    raffleId: id,
                    ticketNumbers: selectedTickets
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Purchase failed');
            }

            setSuccess(`¡Tickets comprados! Total: $${data.totalCost}`);
            setSelectedTickets([]);
            fetchRaffle(); // Refresh raffle data
        } catch (err) {
            setError(err.message);
        } finally {
            setPurchasing(false);
        }
    };

    const isTicketSold = (ticketNumber) => {
        return raffle?.tickets?.some(t => t.number === ticketNumber);
    };

    const calculateTimeLeft = () => {
        if (!raffle) return '';
        const end = new Date(raffle.endDate);
        const now = new Date();
        const diff = end - now;

        if (diff <= 0) return 'Finalizada';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        return `${hours}h ${minutes}m`;
    };

    if (loading) return <MainLayout><div className="container"><p className="loading-text">Cargando...</p></div></MainLayout>;
    if (!raffle) return <MainLayout><div className="container"><p>Rifa no encontrada</p></div></MainLayout>;

    const soldTickets = raffle.tickets?.length || 0;
    const totalTickets = raffle.totalTickets;
    const progress = (soldTickets / totalTickets) * 100;

    return (
        <MainLayout>
            <div className="container raffle-detail-page">
                <div className="raffle-header">
                    <div className="raffle-image-large">
                        <img src={raffle.image || 'https://via.placeholder.com/600x400'} alt={raffle.title} />
                        <div className="raffle-status-badge">{raffle.status}</div>
                    </div>

                    <div className="raffle-info">
                        <h1 className="raffle-title-large">{raffle.title}</h1>
                        <p className="raffle-description">{raffle.description}</p>

                        <div className="raffle-stats-grid">
                            <div className="stat-box">
                                <Ticket className="stat-icon" />
                                <div>
                                    <p className="stat-label">Precio por Ticket</p>
                                    <p className="stat-value">${raffle.price}</p>
                                </div>
                            </div>

                            <div className="stat-box">
                                <Users className="stat-icon" />
                                <div>
                                    <p className="stat-label">Tickets Vendidos</p>
                                    <p className="stat-value">{soldTickets} / {totalTickets}</p>
                                </div>
                            </div>

                            <div className="stat-box">
                                <Clock className="stat-icon" />
                                <div>
                                    <p className="stat-label">Tiempo Restante</p>
                                    <p className="stat-value">{calculateTimeLeft()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="progress-text">{progress.toFixed(1)}% vendido</p>
                    </div>
                </div>

                <div className="tickets-section">
                    <h2 className="section-title">
                        <Ticket size={24} />
                        Selecciona tus Tickets
                    </h2>

                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    <div className="tickets-grid">
                        {Array.from({ length: totalTickets }, (_, i) => i + 1).map(num => {
                            const sold = isTicketSold(num);
                            const selected = selectedTickets.includes(num);

                            return (
                                <button
                                    key={num}
                                    className={`ticket-btn ${sold ? 'sold' : ''} ${selected ? 'selected' : ''}`}
                                    onClick={() => !sold && toggleTicket(num)}
                                    disabled={sold}
                                >
                                    {num}
                                </button>
                            );
                        })}
                    </div>

                    {selectedTickets.length > 0 && (
                        <div className="purchase-summary">
                            <p>Tickets seleccionados: {selectedTickets.length}</p>
                            <p className="total-price">Total: ${raffle.price * selectedTickets.length}</p>
                            <Button
                                variant="primary"
                                onClick={handlePurchase}
                                disabled={purchasing}
                            >
                                {purchasing ? 'Procesando...' : 'Comprar Tickets'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default RaffleDetail;
