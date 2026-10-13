import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-foreground text-background',
        brand: 'bg-brand-subtle text-brand-subtle-foreground',
        success: 'bg-success-subtle text-success',
        danger: 'bg-danger-subtle text-danger',
        warning: 'bg-warning-subtle text-warning',
        outline: 'border border-border text-foreground',
        muted: 'bg-surface text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Badge = forwardRef(function Badge({ className, variant, ...props }, ref) {
  return <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
});

export { Badge, badgeVariants };
