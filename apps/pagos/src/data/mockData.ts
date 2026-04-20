import type {
  ActivitySummary,
  CardPreview,
  Contact,
  MerchantPreview,
  Movement,
  UserProfile,
  WalletBalance,
} from '../types';
import { USE_MOCK_DATA } from '../config/env';

const mockProfile: UserProfile = {
  name: 'Agustina',
  alias: 'agustina.busto.pxo',
  walletShort: '0x7A3f...9bE2',
  walletFull: '0x7A3f9C2eB1D4f8C6a5B2e9D7F3c8A1B4E6D5C9bE2',
};

const mockBalance: WalletBalance = {
  whole: '12,480',
  cents: '.50',
  equivalent: '$12,480.50 MXN',
};

const mockRecentMovements: Movement[] = [
  {
    id: 'home-1',
    type: 'in',
    title: 'De Carlos M.',
    subtitle: 'Hoy · 11:24',
    amount: '+850.00',
    day: 'Hoy · 20 abr',
  },
  {
    id: 'home-2',
    type: 'pay',
    title: 'Café Avellaneda',
    subtitle: 'Ayer · Pago QR',
    amount: '−145.00',
    day: 'Ayer · 19 abr',
  },
  {
    id: 'home-3',
    type: 'load',
    title: 'Carga con tarjeta',
    subtitle: '15 abr · OXXO',
    amount: '+5,000.00',
    day: '15 abr',
  },
  {
    id: 'home-4',
    type: 'out',
    title: 'A Sofía L.',
    subtitle: '12 abr · Transferencia',
    amount: '−320.00',
    day: '12 abr',
  },
];

const mockContacts: Contact[] = [
  { id: 'c1', initials: 'CM', name: 'Carlos Mendoza', subtitle: '+52 55 1234 5678', avatarClass: 'av-1' },
  { id: 'c2', initials: 'SL', name: 'Sofía López', subtitle: '+52 55 9876 5432', avatarClass: 'av-2' },
  { id: 'c3', initials: 'DR', name: 'Diego Ruiz', subtitle: 'diego@pxo.mx', avatarClass: 'av-3' },
  { id: 'c4', initials: 'MF', name: 'María Fernández', subtitle: '+52 33 5566 7788', avatarClass: 'av-4' },
  { id: 'c5', initials: 'PV', name: 'Pablo Vega', subtitle: '+52 81 4433 2211', avatarClass: 'av-5' },
];

const mockActivitySummary: ActivitySummary = {
  label: 'Abril 2026',
  income: '+5,850',
  outcome: '−465',
};

const mockActivity: Movement[] = [
  { id: 'a1', type: 'in', title: 'De Carlos M.', subtitle: 'Transferencia · 11:24', amount: '+850.00', day: 'Hoy · 20 abr' },
  { id: 'a2', type: 'pay', title: 'Café Avellaneda', subtitle: 'Pago QR · 18:42', amount: '−145.00', day: 'Ayer · 19 abr' },
  { id: 'a3', type: 'pay', title: 'Mercado Roma', subtitle: 'Pago QR · 14:10', amount: '−89.50', day: 'Ayer · 19 abr' },
  { id: 'a4', type: 'load', title: 'Carga con tarjeta', subtitle: 'OXXO Reforma · 09:15', amount: '+5,000.00', day: '15 abr' },
  { id: 'a5', type: 'out', title: 'A Sofía L.', subtitle: 'Transferencia · 20:05', amount: '−320.00', day: '12 abr' },
  { id: 'a6', type: 'pay', title: 'Uber', subtitle: 'Pago QR · 22:30', amount: '−68.00', day: '10 abr' },
];

const mockMerchantPreview: MerchantPreview = {
  initials: 'CA',
  name: 'Café Avellaneda',
  location: 'Roma Norte, CDMX',
  whole: '185',
  cents: '.00',
  rate: '1 PXO = 1 MXN',
};

const mockCardPreview: CardPreview = {
  whole: '1,000',
  cents: '.00',
  number: '•••• •••• •••• 4829',
  pos: 'OXXO · Reforma',
};

const mockEnvAmount = '500';

const emptyProfile: UserProfile = {
  name: '',
  alias: '',
  walletShort: '',
  walletFull: '',
};

const emptyBalance: WalletBalance = {
  whole: '0',
  cents: '.00',
  equivalent: '$0.00 MXN',
};

const emptyActivitySummary: ActivitySummary = {
  label: 'Abril 2026',
  income: '+0',
  outcome: '−0',
};

const emptyMerchantPreview: MerchantPreview = {
  initials: '··',
  name: 'Comercio',
  location: '—',
  whole: '0',
  cents: '.00',
  rate: '1 PXO = 1 MXN',
};

const emptyCardPreview: CardPreview = {
  whole: '0',
  cents: '.00',
  number: '•••• •••• •••• ····',
  pos: '—',
};

export const profile: UserProfile = USE_MOCK_DATA ? mockProfile : emptyProfile;
export const balance: WalletBalance = USE_MOCK_DATA ? mockBalance : emptyBalance;
export const recentMovements: Movement[] = USE_MOCK_DATA ? mockRecentMovements : [];
export const contacts: Contact[] = USE_MOCK_DATA ? mockContacts : [];
export const activitySummary: ActivitySummary = USE_MOCK_DATA ? mockActivitySummary : emptyActivitySummary;
export const activity: Movement[] = USE_MOCK_DATA ? mockActivity : [];
export const merchantPreview: MerchantPreview = USE_MOCK_DATA ? mockMerchantPreview : emptyMerchantPreview;
export const cardPreview: CardPreview = USE_MOCK_DATA ? mockCardPreview : emptyCardPreview;
export const initialEnvAmount: string = USE_MOCK_DATA ? mockEnvAmount : '';
export const quickAmounts: number[] = [100, 500, 1000, 5000];
