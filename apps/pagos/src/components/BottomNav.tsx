import type { ScreenId } from '../types';
import { POS_MODE_ENABLED } from '../config/env';
import { ActivityIcon, HomeIcon, QrIcon, UserIcon } from './icons';

interface Props {
  active: ScreenId;
  onNavigate: (id: ScreenId) => void;
}

const BASE_ITEMS: { id: ScreenId; label: string; Icon: typeof HomeIcon }[] = [
  { id: 'home', label: 'Inicio', Icon: HomeIcon },
  { id: 'actividad', label: 'Actividad', Icon: ActivityIcon },
  { id: 'pagar', label: 'Pagar', Icon: QrIcon },
  { id: 'perfil', label: 'Perfil', Icon: UserIcon },
];

const POS_ITEM: (typeof BASE_ITEMS)[number] = {
  id: 'cobrar',
  label: 'Cobrar',
  Icon: QrIcon,
};

export function BottomNav({ active, onNavigate }: Props) {
  const items = POS_MODE_ENABLED
    ? [BASE_ITEMS[0], BASE_ITEMS[1], BASE_ITEMS[2], POS_ITEM, BASE_ITEMS[3]]
    : BASE_ITEMS;

  return (
    <div className="bnav">
      {items.map(({ id, label, Icon }) => {
        const isOn = id === active;
        return (
          <div
            key={id}
            className={`bnav-item${isOn ? ' on' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon />
            <div className="bnav-lb">{label}</div>
          </div>
        );
      })}
    </div>
  );
}
