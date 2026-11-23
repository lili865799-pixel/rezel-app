import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      // التحقق إذا كان المستخدم قد اختار نشاطه من قبل
      const savedBusiness = localStorage.getItem('businessType'); 
      if (savedBusiness) {
        navigate('/dashboard');
      } else {
        navigate('/'); 
      }
    }, 2000); // ثانيتان

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      backgroundColor: '#F7F1E8' 
    }}>
      <img 
        src="/images/icon_png768.jpg" 
        alt="BB ÉLITE" 
        style={{ width: '250px', height: 'auto' }} 
      />
    </div>
  );
}
