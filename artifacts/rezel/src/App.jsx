import { useState } from 'react';

const businesses = [
  { id: 'salon', name: 'صالون وحلاقة', label: '💇‍♀️ صالون وحلاقة' },
  { id: 'tailoring', name: 'خياطة', label: '🧵 خياطة' },
  { id: 'sweets', name: 'حلويات', label: '🍰 حلويات' },
];

function App() {
  const [selectedBusiness, setSelectedBusiness] = useState('');

  function chooseBusiness(name) {
    setSelectedBusiness(name);
    window.alert(`لقد اخترت: ${name}`);
  }

  return (
    <div className="page-shell" dir="rtl">
      <header className="topbar" aria-label="REZEL">
          <span className="elite-mark" data-testid="text-elite-mark">BB ÉLITE</span>
      </header>

      <main className="onboarding">
        <div className="brand-lockup" aria-label="REZEL">
          <span className="brand-initial" aria-hidden="true" data-testid="text-brand-initial">R</span>
          <span className="brand-name" data-testid="text-brand-name">REZEL</span>
        </div>

        <h1 className="welcome-title" data-testid="text-welcome-title">مرحباً بك 👋</h1>
        <p className="welcome-copy" data-testid="text-business-question">لنجهز تطبيقك، ما هو نشاطك؟</p>

        <div className="business-list" role="group" aria-label="اختر نشاطك التجاري">
          {businesses.map((business) => (
            <button
              key={business.name}
              data-testid={`button-business-${business.id}`}
              className={`business-option${selectedBusiness === business.name ? ' is-selected' : ''}`}
              type="button"
              aria-pressed={selectedBusiness === business.name}
              onClick={() => chooseBusiness(business.name)}
            >
              {business.label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
