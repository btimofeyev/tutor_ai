'use client';
import Link from 'next/link';
import React from 'react';

const Button = React.forwardRef(
  (
    {
      children,
      as = 'button',
      href,
      variant = 'primary',
      size = 'md',
      className = '',
      onClick,
      type = 'button',
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: `px-3 py-1.5 text-xs rounded-[var(--radius-sm)]`,
      md: `px-4 py-2 text-sm rounded-[var(--radius-md)]`,
      lg: `px-6 py-2.5 text-base rounded-[var(--radius-lg)]`,
    };

    const baseStyles =
      'font-semibold inline-flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-main active:scale-[0.98]';

    const variantStyles = {
      primary: 'btn-primary focus:ring-accent-blue-darker-for-border',
      secondary: 'btn-secondary focus:ring-accent-yellow-darker-for-border',
      danger: 'btn-danger focus:ring-red-500',
      outline: 'bg-transparent border-2 border-border-input text-text-secondary hover:bg-gray-100 hover:text-text-primary focus:ring-border-input',
      ghost: 'bg-transparent text-text-secondary hover:bg-gray-100 hover:text-text-primary focus:ring-border-input',
    };

    const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

    const combinedClassName = `${baseStyles} ${sizeClasses[size]} ${variantStyles[variant]} ${disabledStyles} ${className}`;

    if (as === 'link' && href) {
      return (
        <Link href={href} ref={ref} className={combinedClassName} {...props}>
          {children}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        className={combinedClassName}
        onClick={onClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
