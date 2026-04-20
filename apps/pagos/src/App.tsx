import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from './components/StatusBar';
import { BottomNav } from './components/BottomNav';
import { SuccessOverlay, type SuccessState } from './components/SuccessOverlay';
import { Toast } from './components/Toast';
import { Home } from './screens/Home';
import { Enviar } from './screens/Enviar';
import { Recibir } from './screens/Recibir';
import { Pagar } from './screens/Pagar';
import { PagarManual } from './screens/PagarManual';
import { PagarConfirm } from './screens/PagarConfirm';
import { Cargar } from './screens/Cargar';
import { CargarConfirm } from './screens/CargarConfirm';
import { Actividad } from './screens/Actividad';
import type { ScreenId } from './types';

const EMPTY_SUCCESS: SuccessState = { title: '', subtitle: '', amount: '' };

export default function App() {
  const [active, setActive] = useState<ScreenId>('home');
  const [leaving, setLeaving] = useState<ScreenId | null>(null);
  const [success, setSuccess] = useState<SuccessState>(EMPTY_SUCCESS);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  const navigate = useCallback(
    (next: ScreenId) => {
      if (next === active) return;
      setLeaving(active);
      setActive(next);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      leaveTimer.current = setTimeout(() => setLeaving(null), 350);
    },
    [active],
  );

  const showToast = useCallback((message: string) => {
    setToast({ message, show: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2200);
  }, []);

  const finishWithSuccess = useCallback((title: string, subtitle: string, amount: string) => {
    setSuccess({ title, subtitle, amount: `${amount} PXO` });
    setShowSuccess(true);
  }, []);

  const closeSuccess = useCallback(() => {
    setShowSuccess(false);
    setTimeout(() => navigate('home'), 200);
  }, [navigate]);

  const classFor = (id: ScreenId) => {
    if (id === active) return 'screen active';
    if (id === leaving) return 'screen leaving';
    return 'screen';
  };

  return (
    <>
      <div className="shell-label">PXO Wallet · POC Demo</div>

      <div className="device">
        <div className="island" />
        <StatusBar />

        <div className="screens-wrap">
          <div className={classFor('home')}>
            <Home onNavigate={navigate} />
          </div>
          <div className={classFor('enviar')}>
            <Enviar
              onBack={() => navigate('home')}
              onSuccess={finishWithSuccess}
              onNavigate={navigate}
            />
          </div>
          <div className={classFor('recibir')}>
            <Recibir onBack={() => navigate('home')} onToast={showToast} />
          </div>
          <div className={classFor('pagar')}>
            <Pagar onBack={() => navigate('home')} onNavigate={navigate} />
          </div>
          <div className={classFor('pagar-manual')}>
            <PagarManual
              onBack={() => navigate('pagar')}
              onNavigate={navigate}
              onSuccess={finishWithSuccess}
            />
          </div>
          <div className={classFor('pagar-confirm')}>
            <PagarConfirm
              onBack={() => navigate('pagar')}
              onConfirm={finishWithSuccess}
              onCancel={() => navigate('pagar')}
            />
          </div>
          <div className={classFor('cargar')}>
            <Cargar onBack={() => navigate('home')} onNavigate={navigate} />
          </div>
          <div className={classFor('cargar-confirm')}>
            <CargarConfirm onBack={() => navigate('cargar')} onConfirm={finishWithSuccess} />
          </div>
          <div className={classFor('actividad')}>
            <Actividad onBack={() => navigate('home')} onToast={showToast} />
          </div>
        </div>

        <BottomNav
          active={active}
          onNavigate={navigate}
          onProfile={() => showToast('Perfil (demo)')}
        />

        <div className="home-ind" />
        <SuccessOverlay show={showSuccess} state={success} onClose={closeSuccess} />
        <Toast message={toast.message} show={toast.show} />
      </div>
    </>
  );
}
