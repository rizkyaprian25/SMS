import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' | string;
  style?: React.CSSProperties;
  className?: string;
  withDot?: boolean;
}

export function Badge({
  children,
  variant = 'neutral',
  style,
  className = '',
  withDot = true,
}: BadgeProps) {
  const customVariant = variant === 'primary' ? 'badge-info' : `badge-${variant}`;

  return (
    <span
      className={`badge ${customVariant} ${className}`.trim()}
      style={style}
    >
      {withDot && <span className="badge-dot" />}
      <span>{children}</span>
    </span>
  );
}

export function StatusKehadiranBadge({ status }: { status: string }) {
  switch (status) {
    case 'HADIR':
      return <Badge variant="success">Hadir</Badge>;
    case 'IZIN':
      return <Badge variant="info">Izin</Badge>;
    case 'SAKIT':
      return <Badge variant="warning">Sakit</Badge>;
    case 'ALPA':
      return <Badge variant="danger">Alpa</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function StatusIzinBadge({ status }: { status: string }) {
  switch (status) {
    case 'DISETUJUI':
      return <Badge variant="success">Disetujui</Badge>;
    case 'DIAJUKAN':
      return <Badge variant="warning">Menunggu Validasi</Badge>;
    case 'DITOLAK':
      return <Badge variant="danger">Ditolak</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}
