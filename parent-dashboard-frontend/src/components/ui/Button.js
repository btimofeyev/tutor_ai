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
    // Size classes now use var(--radius-md) from globals.css for consistent rounding with AuthUI
    const sizeClasses = {
      sm: `px-4 py-2 text-sm rounded-[var(--radius-md)]`,
      md: `px-6 py-2.5 text-base rounded-[var(--radius-md)]`,
      lg: `px-8 py-3 text-lg rounded-[var(--radius-md)]`,
    };

    const baseStyles =
      'font-medium inline-flex items-center justify-center transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-main active:scale-[0.97] active:shadow-inner';

    let variantSpecificClasses = ''; // Will hold .btn-primary or .btn-secondary for pastel look
    let effectClasses = '';      // For 3D border, outline, ghost specifics

    switch (variant) {
      case 'primary':
        variantSpecificClasses = 'btn-primary'; // Applies pastel blue bg, dark text
        effectClasses = `
          border-b-4 border-[var(--accent-blue-darker-for-border)] 
          hover:border-[var(--accent-blue-darker-for-border)] /* Keep border on hover */
          active:bg-[var(--accent-blue-hover)] /* Make active state use the hover bg from .btn-primary */
          shadow-sm 
          focus:ring-[var(--accent-blue)]
        `;
        break;
      case 'secondary':
        variantSpecificClasses = 'btn-secondary'; // Applies pastel yellow bg, dark text
        effectClasses = `
          border-b-4 border-[var(--accent-yellow-darker-for-border)] 
          hover:border-[var(--accent-yellow-darker-for-border)] /* Keep border on hover */
          active:bg-[var(--accent-yellow-hover)] /* Make active state use the hover bg from .btn-secondary */
          shadow-sm 
          focus:ring-[var(--accent-yellow)]
        `;
        break;
      case 'outline':
        // Outline styles are specific and don't use .btn- classes
        // Text color should be --text-primary for better contrast on --accent-blue outline if background is white
        variantSpecificClasses = `
          bg-transparent text-[var(--accent-blue)] border-2 border-[var(--accent-blue)]
          hover:bg-[var(--accent-blue)] hover:text-[var(--text-on-accent)]
          focus:ring-[var(--accent-blue)]
          active:bg-[var(--accent-blue-hover)] active:border-[var(--accent-blue-hover)]
        `;
        // Note: Outline doesn't naturally have a "bottom border shadow"
        break;
      case 'ghost':
        // Ghost styles are specific
        variantSpecificClasses = `
          bg-transparent text-[var(--accent-blue)]
          hover:bg-[var(--accent-blue)]/20  /* Use a light opacity of the accent color */
          focus:ring-[var(--accent-blue)]
        `;
        break;
      default: // Fallback to primary
        variantSpecificClasses = 'btn-primary';
        effectClasses = `
          border-b-4 border-[var(--accent-blue-darker-for-border)] 
          hover:border-[var(--accent-blue-darker-for-border)]
          active:bg-[var(--accent-blue-hover)]
          shadow-sm 
          focus:ring-[var(--accent-blue)]
        `;
    }
    
    const disabledStyles = disabled ? 'opacity-60 cursor-not-allowed !shadow-none !border-b-2' : '';

    const combinedClassName = `${baseStyles} ${sizeClasses[size]} ${variantSpecificClasses} ${effectClasses} ${disabledStyles} ${className}`;

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