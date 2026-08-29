import React from 'react';
import { useMessages } from '../../i18n';

export const OrbiStatStrip: React.FC = () => {
  const { stats } = useMessages();

  const items = [
    { num: stats.usersNum, label: stats.usersLabel },
    { num: stats.backedNum, label: stats.backedLabel },
    { num: stats.speiNum, label: stats.speiLabel },
  ];

  return (
    <div className="stat-strip">
      <div className="stat-inner">
        {items.map((stat, index) => (
          <React.Fragment key={stat.label}>
            {index > 0 && <div className="stat-div" />}
            <div className="stat-item">
              <span className="stat-num">{stat.num}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
