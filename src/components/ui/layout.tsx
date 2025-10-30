import React from 'react';

interface ContainerProps {
  className?: string;
  children: React.ReactNode;
}

export function Container({ className = '', children }: ContainerProps) {
  return (
    <div className={`container mx-auto px-4 py-8 ${className}`}>
      {children}
    </div>
  );
}

interface GridProps {
  columns?: number;
  gap?: number;
  className?: string;
  children: React.ReactNode;
}

export function Grid({ columns = 3, gap = 6, className = '', children }: GridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-${gap} ${className}`}>
      {children}
    </div>
  );
}

interface SectionProps {
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function Section({ title, description, className = '', children }: SectionProps) {
  return (
    <section className={`py-12 ${className}`}>
      {(title || description) && (
        <div className="text-center mb-12">
          {title && <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>}
          {description && <p className="text-xl text-gray-600 max-w-2xl mx-auto">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}