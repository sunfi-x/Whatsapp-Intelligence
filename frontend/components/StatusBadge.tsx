import React from 'react';
import { AIStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: AIStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sz = {
    sm: 'text-[10px] px-2.5 py-0.5 font-bold',
    md: 'text-xs px-3 py-1 font-bold tracking-wide',
    lg: 'text-sm px-4 py-1.5 font-extrabold tracking-wide',
  }[size];

  if (status === 'ACTIVE') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full ${sz} shadow-sm`}
        style={{
          backgroundColor: '#E8F5E9',
          color: '#05392E',
          border: '1px solid rgba(5, 57, 46, 0.25)',
        }}
      >
        <span className="h-2 w-2 rounded-full bg-[#25D366] halo-active" />
        🟢 AI ACTIVE
      </span>
    );
  }

  if (status === 'PENDING') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full ${sz} shadow-sm`}
        style={{
          backgroundColor: '#FFF8E1',
          color: '#E65100',
          border: '1px solid #FFB300',
        }}
      >
        <span className="h-2 w-2 rounded-full bg-[#F4B400]" />
        🟡 PENDING APPROVAL
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sz}`}
      style={{
        backgroundColor: '#F7FAF9',
        color: '#667781',
        border: '1px solid #E5EAEA',
      }}
    >
      <span className="h-2 w-2 rounded-full bg-[#90A4AE]" />
      🔴 AI OFF
    </span>
  );
};
