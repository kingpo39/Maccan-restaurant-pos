export function Card({ className = '', children, hover = false, ...props }) {
  return (
    <div
      className={`card ${hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }) {
  return (
    <div className={`flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }) {
  return (
    <h3 className={`text-sm font-medium text-muted-foreground ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className = '', children, ...props }) {
  return (
    <div className={`px-6 pb-5 ${className}`} {...props}>
      {children}
    </div>
  );
}
