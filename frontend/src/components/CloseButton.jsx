import React from 'react';
import { X } from 'lucide-react';

/**
 * Standardized Close Button for all modals in the application.
 * Matches the premium design requested by the user:
 * circular, red background, white X icon, with hover animations.
 * 
 * @param {Object} props
 * @param {Function} props.onClick - Function to call on click
 * @param {string} props.className - Additional classes for positioning or overrides
 */
const CloseButton = ({ onClick, className = "" }) => {
    return (
        <button
            onClick={onClick}
            type="button"
            className={`absolute top-7 md:top-8 right-5 md:right-8 w-11 h-11 md:w-10 md:h-10 flex items-center justify-center bg-[#ff4d4d] hover:bg-[#ff1a1a] text-white rounded-full shadow-lg shadow-red-500/30 transition-all duration-500 hover:rotate-90 hover:scale-110 active:scale-95 z-[70] group ${className}`}
            aria-label="Cerrar"
        >
            <X className="w-6 h-6 md:w-5 md:h-5 text-white transition-transform group-active:scale-90" />
        </button>
    );
};

export default CloseButton;
