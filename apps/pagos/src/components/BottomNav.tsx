import type { ScreenId } from '../types';
import { ActivityIcon, HomeIcon, QrIcon, UserIcon } from './icons';

interface Props {
  active: ScreenId;
  onNavigate: (id: ScreenId) => void;
  onProfile: () => void;
}

const ITEMS: { id: ScreenId | 'perfil'; label: string; screen?: ScreenId; Icon: typeof HomeIcon }[] = [
  { id: 'home', screen: 'home', label: 'Inicio', Icon: HomeIcon },
  { id: 'actividad', screen: 'actividad', label: 'Actividad', Icon: ActivityIcon },
  { id: 'pagar', screen: 'pagar', label: 'Pagar', Icon: QrIcon },
  { id: 'perfil', label: 'Perfil', Icon: UserIcon },
];

export function BottomNav({ active, onNavigate, onProfile }: Props) {
  return (
    <div className="bnav">
      {ITEMS.map(({ id, label, screen, Icon }) => {
        const isOn = screen === active;
        return (
          <div
            key={id}
            className={`bnav-item${isOn ? ' on' : ''}`}
            onClick={() => (screen ? onNavigate(screen) : onProfile())}
          >
            <Icon />
            <div className="bnav-lb">{label}</div>
          </div>
        );
      })}
    </div>
  );
}
