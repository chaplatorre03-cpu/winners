import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import WinnersLogo from '../components/WinnersLogo';

import { API_URL } from '../config';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Forgot password state
    const [step, setStep] = useState('login'); // 'login' | 'forgot' | 'code' | 'newpass'
    const [resetEmail, setResetEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [timer, setTimer] = useState(300); // 5 minutes
    const [successMessage, setSuccessMessage] = useState('');

    // Timer logic
    useEffect(() => {
        let interval = null;
        if (step === 'code' && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleChange = (e) => {
        const value = e.target.name === 'email' ? e.target.value.toLowerCase() : e.target.value;
        setFormData({
            ...formData,
            [e.target.name]: value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al iniciar sesión');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            navigate('/panel');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 1: Send reset code to email
    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al enviar el código');
            }

            setStep('code');
            setTimer(300);
            setResetCode('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify the code
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/auth/verify-reset-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail, code: resetCode })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al verificar el código');
            }

            setStep('newpass');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (newPassword !== confirmNewPassword) {
            setError('Las contraseñas no coinciden');
            setLoading(false);
            return;
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            setError('La contraseña no cumple con los requisitos de seguridad');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al restablecer la contraseña');
            }

            setSuccessMessage('¡Contraseña actualizada! Ya puedes iniciar sesión.');
            setStep('login');
            setResetEmail('');
            setResetCode('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Resend code
    const handleResendCode = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error al reenviar el código');
            }
            setTimer(300);
            setResetCode('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const goBackToLogin = () => {
        setStep('login');
        setError('');
        setResetEmail('');
        setResetCode('');
        setNewPassword('');
        setConfirmNewPassword('');
    };

    // Render the login form
    const renderLogin = () => (
        <>
            <div className="text-center space-y-1 md:space-y-2">
                <h1 className="text-sm font-black text-gray-400 uppercase tracking-[0.4em] mb-2">Acceso Seguro</h1>
                <p className="text-[#8b00ff] font-medium">Inicia sesión en Winners</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-shake">
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {successMessage && (
                <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg">
                    <p className="text-sm font-semibold">{successMessage}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-300">
                        Correo electrónico
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="input-field pl-10 focus:ring-primary focus:border-primary lowercase"
                            placeholder="tu@email.com"
                            onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa tu correo electrónico')}
                            onInput={(e) => e.target.setCustomValidity('')}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-300">
                        Contraseña
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoComplete="current-password"
                            value={formData.password}
                            onChange={handleChange}
                            className="input-field pl-10 pr-10 focus:ring-primary focus:border-primary"
                            placeholder="••••••••"
                            onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa tu contraseña')}
                            onInput={(e) => e.target.setCustomValidity('')}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-primary transition-colors"
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5 text-gray-400" />
                            ) : (
                                <Eye className="h-5 w-5 text-gray-400" />
                            )}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-4"
                >
                    {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Ingresando...</span>
                        </div>
                    ) : (
                        'INGRESAR'
                    )}
                </button>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setStep('forgot');
                            setResetEmail(formData.email);
                            setError('');
                            setSuccessMessage('');
                        }}
                        className="text-gray-400 hover:text-primary text-sm font-medium transition-colors hover:underline"
                    >
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>
            </form>
        </>
    );

    // Render forgot password - email input
    const renderForgot = () => (
        <>
            <div className="text-center space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Recuperar contraseña</h1>
                <p className="text-sm md:text-base text-gray-400">
                    Ingresa tu correo electrónico registrado y te enviaremos un código de verificación.
                </p>
            </div>

            {error && (
                <div className="bg-red-50/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg">
                    <p className="text-sm font-semibold">{error}</p>
                </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-300">
                        Correo electrónico
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            value={resetEmail}
                            onChange={(e) => { setResetEmail(e.target.value.toLowerCase()); setError(''); }}
                            className="input-field pl-10 lowercase"
                            placeholder="tu@email.com"
                            onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa tu correo electrónico')}
                            onInput={(e) => e.target.setCustomValidity('')}
                        />
                    </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-4 md:gap-5 pt-2">
                    <button
                        type="button"
                        onClick={goBackToLogin}
                        className="flex-1 bg-gray-800 text-white font-bold py-3 md:py-4 rounded-xl hover:bg-gray-700 transition-all text-sm md:text-base"
                    >
                        ATRÁS
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] btn-primary py-3 md:py-4 disabled:opacity-50 text-sm md:text-base"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Enviando...</span>
                            </div>
                        ) : (
                            'ENVIAR CÓDIGO'
                        )}
                    </button>
                </div>

            </form>
        </>
    );

    // Render code verification - same style as Register OTP
    const renderCode = () => (
        <div className="space-y-4 md:space-y-6">
            <div className="text-center space-y-1 md:space-y-2">
                <h1 className="text-xl md:text-3xl font-bold text-white">Verificar código</h1>
                <p className="text-xs md:text-base text-gray-400">
                    Hemos enviado un código de 6 dígitos a <span className="text-primary font-bold">{resetEmail}</span>
                </p>
            </div>


            {error && (
                <div className="bg-red-50/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg">
                    <p className="text-sm font-semibold">{error}</p>
                </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                    <label className="block text-xs md:text-sm font-semibold text-gray-300 text-center uppercase tracking-widest">
                        Código de verificación
                    </label>
                    <input
                        type="text"
                        maxLength={6}
                        required
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-center text-2xl md:text-4xl tracking-[0.3em] md:tracking-[0.5em] font-black bg-[#1a1a1a] border-2 border-gray-800 rounded-xl py-3 md:py-4 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-white"
                        placeholder="000000"
                        onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa el código de 6 dígitos')}
                        onInput={(e) => e.target.setCustomValidity('')}
                    />
                </div>


                <div className="text-center">
                    <p className="text-gray-400 text-xs md:text-sm">
                        El código expira en: <span className={`font-mono font-bold ${timer < 60 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                            {formatTime(timer)}
                        </span>
                    </p>

                    <div className="mt-4">
                        {timer === 0 ? (
                            <button
                                type="button"
                                onClick={handleResendCode}
                                disabled={loading}
                                className="text-primary hover:underline font-semibold block w-full"
                            >
                                Solicitar nuevo código
                            </button>
                        ) : null}
                    </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-4 md:gap-5 pt-2">
                    <button
                        type="button"
                        onClick={goBackToLogin}
                        className="flex-1 bg-gray-800 text-white font-bold py-3 md:py-4 rounded-xl hover:bg-gray-700 transition-all text-sm md:text-base"
                    >
                        ATRÁS
                    </button>
                    <button
                        type="submit"
                        disabled={loading || resetCode.length !== 6}
                        className="flex-[2] btn-primary py-3 md:py-4 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                        {loading ? 'Verificando...' : 'VERIFICAR'}
                    </button>
                </div>

            </form>
        </div>
    );

    // Render new password form - same validation as Register
    const renderNewPassword = () => (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Nueva contraseña</h1>
                <p className="text-sm md:text-base text-gray-400">
                    Establece tu nueva contraseña para <span className="text-primary font-bold">{resetEmail}</span>
                </p>
            </div>

            {error && (
                <div className="bg-red-50/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg">
                    <p className="text-sm font-semibold">{error}</p>
                </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-5">
                {/* New Password */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-300">Nueva contraseña</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                            className="input-field pl-10 pr-10"
                            placeholder="••••••••"
                            onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa tu nueva contraseña')}
                            onInput={(e) => e.target.setCustomValidity('')}
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-primary transition-colors"
                        >
                            {showNewPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                        </button>
                    </div>
                    {/* Password requirements - same as Register */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className={`text-xs flex items-center ${newPassword.length >= 8 ? 'text-green-500 font-bold' : 'text-gray-400'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-600'}`} />
                            Mínimo 8 caracteres
                        </div>
                        <div className={`text-xs flex items-center ${/[A-Z]/.test(newPassword) ? 'text-green-500 font-bold' : 'text-gray-400'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-600'}`} />
                            Una mayúscula
                        </div>
                        <div className={`text-xs flex items-center ${/\d/.test(newPassword) ? 'text-green-500 font-bold' : 'text-gray-400'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${/\d/.test(newPassword) ? 'bg-green-500' : 'bg-gray-600'}`} />
                            Un número
                        </div>
                        <div className={`text-xs flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-500 font-bold' : 'text-gray-400'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-600'}`} />
                            Un carácter especial
                        </div>
                    </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-300">Confirmar nueva contraseña</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            value={confirmNewPassword}
                            onChange={(e) => { setConfirmNewPassword(e.target.value); setError(''); }}
                            className="input-field pl-10"
                            placeholder="••••••••"
                            onInvalid={(e) => e.target.setCustomValidity('Por favor, confirma tu nueva contraseña')}
                            onInput={(e) => e.target.setCustomValidity('')}
                        />
                    </div>
                    {confirmNewPassword && newPassword !== confirmNewPassword && (
                        <p className="text-xs text-red-500 font-bold mt-1 ml-1">Las contraseñas no coinciden</p>
                    )}
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-4 md:gap-5 pt-2">
                    <button
                        type="button"
                        onClick={goBackToLogin}
                        className="flex-1 bg-gray-800 text-white font-bold py-3 md:py-4 rounded-xl hover:bg-gray-700 transition-all text-sm md:text-base"
                    >
                        CANCELAR
                    </button>
                    <button
                        type="submit"
                        disabled={loading || newPassword !== confirmNewPassword}
                        className="flex-[2] btn-primary py-3 md:py-4 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Guardando...</span>
                            </div>
                        ) : (
                            'GUARDAR CONTRASEÑA'
                        )}
                    </button>
                </div>

            </form>
        </div>
    );

    return (
        <div className="relative min-h-screen bg-[#0a0a0a] flex flex-col items-center pt-20 pb-12 p-4 overflow-y-auto">
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
                {/* Login Card */}
                <div className="card p-6 md:p-10 space-y-6 md:space-y-10 relative group">
                    <div className="absolute inset-0 bg-[#0a0a0a]/20 backdrop-blur-3xl -z-10" />

                    {step === 'login' && renderLogin()}
                    {step === 'forgot' && renderForgot()}
                    {step === 'code' && renderCode()}
                    {step === 'newpass' && renderNewPassword()}

                    {/* Register Link - only show on login step */}
                    {step === 'login' && (
                        <div className="text-center pt-4 border-t border-gray-800">
                            <p className="text-gray-400">
                                ¿No tienes cuenta?{' '}
                                <button
                                    onClick={() => navigate('/register')}
                                    className="text-primary hover:text-primary-dark font-semibold hover:underline transition-colors"
                                >
                                    Regístrate
                                </button>
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Text */}
                <p className="text-center text-sm text-gray-600 mt-6">
                    © 2025 Winners. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
};

export default Login;
