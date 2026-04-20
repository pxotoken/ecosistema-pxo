import type { ReactNode } from 'react';
import { ChevronLeftIcon } from './icons';

interface Props {
  title: string;
  onBack: () => void;
  rightAction?: ReactNode;
}

export function ScreenHeader({ title, onBack, rightAction }: Props) {
  return (
    <div className="scr-header">
      <div className="back-btn" onClick={onBack}>
        <ChevronLeftIcon />
      </div>
      <div className="scr-title">{title}</div>
      {rightAction ?? <div className="scr-spacer" />}
    </div>
  );
}
