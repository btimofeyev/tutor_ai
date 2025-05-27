// components/ui/Button.js
'use client';
import Link from 'next/link';
import React from 'react';

const Button = React.forwardRef(
  (
    {
      children,
      as = 'button',
      href,
      variant = 'primary', // 'primary', 'secondary', 'outline', 'ghost'
      size = 'md', // 'sm', 'md', 'lg'
      className = '',
      onClick,
      type = 'button',
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'px-4 py-2 text-sm rounded-md',
      md: 'px-6 py-2.5 text-base rounded-lg', // Default size, slightly reduced padding for 3D
      lg: 'px-8 py-3 text-lg rounded-lg',
    };

    const baseStyles =
      'font-medium inline-flex items-center justify-center transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-main active:scale-[0.97] active:shadow-inner';
    
    // 3D Effect: A slightly darker bottom border for the shadow, and an inset shadow on active
    // We'll use pseudo-elements for a more robust shadow if needed, but for now, border + box-shadow

    let variantStyles = '';
    switch (variant) {
      case 'primary':
        variantStyles = `
          bg-accent-blue text-text-on-accent 
          border-b-4 border-blue-700 hover:border-blue-800 
          shadow-sm hover:bg-accent-blue-hover active:bg-blue-700 
          focus:ring-accent-blue
        `;
        // On active, the border-bottom might become less visible.
        // The active:scale and active:shadow-inner will give the "pressed" feel.
        break;
      case 'secondary':
        variantStyles = `
          bg-gray-200 text-text-primary 
          border-b-4 border-gray-400 hover:border-gray-500 
          shadow-sm hover:bg-gray-300 active:bg-gray-400 
          focus:ring-gray-400
        `;
        break;
      case 'outline': // Added for variety
        variantStyles = `
          bg-transparent text-accent-blue border-2 border-accent-blue 
          hover:bg-accent-blue hover:text-text-on-accent 
          focus:ring-accent-blue 
          active:bg-blue-700 active:border-blue-700
        `; // Outline doesn't lend itself as well to the "bottom border shadow"
        break;
      case 'ghost': // Added for variety
        variantStyles = `
          bg-transparent text-accent-blue 
          hover:bg-blue-50 
          focus:ring-accent-blue
        `; // Ghost also not for 3D effect
        break;
      default:
        variantStyles = `
          bg-accent-blue text-text-on-accent 
          border-b-4 border-blue-700 
          shadow-sm hover:bg-accent-blue-hover active:bg-blue-700 
          focus:ring-accent-blue
        `;
    }
    
    const disabledStyles = disabled ? 'opacity-60 cursor-not-allowed !shadow-none !border-b-2' : '';

    const combinedClassName = `${baseStyles} ${sizeClasses[size]} ${variantStyles} ${disabledStyles} ${className}`;

    if (as === 'link' && href) {
      return (
        <Link href={href} legacyBehavior>
          <a ref={ref} className={combinedClassName} {...props}>
            {children}
          </a>
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