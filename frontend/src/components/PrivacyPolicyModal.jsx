import React, { useState, useRef } from 'react';
import { X, ArrowLeft, CheckCircle } from 'lucide-react';
import WinnersLogo from '../components/WinnersLogo';

const PrivacyPolicyModal = ({ onClose, onAccept, initialAccepted = false }) => {
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(initialAccepted);
    const contentRef = useRef(null);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        // Check if user is near the bottom (within 50px)
        if (scrollHeight - scrollTop - clientHeight < 50) {
            setHasScrolledToBottom(true);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] w-full max-w-4xl max-h-[90vh] rounded-2xl border border-gray-800 flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#0a0a0a] rounded-t-2xl z-10">
                    <div className="flex items-center">
                        <WinnersLogo size="small" />
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div
                    ref={contentRef}
                    onScroll={handleScroll}
                    className="overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar"
                >
                    <div className="space-y-6">
                        <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Política de Privacidad
                        </h1>
                        <p className="text-gray-400">Última actualización: {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="space-y-8 text-gray-300 leading-relaxed">
                        <section className="space-y-4">
                            <h2 className="text-xl md:text-2xl font-bold text-white">1. Información que recopilamos</h2>
                            <p>
                                En Winners, recopilamos información personal que usted nos proporciona voluntariamente cuando se registra
                                en nuestro sitio web, expresa interés en obtener información sobre nosotros o nuestros productos y servicios,
                                al participar en actividades en el sitio web o al contactarnos.
                            </p>
                            <p>
                                La información personal que recopilamos puede incluir: nombres, números de teléfono, direcciones de correo electrónico,
                                y otra información similar necesaria para la participación en nuestros sorteos.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl md:text-2xl font-bold text-white">2. Uso de su información</h2>
                            <p>
                                Utilizamos la información recopilada para:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Facilitar la creación de cuentas y el proceso de inicio de sesión.</li>
                                <li>Enviar información administrativa.</li>
                                <li>Gestionar sus participaciones en los sorteos.</li>
                                <li>Ponernos en contacto con usted en caso de ser ganador.</li>
                                <li>Proteger nuestros servicios y cumplir con obligaciones legales.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl md:text-2xl font-bold text-white">3. Compartir su información</h2>
                            <p>
                                No compartimos, vendemos, alquilamos ni intercambiamos su información con terceros con fines promocionales.
                                Podemos compartir datos con proveedores de servicios externos que nos ayudan a operar nuestro negocio (por ejemplo,
                                envío de correos electrónicos o procesamiento de pagos), siempre bajo estrictas normas de confidencialidad.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl md:text-2xl font-bold text-white">4. Seguridad de la información</h2>
                            <p>
                                Implementamos medidas de seguridad técnicas y organizativas apropiadas para proteger la seguridad de cualquier
                                información personal que procesamos. Sin embargo, recuerde que ninguna transmisión por Internet es 100% segura.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl md:text-2xl font-bold text-white">5. Contacto</h2>
                            <p>
                                Si tiene preguntas o comentarios sobre esta política, puede contactarnos a través de nuestros canales oficiales de WhatsApp o correo electrónico.
                            </p>
                        </section>
                    </div>

                    <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} Winners. Todos los derechos reservados.
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-800 bg-[#0a0a0a] rounded-b-2xl flex justify-between items-center gap-4">
                    <p className="text-sm text-gray-500 hidden md:block">
                        {hasScrolledToBottom
                            ? "Gracias por leer la política de privacidad."
                            : "Por favor, lee todo el contenido para continuar."}
                    </p>
                    <div className="flex gap-3 ml-auto">
                        <button
                            onClick={onAccept}
                            disabled={!hasScrolledToBottom}
                            className={`px-6 py-2 font-bold rounded-lg transition-all flex items-center gap-2 ${hasScrolledToBottom
                                ? 'bg-gradient-to-r from-[#8b00ff] to-[#ff00de] text-white hover:shadow-lg hover:shadow-purple-500/20 cursor-pointer'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            ACEPTAR Y CONTINUAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyModal;
