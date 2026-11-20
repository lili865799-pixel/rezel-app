import { useCallback, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useOutletContext,
} from 'react-router-dom';
import { getBusinessType, saveBusinessType } from './db.js';
import Dashboard from './Dashboard.jsx';
import Customers from './Customers.jsx';
import Services from './Services.jsx';

const businesses = [
  { id: 'salon', name: 'صالون وحلاقة', mark: '💇‍♀️' },
  { id: 'tailoring', name: 'خياطة', mark: '🧵' },
  { id: 'sweets', name: 'حلويات', mark: '🍰' },
];

const navigation = [
  { to: '/dashboard', label: 'الرئيسية', id: 'home' },
  { to: '/calendar', label: 'المواعيد', id: 'calendar' },
  { to: '/customers', label: 'العملاء', id: 'customers' },
  { to: '/services', label: 'الخدمات', id: 'services' },
  { to: '/more', label: 'المزيد', id: 'more' },
];

const placeholderPages = {
  calendar: {
    title: 'المواعيد',
    subtitle: 'نظّم يومك ومواعيد نشاطك من مكان واحد.',
    empty: 'لا توجد مواعيد حتى الآن',
    detail: 'عندما تبدأ بإضافة المواعيد، ستجد جدولك اليومي هنا.',
  },
  customers: {
    title: 'العملاء',
    subtitle: 'كل علاقاتك في مساحة مرتبة.',
    empty: 'قائمة العملاء فارغة',
    detail: 'ستظهر بيانات عملائك هنا بعد تسجيل أول زيارة.',
  },
  services: {
    title: 'الخدمات',
    subtitle: 'خدمات نشاطك وأسعارها في مكان واحد.',
    empty: 'لم تتم إضافة خدمات بعد',
    detail: 'ستجد قائمة خدمات نشاطك هنا عند إعدادها.',
  },
  more: {
    title: 'المزيد',
    subtitle: 'إعدادات ومساحة نشاطك.',
    empty: 'كل ما يخص نشاطك',
    detail: 'هذه المساحة مهيأة لإعدادات وأدوات REZEL.',
  },
};

function getArabicDate() {
  return new Intl.DateTimeFormat('ar-DZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function NavIcon({ name }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 1.8,
  };

  const shapes = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9M9 20v-6h6v6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
        <path d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
      </>
    ),
    customers: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 6.1M17 14.7a5.4 5.4 0 0 1 3.5 5.1" />
      </>
    ),
    services: (
      <>
        <path d="m12 3 8 9-8 9-8-9 8-9Z" />
        <circle cx="12" cy="12" r="2.2" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1.4" />
        <circle cx="12" cy="12" r="1.4" />
        <circle cx="19" cy="12" r="1.4" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      {...common}
    >
      {shapes[name]}
    </svg>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function chooseBusiness(name) {
    if (saving) return;

    setSelectedBusiness(name);
    setSaving(true);
    setError('');

    try {
      await saveBusinessType(name);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('تعذّر حفظ بيانات النشاط. حاول مرة أخرى.');
      setSaving(false);
    }
  }

  return (
    <div className="app-frame onboarding-frame" dir="rtl">
      <header className="topbar onboarding-topbar" aria-label="REZEL">
        <span className="elite-mark" data-testid="text-elite-mark">
          BB ÉLITE
        </span>
      </header>

      <main className="onboarding">
        <div className="brand-lockup" aria-label="REZEL">
          <span
            className="brand-initial"
            aria-hidden="true"
            data-testid="text-brand-initial"
          >
            R
          </span>
          <span className="brand-name" data-testid="text-brand-name">
            REZEL
          </span>
        </div>

        <h1 className="welcome-title" data-testid="text-welcome-title">
          مرحباً بك 👋
        </h1>
        <p className="welcome-copy" data-testid="text-business-question">
          لنجهز تطبيقك، ما هو نشاطك؟
        </p>

        <div
          className="business-list"
          role="group"
          aria-label="اختر نشاطك التجاري"
        >
          {businesses.map((business) => (
            <button
              key={business.id}
              data-testid={`button-business-${business.id}`}
              className={`business-option${
                selectedBusiness === business.name ? ' is-selected' : ''
              }`}
              type="button"
              aria-pressed={selectedBusiness === business.name}
              disabled={saving}
              onClick={() => chooseBusiness(business.name)}
            >
              <span className="business-symbol" aria-hidden="true">
                {business.mark}
              </span>
              <span className="business-option-label">{business.name}</span>
              <span className="option-arrow" aria-hidden="true">
                ‹
              </span>
            </button>
          ))}
        </div>

        {saving && (
          <p
            className="save-error"
            role="status"
            data-testid="status-saving-business"
          >
            جارٍ حفظ نشاطك...
          </p>
        )}
        {error && (
          <p
            className="save-error"
            role="alert"
            data-testid="status-save-error"
          >
            {error}
          </p>
        )}
      </main>
    </div>
  );
}

