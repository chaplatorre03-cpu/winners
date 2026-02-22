import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Phone } from 'lucide-react';
import WinnersLogo from '../components/WinnersLogo';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

import { API_URL } from '../config';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        confirmEmail: '',
        phone: '',
        password: '',
        confirmPassword: '',
        acceptPolicy: false
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const containerRef = React.useRef(null);

    // Scroll to top when error occurs
    useEffect(() => {
        if (error) {
            // Scroll the container
            if (containerRef.current) {
                containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
            // Fallback for window just in case
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [error]);

    // OTP State
    const [showOTP, setShowOTP] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpCode, setOtpCode] = useState(''); // El código real recibido del servidor
    const [timer, setTimer] = useState(120); // 2 minutes in seconds
    const [otpLoading, setOtpLoading] = useState(false);

    // Timer logic
    useEffect(() => {
        let interval = null;
        if (showOTP && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [showOTP, timer]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleChange = (e) => {
        let value = e.target.value;
        if (e.target.name === 'email' || e.target.name === 'confirmEmail') {
            value = value.toLowerCase();
        } else if (e.target.name === 'name') {
            // Only allow letters, spaces, and Spanish accents/ñ, then to uppercase
            value = value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '');
        }
        setFormData({
            ...formData,
            [e.target.name]: value
        });
        setError('');
        if (e.target.name === 'phone') setPhoneError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.email !== formData.confirmEmail) {
            setError('Los correos electrónicos no coinciden');
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            setLoading(false);
            return;
        }

        if (formData.phone.length !== 10) {
            setPhoneError('El teléfono debe tener 10 dígitos');
            setLoading(false);
            return;
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}<>]{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            setError('La contraseña no cumple con los requisitos de seguridad');
            setLoading(false);
            return;
        }

        if (!formData.acceptPolicy) {
            setError('Debes aceptar la política de privacidad para registrarte');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al registrarse');
            }

            // Instead of navigating, show OTP modal
            setOtpCode(data.code);
            setOtp(''); // Clear previous input
            setShowOTP(true);
            setTimer(120);

            // Generate the WhatsApp link with "Secret Code" hack - Using underscores to force preview truncation
            const longMessage = `¡Hola! Deseo verificar mi cuenta en Winners.\n\nINSTRUCCIONES: Abre este chat para encontrar tu código de verificación al final del mensaje.\n\n__________________________________________________\n\n__________________________________________________\n\n__________________________________________________\n\n__________________________________________________\n\n__________________________________________________\n\n__________________________________________________\n\nEN CUANTO UNO DE NUESTROS ASESORES ESTÉ DISPONIBLE, LO CONTACTARÁ POR ESTE MEDIO. ¡¡¡ES UN PLACER PARA NOSOTROS QUE DESEE SER MIEMBRO DE WINNERS!!!\n\nCÓDIGO DE VERIFICACIÓN: ${data.code}`;
            const waMessage = encodeURIComponent(longMessage);
            // Volvemos a https://wa.me porque whatsapp:// puede fallar si no hay app instalada
            // Usamos window.open de nuevo, el "blank screen" anterior era por whatsapp:// en _blank
            const waLink = `https://api.whatsapp.com/send?phone=57${formData.phone.replace(/\D/g, '').slice(-10)}&text=${waMessage}`;

            // Abrir en nueva pestaña
            window.open(waLink, '_blank');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenWhatsApp = () => {
        const longMessage = `¡Hola! Deseo verificar mi cuenta en Winners.\n\nINSTRUCCIONES: Abre este chat para encontrar tu código de verificación al final del mensaje.\n\n__________________________________________________\n\n__________________________________________________\n\n__________________________________________________\n\n__________________________________________________\n\n__________________________________________________\n\n__________________________________________________\n\nEN CUANTO UNO DE NUESTROS ASESORES ESTÉ DISPONIBLE, LO CONTACTARÁ POR ESTE MEDIO. ¡¡¡ES UN PLACER PARA NOSOTROS QUE DESEE SER MIEMBRO DE WINNERS!!!\n\nCÓDIGO DE VERIFICACIÓN: ${otpCode}`;
        const waMessage = encodeURIComponent(longMessage);
        const waLink = `https://api.whatsapp.com/send?phone=57${formData.phone.replace(/\D/g, '').slice(-10)}&text=${waMessage}`;
        window.open(waLink, '_blank');
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setOtpLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: formData.email,
                    code: otp
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al verificar el código');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            navigate('/panel');
        } catch (err) {
            setError(err.message);
        } finally {
            setOtpLoading(false);
        }
    };

    const handleResendOTP = async () => {
        // Trigger register again to resend OTP
        setTimer(120);
        await handleSubmit({ preventDefault: () => { } });
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] flex flex-col items-center pt-20 pb-12 p-4 overflow-y-auto h-screen">
            {/* Animated background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[140px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-secondary/20 rounded-full blur-[140px] animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#8b00ff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
            </div>

            <div className="relative w-full max-w-xl">
                <div className="flex justify-center mb-6 md:mb-8 scale-90 md:scale-100 relative z-50">
                    <WinnersLogo size="large" />
                </div>
                <div className="bg-[#111]/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 border border-gray-800">
                    {!showOTP ? (
                        <>
                            {/* Header */}
                            <div className="text-center space-y-1 md:space-y-2">
                                <h1 className="text-2xl md:text-3xl font-bold text-white">Crear cuenta</h1>
                                <p className="text-sm md:text-base text-[#ff00de] font-semibold">Regístrate en Winners</p>
                            </div>

                            {error && (
                                <div className="bg-red-50/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg">
                                    <p className="text-sm font-semibold">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Name */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-300">Nombre completo</label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                        <input
                                            name="name"
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            autoComplete="name"
                                            className="input-field pl-10 uppercase"
                                            placeholder="Tu nombre"
                                            onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa tu nombre completo')}
                                            onInput={(e) => e.target.setCustomValidity('')}
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-300">Correo electrónico</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            autoComplete="email"
                                            className="input-field pl-10 lowercase"
                                            placeholder="tu@email.com"
                                            onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa tu correo electrónico')}
                                            onInput={(e) => e.target.setCustomValidity('')}
                                        />
                                    </div>
                                </div>

                                {/* Confirm Email */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-300">Confirmar correo electrónico</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                        <input
                                            name="confirmEmail"
                                            type="email"
                                            required
                                            value={formData.confirmEmail}
                                            onChange={handleChange}
                                            autoComplete="email"
                                            className="input-field pl-10 lowercase"
                                            placeholder="Confirmar correo"
                                            onInvalid={(e) => e.target.setCustomValidity('Por favor, confirma tu correo electrónico')}
                                            onInput={(e) => e.target.setCustomValidity('')}
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-300">Número telefónico</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                        <input
                                            name="phone"
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setFormData({ ...formData, phone: val });
                                            }}
                                            autoComplete="tel"
                                            className="input-field pl-10"
                                            placeholder="300 0000000"
                                            maxLength={10}
                                            onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa tu número de teléfono')}
                                            onInput={(e) => e.target.setCustomValidity('')}
                                        />
                                    </div>
                                    {phoneError && <p className="text-xs text-red-500 font-bold mt-1 ml-1 shake-animation">{phoneError}</p>}
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-300">Contraseña</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                        <input
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={formData.password}
                                            onChange={handleChange}
                                            autoComplete="new-password"
                                            className="input-field pl-10 pr-10"
                                            placeholder="••••••••"
                                            onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa tu contraseña')}
                                            onInput={(e) => e.target.setCustomValidity('')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-primary transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className={`text-xs flex items-center ${formData.password.length >= 8 ? 'text-green-500 font-bold' : 'text-gray-400'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-600'}`} />
                                            Mínimo 8 caracteres
                                        </div>
                                        <div className={`text-xs flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-500 font-bold' : 'text-gray-400'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${/[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-600'}`} />
                                            Una mayúscula
                                        </div>
                                        <div className={`text-xs flex items-center ${/\d/.test(formData.password) ? 'text-green-500 font-bold' : 'text-gray-400'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${/\d/.test(formData.password) ? 'bg-green-500' : 'bg-gray-600'}`} />
                                            Un número
                                        </div>
                                        <div className={`text-xs flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-500 font-bold' : 'text-gray-400'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-600'}`} />
                                            Un carácter especial
                                        </div>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-300">Confirmar contraseña</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                        <input
                                            name="confirmPassword"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            autoComplete="new-password"
                                            className="input-field pl-10"
                                            placeholder="••••••••"
                                            onInvalid={(e) => e.target.setCustomValidity('Por favor, confirma tu contraseña')}
                                            onInput={(e) => e.target.setCustomValidity('')}
                                        />
                                    </div>
                                </div>

                                {/* Privacy Policy Checkbox */}
                                <div className="flex items-start space-x-3 pt-2">
                                    <div className="flex items-center h-5">
                                        <input
                                            id="privacy-policy"
                                            name="acceptPolicy"
                                            type="checkbox"
                                            required
                                            disabled
                                            checked={formData.acceptPolicy}
                                            onChange={(e) => { }} // Controlled by modal
                                            className="w-5 h-5 border border-gray-600 rounded bg-[#1a1a1a] text-primary cursor-not-allowed opacity-70"
                                            onInvalid={(e) => e.target.setCustomValidity('Debes aceptar la política de privacidad')}
                                            onInput={(e) => e.target.setCustomValidity('')}
                                        />
                                    </div>
                                    <label htmlFor="privacy-policy" className="text-sm text-gray-400 select-none">
                                        He leído y acepto la{' '}
                                        <button
                                            type="button"
                                            onClick={() => setShowPrivacyModal(true)}
                                            className="text-primary hover:text-primary-dark hover:underline font-semibold"
                                        >
                                            Política de Privacidad
                                        </button>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full btn-primary py-4"
                                >
                                    {loading ? 'Validando datos...' : 'REGISTRARSE'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="space-y-4 md:space-y-6">

                            <div className="text-center space-y-1 md:space-y-2">
                                <h1 className="text-xl md:text-3xl font-bold text-white">Verificar WhatsApp</h1>
                                <p className="text-xs md:text-base text-gray-400">
                                    Hemos abierto <span className="text-green-500 font-bold">WhatsApp</span>. Abre el chat para ver tu código de verificación y escríbelo abajo.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50/10 border border-red-500/50 text-red-500 px-3 py-2 md:px-4 md:py-3 rounded-lg">
                                    <p className="text-xs md:text-sm font-semibold">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleVerifyOTP} className="space-y-4 md:space-y-6">

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-300 text-center uppercase tracking-widest">
                                        Código de verificación
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        required
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        className="w-full text-center text-2xl md:text-4xl tracking-[0.3em] md:tracking-[0.5em] font-black bg-[#1a1a1a] border-2 border-gray-800 rounded-xl py-3 md:py-4 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-white"
                                        placeholder="000000"
                                        onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa el código de 6 dígitos')}
                                        onInput={(e) => e.target.setCustomValidity('')}
                                    />

                                </div>

                                <div className="text-center">
                                    <p className="text-gray-400 text-xs md:text-sm">
                                        El código expira en: <span className={`font-mono font-bold ${timer < 30 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                                            {formatTime(timer)}
                                        </span>
                                    </p>
                                    <div className="mt-5 md:mt-6 space-y-3">
                                        {timer === 0 ? (
                                            <button
                                                type="button"
                                                onClick={handleResendOTP}
                                                className="text-primary hover:underline font-semibold block w-full text-sm py-2"
                                            >
                                                Solicitar nuevo código
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleOpenWhatsApp}
                                                className="text-green-500 hover:text-green-400 font-semibold flex items-center justify-center gap-2 w-full bg-green-500/10 py-3 md:py-3.5 rounded-xl border border-green-500/20 hover:bg-green-500/20 transition-all text-sm mb-4"
                                            >
                                                <Phone className="h-4 w-4" />
                                                REABRIR WHATSAPP
                                            </button>
                                        )}
                                    </div>
                                </div>




                                <div className="flex flex-col-reverse md:flex-row gap-4 md:gap-5 pt-2">

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowOTP(false);
                                            setOtp('');
                                        }}
                                        className="flex-1 bg-gray-800 text-white font-bold py-3 md:py-4 rounded-xl hover:bg-gray-700 transition-all text-sm md:text-base"
                                    >
                                        ATRÁS
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={otpLoading || otp.length !== 6}
                                        className="flex-[2] btn-primary py-3 md:py-4 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                                    >
                                        {otpLoading ? 'Verificando...' : 'VERIFICAR'}
                                    </button>
                                </div>

                            </form>
                        </div>
                    )}

                    <div className="text-center pt-4 border-t border-gray-800">
                        <p className="text-gray-400">
                            ¿Ya tienes cuenta?{' '}
                            <button
                                onClick={() => navigate('/login')}
                                className="text-primary hover:text-primary-dark font-semibold hover:underline"
                            >
                                Inicia sesión
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* Privacy Policy Modal */}
            {showPrivacyModal && (
                <PrivacyPolicyModal
                    initialAccepted={formData.acceptPolicy}
                    onClose={() => setShowPrivacyModal(false)}
                    onAccept={() => {
                        setFormData({ ...formData, acceptPolicy: true });
                        setShowPrivacyModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default Register;
