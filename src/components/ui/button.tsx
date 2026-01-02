import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'default': 'bg-primary text-primary-foreground hover:bg-primary/90',
            'outline': 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
            'ghost': 'hover:bg-accent hover:text-accent-foreground',
          }[variant],
          {
            'default': 'h-10 px-4 py-2',
            'sm': 'h-9 rounded-md px-3',
            'lg': 'h-11 rounded-md px-8',
          }[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
export { Button };