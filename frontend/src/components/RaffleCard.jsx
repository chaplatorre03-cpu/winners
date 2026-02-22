import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, Ticket } from 'lucide-react';
import Button from './Button';
import './RaffleCard.css';

const RaffleCard = ({ id, title, price, timeLeft, participants, image }) => {
    return (
        <div className="raffle-card punk-border">
            <Link to={`/rifas/${id}`} className="card-link">
                <div className="card-image-container">
                    <img src={image} alt={title} className="card-image" />
                    <div className="card-badge">EN VIVO</div>
                </div>

                <div className="card-content">
                    <h3 className="card-title">{title}</h3>

                    <div className="card-stats">
                        <div className="stat-item">
                            <Ticket size={16} className="stat-icon" />
                            <span>${price} USD</span>
                        </div>
                        <div className="stat-item">
                            <Users size={16} className="stat-icon" />
                            <span>{participants} part.</span>
                        </div>
                    </div>

                    <div className="card-timer">
                        <Clock size={16} />
                        <span>Termina en: {timeLeft}</span>
                    </div>
                </div>
            </Link>

            <div className="card-footer">
                <Link to={`/rifas/${id}`}>
                    <Button variant="primary" className="width-full">Ver Detalles</Button>
                </Link>
            </div>
        </div>
    );
};

export default RaffleCard;
