import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center select-none', className)}>
      <div className="w-16 h-16 rounded-full bg-[#E0E5EC] neu-inset flex items-center justify-center mb-4 text-[#6C63FF]">
        <Icon className="h-7 w-7 text-[#6C63FF]" />
      </div>
      <h3 className="text-base font-bold font-heading text-[#3D4852] mb-1.5 tracking-tight">{title}</h3>
      <p className="text-xs text-[#6B7280] font-body text-center max-w-md mb-5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
