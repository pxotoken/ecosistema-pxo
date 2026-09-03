import React from 'react';

// Inline stroke icons used by the Orbi landing. Kept local to the landing so the
// markup stays a 1:1 port of docs/looks/pxo-landing-orbi.html.

interface IconProps {
  size?: number;
  strokeWidth?: number;
}

const Svg: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 16,
  strokeWidth = 2,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const ArrowRightIcon: React.FC<IconProps> = (props) => (
  <Svg strokeWidth={2.5} {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </Svg>
);

export const ChevronDownIcon: React.FC<IconProps> = (props) => (
  <Svg strokeWidth={2.5} {...props}>
    <polyline points="6 9 12 15 18 9" />
  </Svg>
);

export const ChevronUpIcon: React.FC<IconProps> = (props) => (
  <Svg strokeWidth={2.5} {...props}>
    <polyline points="18 15 12 9 6 15" />
  </Svg>
);

export const PlusIcon: React.FC<IconProps> = (props) => (
  <Svg strokeWidth={2.2} {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

export const ArrowUpRightIcon: React.FC<IconProps> = (props) => (
  <Svg strokeWidth={2.2} {...props}>
    <polyline points="7 17 17 7" />
    <polyline points="7 7 17 7 17 17" />
  </Svg>
);

export const SendIcon: React.FC<IconProps> = (props) => (
  <Svg strokeWidth={2.2} {...props}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Svg>
);

export const ReceiveIcon: React.FC<IconProps> = (props) => (
  <Svg strokeWidth={2.2} {...props}>
    <polyline points="8 17 12 21 16 17" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </Svg>
);

export const UserIcon: React.FC<IconProps> = (props) => (
  <Svg strokeWidth={1.8} {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
);

export const BankIcon: React.FC<IconProps> = (props) => (
  <Svg strokeWidth={1.8} {...props}>
    <line x1="3" y1="22" x2="21" y2="22" />
    <line x1="6" y1="18" x2="6" y2="11" />
    <line x1="10" y1="18" x2="10" y2="11" />
    <line x1="14" y1="18" x2="14" y2="11" />
    <line x1="18" y1="18" x2="18" y2="11" />
    <polygon points="12 2 20 7 4 7" />
  </Svg>
);

export const ZapIcon: React.FC<IconProps> = (props) => (
  <Svg strokeWidth={1.8} {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Svg>
);

export const ShieldIcon: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Svg>
);

export const GlobeIcon: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Svg>
);

export const CheckIcon: React.FC<IconProps> = (props) => (
  <Svg strokeWidth={2.5} {...props}>
    <polyline points="20 6 9 17 4 12" />
  </Svg>
);

export const ClockIcon: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Svg>
);

export const LockIcon: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

export const FileIcon: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </Svg>
);

export const FlagIcon: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </Svg>
);
