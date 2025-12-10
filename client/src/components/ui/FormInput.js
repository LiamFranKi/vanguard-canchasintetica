import React from 'react';

const FormInput = ({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  required = false,
  icon,
  error,
  className = '',
  ...props 
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {icon && <span className="mr-2">{icon}</span>}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`
            w-full px-4 py-3 
            bg-white border-2 border-gray-200 
            rounded-xl 
            focus:border-green-500 focus:ring-4 focus:ring-green-100 
            transition-all duration-200
            placeholder-gray-400
            text-gray-700
            hover:border-gray-300
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <span className="mr-1">⚠️</span>
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default FormInput;



