import React from 'react';
import { Badge } from '../ui/Badge';
import { statusTone } from '../../utils/statusTone';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => (
  <Badge tone={statusTone(status)} size={size}>
    {status}
  </Badge>
);
