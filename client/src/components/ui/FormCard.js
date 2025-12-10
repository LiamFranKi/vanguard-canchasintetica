import React from 'react';
import Card from './Card';

const FormCard = ({ 
  children, 
  title,
  subtitle,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  loading = false,
  className = '',
  ...props 
}) => {
  return (
    <Card title={title} subtitle={subtitle} className={className} {...props}>
      <form onSubmit={onSubmit} className="space-y-6">
        {children}
        
        {(onSubmit || onCancel) && (
          <div className="flex gap-4 pt-4 border-t border-gray-100">
            {onSubmit && (
              <button
                type="submit"
                disabled={loading}
                className="
                  flex-1 px-6 py-3 
                  bg-gradient-to-r from-green-500 to-green-600 
                  text-white font-semibold rounded-xl 
                  shadow-lg hover:shadow-xl 
                  hover:from-green-600 hover:to-green-700
                  transition-all duration-200
                  transform hover:scale-105 active:scale-95
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                "
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </span>
                ) : (
                  submitLabel
                )}
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="
                  flex-1 px-6 py-3 
                  bg-gray-100 text-gray-700 font-semibold rounded-xl 
                  shadow-md hover:shadow-lg hover:bg-gray-200
                  transition-all duration-200
                  transform hover:scale-105 active:scale-95
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                "
              >
                {cancelLabel}
              </button>
            )}
          </div>
        )}
      </form>
    </Card>
  );
};

export default FormCard;



