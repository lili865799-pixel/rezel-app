import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessType } from './db.js';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      let savedBusiness = '';
      try {
        savedBusiness = await getBusinessType();
      } catch {
        // If IndexedDB is unavailable, send the user to setup rather than looping.
      }

      if (!cancelled) {
        const destination = typeof savedBusiness === 'string' && savedBusiness.trim()
          ? '/dashboard'
          : '/onboarding';
        navigate(destination, { replace: true });
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="splash-frame" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#F7F1E8',
    }}>
      <img 
        src="/images/icon_pgn768.jpg" 
        alt="BB ÉLITE" 
        style={{ width: '250px', height: 'auto' }} 
      />
    </div>
  );
}
