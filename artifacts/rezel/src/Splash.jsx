import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessType } from './db.js';
import BrandHeader from './BrandHeader.jsx';

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      let hasBusiness = false;

      try {
        const business = await getBusinessType();
        hasBusiness = typeof business === 'string' && Boolean(business.trim());
      } catch {
        // If local storage is unavailable, let the user retry setup.
      }

      if (!cancelled) {
        navigate(hasBusiness ? '/dashboard' : '/onboarding', { replace: true });
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [navigate]);

  return (
    <div className="app-frame splash-frame" dir="rtl" data-testid="page-splash">
      <BrandHeader />
      <main className="splash-content" aria-label="REZEL">
        <span className="splash-monogram" aria-hidden="true">R</span>
        <p className="splash-name">REZEL</p>
        <p className="splash-elite">BB ÉLITE</p>
        <span className="splash-loader" role="status" aria-label="جارٍ التحميل" />
      </main>
    </div>
  );
}

export default Splash;
