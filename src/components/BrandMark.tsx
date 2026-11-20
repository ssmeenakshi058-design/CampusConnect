import React, { useState } from 'react';
import { Building2, CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react';

export function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackTitle,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 text-slate-500 border border-slate-200 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Building2 className="w-6 h-6 text-slate-400 mb-1.5" />
        {fallbackTitle && (
          <span className="text-xs font-medium text-slate-600 px-3 text-center truncate max-w-full">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function CompanyAvatar({
  name,
  logoUrl,
  size = 'md',
}: {
  name: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const sizeClasses =
    size === 'sm'
      ? 'w-9 h-9 text-xs'
      : size === 'lg'
        ? 'w-14 h-14 text-base'
        : 'w-11 h-11 text-sm';

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${sizeClasses} rounded-lg object-cover border border-slate-200 bg-white shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-lg border border-slate-200 bg-slate-100 text-slate-800 font-display font-bold flex items-center justify-center shrink-0`}
      aria-label={`${name} monogram`}
    >
      {initials || 'CC'}
    </div>
  );
}

export function VerifiedInlineStatus({
  isVerified,
  status,
}: {
  isVerified: boolean;
  status: string;
}) {
  if (isVerified && status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
        <ShieldCheck className="w-3.5 h-3.5" />
        Verified
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
        <Clock className="w-3.5 h-3.5" />
        Pending Review
      </span>
    );
  }
  if (status === 'rejected' || status === 'closed' || status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 whitespace-nowrap shrink-0 capitalize">
        <XCircle className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 whitespace-nowrap shrink-0 capitalize">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {status}
    </span>
  );
}

export function StatusTextLabel({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let colorClass = 'text-slate-700';
  if (['verified', 'selected', 'active', 'resolved', 'upcoming'].includes(normalized)) {
    colorClass = 'text-emerald-700';
  } else if (['shortlisted', 'interview_scheduled', 'under_review', 'investigating', 'pending'].includes(normalized)) {
    colorClass = 'text-amber-700';
  } else if (['rejected', 'suspended', 'closed', 'expired', 'cancelled', 'open'].includes(normalized)) {
    colorClass = 'text-red-700';
  }
  const formatted = status.replace(/_/g, ' ');
  return (
    <span className={`text-xs font-semibold capitalize whitespace-nowrap ${colorClass}`}>
      {formatted}
    </span>
  );
}
