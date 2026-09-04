import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

const CustomDateInput = ({
    value = '',
    onChange,
    min,
    max,
    required = false,
    disabled = false,
    className = '',
    placeholder = 'dd/mm/aaaa',
    onInvalid,
    onInput,
    id
}) => {
    const inputRef = useRef(null);

    // Format YYYY-MM-DD to DD/MM/AAAA for display
    const formatToDMY = (val) => {
        if (!val) return '';
        const parts = val.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            if (year && month && day) {
                return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
            }
        }
        return val;
    };

    const displayValue = formatToDMY(value);

    const handleContainerClick = () => {
        if (disabled) return;
        if (inputRef.current) {
            if (typeof inputRef.current.showPicker === 'function') {
                try {
                    inputRef.current.showPicker();
                } catch (e) {
                    inputRef.current.focus();
                }
            } else {
                inputRef.current.focus();
            }
        }
    };

    return (
        <div
            onClick={handleContainerClick}
            className={`relative group flex items-center cursor-pointer ${disabled ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
        >
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none z-0" />
            
            {/* Visual Display Input */}
            <div
                className={`input-field pl-12 pr-10 bg-gray-50 border-gray-100 focus-within:bg-white text-gray-900 flex items-center w-full select-none ${
                    !displayValue ? 'text-gray-400 font-medium' : 'text-gray-900 font-bold'
                }`}
            >
                {displayValue || placeholder}
            </div>

            {/* Calendar icon button on right side */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <span className="text-xs">📅</span>
            </div>

            {/* Hidden native date input that captures user interactions and validation */}
            <input
                ref={inputRef}
                id={id}
                type="date"
                required={required}
                disabled={disabled}
                min={min}
                max={max}
                value={value || ''}
                onChange={onChange}
                onInvalid={onInvalid}
                onInput={onInput}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                tabIndex={0}
                aria-label="Seleccionar fecha (día/mes/año)"
            />
        </div>
    );
};

export default CustomDateInput;
