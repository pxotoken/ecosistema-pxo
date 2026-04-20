import { PhoneSignalIcon } from './icons';

export function StatusBar() {
  return (
    <div className="status-bar">
      <div className="status-time">9:41</div>
      <div className="status-icons">
        <div className="signal">
          <span />
          <span />
          <span />
          <span />
        </div>
        <PhoneSignalIcon />
        <div className="battery">
          <span />
        </div>
      </div>
    </div>
  );
}
