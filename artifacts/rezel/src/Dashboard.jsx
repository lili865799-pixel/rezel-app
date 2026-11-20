import { useCallback, useEffect, useState } from 'react';
import {
  getAllAppointments,
  getAllCustomers,
  getAllPayments,
  getAllServices,
} from './db.js';

const money = new Intl.NumberFormat('ar-DZ', {
  style: 'currency',
  currency: 'DZD',
  maximumFractionDigits: 2,
});

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isCancelled(appointment) {
  return ['cancelled', 'canceled', 'ملغي'].includes(
    String(appointment.status || '').toLowerCase(),
  );
}

const statsMeta = [
  { key: 'appointments', label: 'مواعيد اليوم', symbol: '◷', unit: 'موعد' },
  { key: 'revenue', label: 'إيرادات اليوم', symbol: 'ر', unit: '' },
  { key: 'pending', label: 'مدفوعات معلّقة', symbol: '◌', unit: '' },
  { key: 'expenses', label: 'المصروفات', symbol: '−', unit: '' },
];

function Dashboard({ businessName, currentDate }) {
  const [records, setRecords] = useState({
    appointments: [],
    customers: [],
    payments: [],
    services: [],
  });
  const [status, setStatus] = useState('loading');

  const loadDashboard = useCallback(async () => {
    setStatus('loading');
    try {
      const [appointments, payments, customers, services] = await Promise.all([
        getAllAppointments(),
        getAllPayments(),
        getAllCustomers(),
        getAllServices(),
      ]);
      setRecords({ appointments, payments, customers, services });
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const today = localDateKey();
  const todaysAppointments = records.appointments
    .filter((appointment) => appointment.date === today && !isCancelled(appointment))
    .sort((a, b) => a.time.localeCompare(b.time));
  const todaysRevenue = records.payments.reduce((total, payment) => {
    const paymentDate = new Date(payment.date);
    return Number.isNaN(paymentDate.getTime()) || localDateKey(paymentDate) !== today
      ? total
      : total + Number(payment.amount || 0);
  }, 0);
  const paidByAppointment = new Map();
  records.payments.forEach((payment) => {
    paidByAppointment.set(
      payment.appointmentId,
      (paidByAppointment.get(payment.appointmentId) || 0) + Number(payment.amount || 0),
    );
  });
  const pending = records.appointments.reduce((total, appointment) => {
    if (isCancelled(appointment)) return total;
    return total + Math.max(
      Number(appointment.price || 0) - (paidByAppointment.get(appointment.id) || 0),
      0,
    );
  }, 0);
  const values = {
    appointments: todaysAppointments.length,
    revenue: todaysRevenue,
    pending,
    expenses: 0,
  };
  const customersById = new Map(records.customers.map((item) => [item.id, item]));
  const servicesById = new Map(records.services.map((item) => [item.id, item]));

  return (
    <main className="app-content dashboard-page" dir="rtl" data-testid="page-dashboard">
      <header className="dashboard-welcome" aria-labelledby="dashboard-title">
        <p className="welcome-label">مساحة عملك اليوم</p>
        <h1 className="business-title" id="dashboard-title" data-testid="text-business-name">
          {businessName}
        </h1>
        <time className="date-line" data-testid="text-current-date">{currentDate}</time>
      </header>

      <div className="dashboard-section-heading">
        <div>
          <span className="eyebrow">نظرة سريعة</span>
          <h2 className="section-title">ملخص اليوم</h2>
        </div>
        <span className="today-chip" data-testid="text-dashboard-today">
          {new Intl.DateTimeFormat('ar-DZ', { day: 'numeric', month: 'short' }).format(new Date())}
        </span>
      </div>

      {status === 'loading' ? (
        <section className="dashboard-loading" role="status" aria-label="جارٍ تحميل لوحة التحكم" data-testid="status-dashboard-loading">
          <div className="dashboard-skeleton dashboard-skeleton-large" />
          <div className="dashboard-skeleton-grid">
            {[0, 1, 2, 3].map((item) => <div className="dashboard-skeleton" key={item} />)}
          </div>
          <div className="dashboard-skeleton dashboard-skeleton-large" />
        </section>
      ) : status === 'error' ? (
        <section className="records-error dashboard-error" role="alert" data-testid="status-dashboard-error">
          <p>تعذّر تحميل بيانات يومك من الجهاز.</p>
          <button className="records-retry" type="button" onClick={loadDashboard} data-testid="button-retry-dashboard">
            إعادة المحاولة
          </button>
        </section>
      ) : (
        <>
          <section className="stats-grid" aria-label="إحصائيات اليوم" data-testid="grid-dashboard-stats">
            {statsMeta.map((stat) => (
              <article className={`stat-card stat-card-${stat.key}`} key={stat.key} data-testid={`card-stat-${stat.key}`}>
                <div className="stat-topline">
                  <p className="stat-label">{stat.label}</p>
                  <span className="stat-mark" aria-hidden="true">{stat.symbol}</span>
                </div>
                <p className="stat-value" data-testid={`text-stat-${stat.key}`}>
                  {stat.key === 'appointments'
                    ? new Intl.NumberFormat('ar-DZ').format(values[stat.key])
                    : money.format(values[stat.key])}
                  {stat.unit && <span className="stat-unit">{stat.unit}</span>}
                </p>
              </article>
            ))}
          </section>

          <section className="dashboard-appointments" aria-labelledby="dashboard-appointments-title">
            <div className="dashboard-section-heading appointment-heading">
              <div>
                <span className="eyebrow">على جدولك</span>
                <h2 className="section-title" id="dashboard-appointments-title">مواعيد اليوم</h2>
              </div>
              <span className="appointment-count" data-testid="text-today-appointment-count">
                {new Intl.NumberFormat('ar-DZ').format(todaysAppointments.length)}
              </span>
            </div>
            {todaysAppointments.length ? (
              <div className="dashboard-appointment-list" data-testid="list-dashboard-appointments">
                {todaysAppointments.map((appointment) => (
                  <article className="dashboard-appointment-row" key={appointment.id} data-testid={`dashboard-appointment-${appointment.id}`}>
                    <time className="appointment-time" dateTime={`${appointment.date}T${appointment.time}`} data-testid={`text-dashboard-time-${appointment.id}`}>
                      {appointment.time}
                    </time>
                    <span className="appointment-time-rule" aria-hidden="true" />
                    <div className="dashboard-appointment-details">
                      <h3 data-testid={`text-dashboard-customer-${appointment.id}`}>
                        {customersById.get(appointment.customerId)?.name || 'عميل'}
                      </h3>
                      <p data-testid={`text-dashboard-service-${appointment.id}`}>
                        {servicesById.get(appointment.serviceId)?.name || 'خدمة'}
                      </p>
                    </div>
                    <span className="appointment-status-dot" aria-label="موعد مجدول" />
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty" data-testid="state-dashboard-appointments-empty">
                <span className="empty-calendar-mark" aria-hidden="true">◷</span>
                <div>
                  <h3>اليوم يبدأ على مهل</h3>
                  <p>لا توجد مواعيد مسجّلة لهذا اليوم.</p>
                </div>
              </div>
            )}
          </section>
          <p className="dashboard-footnote" data-testid="text-expenses-note">
            المصروفات غير مضافة بعد؛ سيبقى هذا الرقم صفراً.
          </p>
        </>
      )}
    </main>
  );
}

export default Dashboard;
