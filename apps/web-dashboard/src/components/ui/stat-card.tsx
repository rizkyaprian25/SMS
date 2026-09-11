import React from 'react';

export interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  subText?: string;
  subtitle?: string;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue' | string;
  colorVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | string;
  icon: React.ReactNode;
  badgeText?: string;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export function StatCard({
  label,
  title,
  value,
  subText,
  subtitle,
  color,
  colorVariant,
  icon,
  badgeText,
  badgeVariant = 'neutral',
}: StatCardProps) {
  const displayTitle = label ?? title ?? '';
  const displaySub = subText ?? subtitle;

  // Normalisasi varian warna ikon
  const rawVariant = colorVariant ?? color ?? 'indigo';
  const getNormalizedColor = (v: string): 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue' => {
    switch (v) {
      case 'success':
      case 'emerald':
        return 'emerald';
      case 'warning':
      case 'amber':
        return 'amber';
      case 'danger':
      case 'rose':
        return 'rose';
      case 'info':
      case 'blue':
        return 'blue';
      case 'primary':
      case 'indigo':
      default:
        return 'indigo';
    }
  };

  const iconColor = getNormalizedColor(rawVariant);

  return (
    <div className="stat-card-modern">
      <div className={`stat-icon-wrapper ${iconColor}`}>
        {icon}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-muted)',
              lineHeight: 1.25,
            }}
          >
            {displayTitle}
          </span>
          {badgeText && (
            <span className={`badge badge-${badgeVariant}`} style={{ fontSize: 10, padding: '1px 6px' }}>
              {badgeText}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: 'var(--text-main)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              fontFeatureSettings: "'tnum' 1",
            }}
          >
            {value}
          </span>
        </div>

        {displaySub && (
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginTop: 4,
              lineHeight: 1.3,
            }}
          >
            {displaySub}
          </span>
        )}
      </div>
    </div>
  );
}
