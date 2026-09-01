const variants = {
  default: 'badge-default',
  secondary: 'badge-secondary',
  success: 'badge-success',
  warning: 'badge-warning',
  destructive: 'badge-destructive',
  info: 'badge-info',
};

export function Badge({ variant = 'default', className = '', children, ...props }) {
  return (
    <span className={`badge ${variants[variant] || variants.default} ${className}`} {...props}>
      {children}
    </span>
  );
}
