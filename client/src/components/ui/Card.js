import React from 'react';

const Card = ({ 
  children, 
  title,
  subtitle,
  headerAction,
  className = '',
  padding = true,
  shadow = true,
  ...props 
}) => {
  return (
    <div 
      className={`
        bg-white rounded-2xl 
        ${shadow ? 'shadow-lg hover:shadow-xl' : ''}
        transition-all duration-300
        border border-gray-100
        ${className}
      `}
      {...props}
    >
      {(title || headerAction) && (
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            {title && <h3 className="text-xl font-bold text-gray-800">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className={padding ? 'p-6' : ''}>
        {children}
      </div>
    </div>
  );
};

export default Card;



