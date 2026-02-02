export const Button = ({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) => {
  const variantClass = `btn--${variant}`;
  const sizeClass = `btn--${size}`;
  const widthClass = fullWidth ? "btn--full" : "";

  return (
    <button
      className={`
        btn
        ${variantClass} 
        ${sizeClass} 
        ${widthClass} 
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};
