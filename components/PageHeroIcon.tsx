import type { LucideIcon } from 'lucide-react';

type PageHeroIconProps = {
  icon: LucideIcon;
  label: string;
};

export default function PageHeroIcon({ icon: Icon, label }: PageHeroIconProps) {
  return (
    <span className="jl-page-hero-icon" role="img" aria-label={label}>
      <Icon size={28} strokeWidth={1.7} aria-hidden="true" />
    </span>
  );
}