function AppLayout() {
  const [businessName, setBusinessName] = useState('');
  const [status, setStatus] = useState('loading');

  const loadBusiness = useCallback(async () => {
    setStatus('loading');

    try {
      const storedBusiness = await getBusinessType();
      if (typeof storedBusiness !== 'string' || !storedBusiness.trim()) {
        setStatus('missing');
        return;
      }

      setBusinessName(storedBusiness);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  if (status === 'loading') {
    return (
      <div
        className="shell-state"
        dir="rtl"
        role="status"
        aria-label="جارٍ تحميل بيانات النشاط"
        data-testid="status-business-loading"
      >
        <div className="state-card">
          <p className="state-brand">REZEL</p>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton wide" />
        </div>
      </div>
    );
  }

  if (status === 'error' || status === 'missing') {
    return (
      <div className="shell-state" dir="rtl">
        <section
          className="state-card"
          role="alert"
          data-testid="status-business-error"
        >
          <p className="state-brand">REZEL</p>
          <h1 className="state-title">
            {status === 'missing'
              ? 'لم نعثر على بيانات النشاط'
              : 'تعذّر تحميل بياناتك'}
          </h1>
          <p className="state-copy">
            {status === 'missing'
              ? 'اختر نشاطك التجاري للمتابعة.'
              : 'تحقق من بيانات النشاط ثم حاول مرة أخرى.'}
          </p>
          {status === 'missing' ? (
            <Link
              className="retry-button"
              to="/"
              data-testid="link-return-onboarding"
            >
              اختيار النشاط
            </Link>
          ) : (
            <button
              className="retry-button"
              type="button"
              onClick={loadBusiness}
              data-testid="button-retry-business"
            >
              إعادة المحاولة
            </button>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="app-frame" dir="rtl">
      <header className="topbar">
        <span className="brand-mini" aria-label="REZEL">
          <span className="brand-mini-mark" aria-hidden="true">
            R
          </span>
          REZEL
        </span>
        <span className="elite-mark" data-testid="text-elite-mark">
          BB ÉLITE
        </span>
      </header>

      <Outlet context={{ businessName }} />

      <nav
        className="bottom-nav"
        aria-label="التنقل الرئيسي"
        data-testid="nav-bottom"
      >
        {navigation.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
            aria-label={item.label}
            data-testid={`link-nav-${item.id}`}
          >
            <span className="nav-icon">
              <NavIcon name={item.id} />
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function DashboardRoute() {
  const { businessName } = useOutletContext();
  return <Dashboard businessName={businessName} currentDate={getArabicDate()} />;
}

function PlaceholderPage({ page }) {
  const { businessName } = useOutletContext();
  const details = placeholderPages[page];

  return (
    <main className="app-content" dir="rtl" data-testid={`page-${page}`}>
      <h1 className="page-heading">{details.title}</h1>
      <p className="page-kicker">{details.subtitle}</p>
      <section
        className="placeholder-panel"
        aria-labelledby={`placeholder-title-${page}`}
      >
        <span className="placeholder-emblem" aria-hidden="true">
          <NavIcon name={page} />
        </span>
        <h2
          id={`placeholder-title-${page}`}
          data-testid={`text-${page}-empty-title`}
        >
          {details.empty}
        </h2>
        <p data-testid={`text-${page}-empty-copy`}>{details.detail}</p>
      </section>
      <div
        className="business-context"
        data-testid={`text-${page}-business-context`}
      >
        <span>نشاطك الحالي</span>
        <strong>{businessName}</strong>
      </div>
    </main>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Onboarding />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardRoute />} />
        <Route
          path="/calendar"
          element={<PlaceholderPage page="calendar" />}
        />
        <Route path="/customers" element={<Customers />} />
        <Route path="/services" element={<Services />} />
        <Route path="/more" element={<PlaceholderPage page="more" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
