import React from 'react';
import './Button.css';

const Button = ({ children, variant = 'primary', onClick, className = '', ...props }) => {
  return (
    <button 
      className={`punk-btn punk-btn-${variant} ${className}`} 
      onClick={onClick}
      {...props}
    >
      <span className="punk-btn-content">{children}</span>
      <span className="punk-btn-glitch"></span>
    </button>
  );
};

export default Button;
