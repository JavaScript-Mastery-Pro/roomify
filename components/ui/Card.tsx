export const Card = ({
  children,
  className = "",
  title,
  action,
}: CardProps) => {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="header">
          {title && <h3>{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
