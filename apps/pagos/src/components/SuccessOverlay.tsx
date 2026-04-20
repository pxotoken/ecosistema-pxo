import { CheckIcon } from './icons';

export interface SuccessState {
  title: string;
  subtitle: string;
  amount: string;
}

interface Props {
  show: boolean;
  state: SuccessState;
  onClose: () => void;
}

export function SuccessOverlay({ show, state, onClose }: Props) {
  return (
    <div className={`success-overlay${show ? ' show' : ''}`}>
      <div className="success-check">
        <CheckIcon />
      </div>
      <div className="success-title">{state.title}</div>
      <div className="success-sub">{state.subtitle}</div>
      <div className="success-amount">{state.amount}</div>
      <button className="success-btn" onClick={onClose}>
        Volver al inicio
      </button>
    </div>
  );
}
