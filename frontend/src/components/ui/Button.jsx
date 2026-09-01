const variants = {
  default: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  destructive: 'btn-destructive',
};

const sizes = {
  sm: 'btn-sm',
  default: '',
  lg: 'btn-lg',
  icon: 'btn-icon',
};

export function Button({ variant = 'default', size = 'default', className = '', children, ...props }) {
  return (
    <button
      className={`btn ${variants[variant] || ''} ${sizes[size] || ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
