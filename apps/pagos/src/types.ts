export type ScreenId =
  | 'home'
  | 'enviar'
  | 'recibir'
  | 'pagar'
  | 'escanear'
  | 'pagar-manual'
  | 'pagar-confirm'
  | 'cargar'
  | 'cargar-confirm'
  | 'actividad'
  | 'cobrar'
  | 'perfil';

export type MovementType = 'in' | 'out' | 'load' | 'pay';

export interface Movement {
  id: string;
  type: MovementType;
  title: string;
  subtitle: string;
  amount: string;
  day: string;
}

export interface Contact {
  id: string;
  initials: string;
  name: string;
  subtitle: string;
  avatarClass: string;
}

export interface UserProfile {
  name: string;
  alias: string;
  walletShort: string;
  walletFull: string;
}

export interface WalletBalance {
  whole: string;
  cents: string;
  equivalent: string;
}

export interface ActivitySummary {
  label: string;
  income: string;
  outcome: string;
}

export interface MerchantPreview {
  initials: string;
  name: string;
  location: string;
  whole: string;
  cents: string;
  rate: string;
}

export interface CardPreview {
  whole: string;
  cents: string;
  number: string;
  pos: string;
}
