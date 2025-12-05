import React from 'react';

const FormSelect = ({ 
  label, 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Seleccionar...',
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
        <select
          value={value}
          onChange={onChange}
          required={required}
          className={`
            w-full px-4 py-3 
            bg-white border-2 border-gray-200 
            rounded-xl 
            focus:border-green-500 focus:ring-4 focus:ring-green-100 
            transition-all duration-200
            text-gray-700
            hover:border-gray-300
            appearance-none
            cursor-pointer
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value || option} value={option.value || option}>
              {option.label || option}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
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

export default FormSelect;


