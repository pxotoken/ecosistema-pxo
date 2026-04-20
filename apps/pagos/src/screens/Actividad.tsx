import { useMemo, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CardIcon,
  FilterIcon,
  QrIcon,
  SearchIcon,
} from '../components/icons';
import { activity, activitySummary } from '../data/mockData';
import type { MovementType } from '../types';

type Filter = 'all' | MovementType;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'in', label: 'Recibido' },
  { id: 'out', label: 'Enviado' },
  { id: 'load', label: 'Cargas' },
  { id: 'pay', label: 'Pagos' },
];

interface Props {
  onBack: () => void;
  onToast: (msg: string) => void;
}

function RowIcon({ type }: { type: MovementType }) {
  if (type === 'in') return <ArrowDownLeftIcon width={18} height={18} />;
  if (type === 'out') return <ArrowUpRightIcon width={18} height={18} />;
  if (type === 'load') return <CardIcon />;
  return <QrIcon width={16} height={16} />;
}

export function Actividad({ onBack, onToast }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(
    () => (filter === 'all' ? activity : activity.filter((m) => m.type === filter)),
    [filter],
  );

  const groupedByDay = useMemo(() => {
    const map = new Map<string, typeof activity>();
    for (const item of visible) {
      const list = map.get(item.day) ?? [];
      list.push(item);
      map.set(item.day, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  const showDetail = (name: string, amount: string) => {
    const sign = amount.startsWith('+') ? 'Recibiste' : 'Enviaste';
    onToast(`${sign} ${amount} PXO · ${name}`);
  };

  return (
    <>
      <ScreenHeader
        title="Tu actividad"
        onBack={onBack}
        rightAction={
          <div className="back-btn" onClick={() => onToast('Filtros (demo)')}>
            <FilterIcon />
          </div>
        }
      />

      <div className="act-summary">
        <div className="act-summary-label">{activitySummary.label}</div>
        <div className="act-summary-row">
          <div className="act-stat">
            <div className="act-stat-icon in">
              <ArrowDownLeftIcon width={14} height={14} />
            </div>
            <div>
              <div className="act-stat-num">{activitySummary.income}</div>
              <div className="act-stat-lbl">Ingresos</div>
            </div>
          </div>
          <div className="act-stat-divider" />
          <div className="act-stat">
            <div className="act-stat-icon out">
              <ArrowUpRightIcon width={14} height={14} />
            </div>
            <div>
              <div className="act-stat-num">{activitySummary.outcome}</div>
              <div className="act-stat-lbl">Egresos</div>
            </div>
          </div>
        </div>
      </div>

      <div className="act-filters">
        {FILTERS.map(({ id, label }) => (
          <div
            key={id}
            className={`act-filter${filter === id ? ' on' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="act-list">
        {groupedByDay.length === 0 ? (
          <div className="act-empty">
            <div className="act-empty-ic">
              <SearchIcon />
            </div>
            <div className="act-empty-txt">
              No hay movimientos
              <br />
              de este tipo
            </div>
          </div>
        ) : (
          groupedByDay.map(([day, rows]) => (
            <div key={day}>
              <div className="act-day-label">{day}</div>
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="act-row"
                  onClick={() => showDetail(row.title, row.amount)}
                >
                  <div className={`act-row-ic ${row.type}`}>
                    <RowIcon type={row.type} />
                  </div>
                  <div className="act-row-info">
                    <div className="act-row-title">{row.title}</div>
                    <div className="act-row-sub">{row.subtitle}</div>
                  </div>
                  <div className={`act-row-amt${row.amount.startsWith('+') ? ' in' : ''}`}>
                    {row.amount}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}
