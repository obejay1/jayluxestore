type CartCountBadgeProps = {
  count: number;
  className?: string;
};

export default function CartCountBadge({
  count,
  className,
}: CartCountBadgeProps) {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;

  if (safeCount <= 0) return null;

  return (
    <span className={className} aria-hidden="true">
      {safeCount > 99 ? '99+' : safeCount}
    </span>
  );
}
