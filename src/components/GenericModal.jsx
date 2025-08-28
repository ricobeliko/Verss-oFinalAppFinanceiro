import React from 'react';

function GenericModal({ isOpen, onClose, title, children, onConfirm, isConfirmation = false, theme = 'dark', maxWidth = 'max-w-lg' }) {
    if (!isOpen) return null;

    const themeClasses = {
        dark: {
            bg: 'bg-gray-800',
            text: 'text-white',
            border: 'border-gray-700',
            buttonConfirm: 'bg-purple-600 hover:bg-purple-700',
            buttonCancel: 'bg-gray-600 hover:bg-gray-700'
        },
        light: {
            bg: 'bg-white',
            text: 'text-gray-900',
            border: 'border-gray-200',
            buttonConfirm: 'bg-blue-500 hover:bg-blue-600',
            buttonCancel: 'bg-gray-200 hover:bg-gray-300'
        }
    };

    const currentTheme = themeClasses[theme];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div 
                className={`relative w-full p-6 mx-4 rounded-lg shadow-xl ${currentTheme.bg} ${maxWidth}`}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className={`text-xl font-bold mb-4 ${currentTheme.text}`}>{title}</h3>
                <div className={`text-sm ${currentTheme.text} mb-6`}>
                    {isConfirmation ? <p>{children}</p> : children}
                </div>
                {isConfirmation && (
                    <div className="flex justify-end gap-4">
                        <button onClick={onClose} className={`py-2 px-4 rounded-md text-white transition ${currentTheme.buttonCancel}`}>
                            Cancelar
                        </button>
                        <button onClick={onConfirm} className={`py-2 px-4 rounded-md text-white transition ${currentTheme.buttonConfirm}`}>
                            Confirmar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ✅ CORREÇÃO: Adicionando a linha de exportação que estava faltando no arquivo original.
// Se esta linha já existir no seu arquivo, pode ignorá-la.
export default GenericModal;