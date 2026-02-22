import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/Button';
import './CreateRaffle.css';

import { API_URL } from '../config';

const CreateRaffle = () => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        totalTickets: '',
        image: '',
        endDate: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
        }
    }, [token, navigate]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/raffles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create raffle');
            }

            navigate('/rifas');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout>
            <div className="container create-page">
                <h1 className="page-title">CREAR <span className="text-gradient">NUEVA RIFA</span></h1>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="create-form-container punk-border">
                    <div className="form-group">
                        <label>Título de la Rifa</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Ej: Viaje a Bali Todo Pagado"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Precio del Ticket (USD)</label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="10"
                                min="1"
                                step="0.01"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Total de Tickets</label>
                            <input
                                type="number"
                                name="totalTickets"
                                value={formData.totalTickets}
                                onChange={handleChange}
                                placeholder="100"
                                min="1"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Descripción</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="4"
                            placeholder="Detalles increíbles sobre el premio..."
                            required
                        ></textarea>
                    </div>

                    <div className="form-group">
                        <label>URL de la Imagen</label>
                        <input
                            type="url"
                            name="image"
                            value={formData.image}
                            onChange={handleChange}
                            placeholder="https://ejemplo.com/imagen.jpg"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Fecha de Finalización</label>
                        <input
                            type="datetime-local"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <Button
                        variant="primary"
                        className="width-full"
                        disabled={loading}
                    >
                        {loading ? 'Creando...' : 'Lanzar Rifa'}
                    </Button>
                </form>
            </div>
        </MainLayout>
    );
};

export default CreateRaffle;
