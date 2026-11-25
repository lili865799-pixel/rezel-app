import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addPayment,
  addAppointmentWithDeposit,
  getAllAppointments,
  getAllCustomers,
  getAllPayments,
  getAllServices,
  updateAppointment,
} from './db.js';
import PaymentLedger from './PaymentLedger.jsx';

const money = new Intl.NumberFormat('ar-DZ', {
  style: 'currency',
  currency: 'DZD',
  maximumFractionDigits: 2,
});

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isCancelled(appointment) {
  return ['cancelled', 'canceled', 'ملغي'].includes(
    String(appointment.status || '').toLowerCase(),
  );
}

function safeAmount(value) {
  const amount = typeof value === 'number' || typeof value === 'string'
    ? Number(value)
    : Number.NaN;
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function formatAppointmentDate(date) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'تاريخ غير متاح';
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('ar-DZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, day, 12));
}

function AppointmentForm({ appointment, customers, services, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const [customerId, setCustomerId] = useState(appointment?.customerId || '');
  const [serviceId, setServiceId] = useState(appointment?.serviceId || '');
  const [date, setDate] = useState(appointment?.date || localDateKey());
  const [time, setTime] = useState(appointment?.time || '09:00');
  const [depositAmount, setDepositAmount] = useState('0');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const selectedService = services.find((service) => service.id === serviceId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  function updateService(value) {
    setServiceId(value);
    setErrors((current) => ({ ...current, serviceId: '', depositAmount: '' }));
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    const deposit = Number(depositAmount);
    if (!customerId) nextErrors.customerId = 'اختر العميل.';
    if (!serviceId) nextErrors.serviceId = 'اختر الخدمة.';
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) nextErrors.date = 'اختر تاريخاً صحيحاً.';
    if (!time || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) nextErrors.time = 'اختر وقتاً صحيحاً.';
    if (!appointment && (depositAmount === '' || !Number.isFinite(deposit) || deposit < 0)) {
      nextErrors.depositAmount = 'أدخل مبلغاً صحيحاً لا يقل عن صفر.';
    } else if (!appointment && selectedService && deposit > Number(selectedService.price)) {
      nextErrors.depositAmount = 'لا يمكن أن يتجاوز العربون سعر الخدمة.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    setSaveError('');
    try {
      if (appointment) {
        await updateAppointment(appointment.id, {
          customerId,
          serviceId,
          date,
          time,
          notes: notes.trim(),
        });
      } else {
        await addAppointmentWithDeposit({
          customerId,
          serviceId,
          date,
          time,
          depositAmount: deposit,
          notes: notes.trim(),
        });
      }
      await onSaved();
    } catch (error) {
      setSaveError(error instanceof RangeError
        ? 'لا يمكن أن يكون سعر الخدمة أقل من الدفعات المسجلة.'
        : 'تعذّر حفظ الموعد. تحقّق من البيانات وحاول مرة أخرى.');
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="record-modal appointment-modal"
      aria-labelledby="appointment-form-title"
      data-testid={appointment ? 'dialog-edit-appointment' : 'dialog-add-appointment'}
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}
    >
      <div className="modal-topline">
        <div>
          <span className="eyebrow">{appointment ? 'تعديل الموعد' : 'موعد جديد'}</span>
          <h2 className="modal-title" id="appointment-form-title">{appointment ? 'حدّث تفاصيل الموعد' : 'رتّب زيارة جديدة'}</h2>
          <p className="modal-copy">{appointment ? 'ستبقى الدفعات المسجلة مرتبطة بهذا الموعد.' : 'خطوة سريعة، ويصبح يومك أوضح.'}</p>
        </div>
        <button className="modal-close" type="button" aria-label="إغلاق" data-testid="button-close-appointment-form" onClick={onClose}>×</button>
      </div>
      <form className="record-form" onSubmit={submit} noValidate>
        <div className="form-field">
          <label htmlFor="appointment-customer">العميل <span aria-hidden="true">*</span></label>
          <select id="appointment-customer" data-testid="select-appointment-customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)} aria-invalid={Boolean(errors.customerId)} aria-describedby={errors.customerId ? 'appointment-customer-error' : undefined} required>
            <option value="">اختر من قائمة العملاء</option>
            {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}
          </select>
          {errors.customerId && <span className="field-error" id="appointment-customer-error">{errors.customerId}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="appointment-service">الخدمة <span aria-hidden="true">*</span></label>
          <select id="appointment-service" data-testid="select-appointment-service" value={serviceId} onChange={(event) => updateService(event.target.value)} aria-invalid={Boolean(errors.serviceId)} aria-describedby={errors.serviceId ? 'appointment-service-error' : 'appointment-price-hint'} required>
            <option value="">اختر الخدمة المناسبة</option>
            {services.map((service) => <option value={service.id} key={service.id}>{service.name}</option>)}
          </select>
          {errors.serviceId ? <span className="field-error" id="appointment-service-error">{errors.serviceId}</span> : (
            <span className="field-hint" id="appointment-price-hint" data-testid="text-selected-service-price">
              {selectedService ? `سعر الخدمة: ${money.format(Number(selectedService.price))}` : 'سيظهر سعر الخدمة بعد اختيارها'}
            </span>
          )}
        </div>
        <div className="appointment-fields-row">
          <div className="form-field">
            <label htmlFor="appointment-date">التاريخ <span aria-hidden="true">*</span></label>
            <input id="appointment-date" data-testid="input-appointment-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'appointment-date-error' : undefined} required />
            {errors.date && <span className="field-error" id="appointment-date-error">{errors.date}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="appointment-time">الوقت <span aria-hidden="true">*</span></label>
            <input id="appointment-time" data-testid="input-appointment-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-invalid={Boolean(errors.time)} aria-describedby={errors.time ? 'appointment-time-error' : undefined} required />
            {errors.time && <span className="field-error" id="appointment-time-error">{errors.time}</span>}
          </div>
        </div>
        {!appointment && <div className="form-field">
          <label htmlFor="appointment-deposit">العربون</label>
          <div className="deposit-input-wrap">
            <input id="appointment-deposit" data-testid="input-appointment-deposit" type="number" inputMode="decimal" min="0" max={selectedService ? Number(selectedService.price) : undefined} step="any" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} aria-invalid={Boolean(errors.depositAmount)} aria-describedby={errors.depositAmount ? 'appointment-deposit-error' : 'appointment-deposit-hint'} />
            <span aria-hidden="true">دج</span>
          </div>
          {errors.depositAmount ? <span className="field-error" id="appointment-deposit-error">{errors.depositAmount}</span> : <span className="field-hint" id="appointment-deposit-hint">يمكن تسجيل عربون بقيمة صفر، وبحد أقصى سعر الخدمة.</span>}
        </div>}
        <div className="form-field">
          <label htmlFor="appointment-notes">ملاحظات <span className="field-hint">(اختياري)</span></label>
          <textarea id="appointment-notes" data-testid="input-appointment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} />
        </div>
        {saveError && <p className="records-error appointment-save-error" role="alert" data-testid="status-appointment-save-error">{saveError}</p>}
        <div className="form-actions">
          <button className="cancel-button" type="button" data-testid="button-cancel-appointment" onClick={onClose} disabled={saving}>إلغاء</button>
          <button className="form-submit" type="submit" data-testid="button-submit-appointment" disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : appointment ? 'حفظ التعديلات' : 'تأكيد الموعد'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function AppointmentDetails({ appointment, customer, service, payments, onClose, onAddPayment }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return (
    <dialog ref={dialogRef} className="record-modal detail-modal" aria-labelledby="appointment-details-title" data-testid="dialog-appointment-details" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="modal-topline">
        <div>
          <span className="eyebrow">تفاصيل الموعد</span>
          <h2 className="modal-title" id="appointment-details-title">{customer?.name || 'عميل غير متاح'}</h2>
          <p className="modal-copy">{service?.name || 'خدمة غير متاحة'} · {formatAppointmentDate(appointment.date)} · {appointment.time}</p>
        </div>
        <button className="modal-close" type="button" aria-label="إغلاق" onClick={onClose}>×</button>
      </div>
      {appointment.notes && <p className="detail-notes">{appointment.notes}</p>}
      <PaymentLedger
        recordId={appointment.id}
        type="appointment"
        title={`الموعد ${customer?.name || ''}`}
        price={appointment.price}
        payments={payments}
        onAddPayment={onAddPayment}
      />
      <div className="form-actions detail-actions">
        <button className="cancel-button" type="button" onClick={onClose}>إغلاق</button>
      </div>
    </dialog>
  );
}

function Appointments() {
  const [records, setRecords] = useState({
    appointments: [],
    customers: [],
    payments: [],
    services: [],
  });
  const [status, setStatus] = useState('loading');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [appointmentFilter, setAppointmentFilter] = useState('today');

  const loadRecords = useCallback(async () => {
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
    loadRecords();
  }, [loadRecords]);

  const today = localDateKey();
  const visibleAppointments = useMemo(
    () => records.appointments
      .filter((appointment) => appointmentFilter === 'all'
        || (appointment.date === today && !isCancelled(appointment)))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [records.appointments, appointmentFilter, today],
  );
  const customersById = useMemo(() => new Map(records.customers.map((item) => [item.id, item])), [records.customers]);
  const servicesById = useMemo(() => new Map(records.services.map((item) => [item.id, item])), [records.services]);
  const paidByAppointment = useMemo(() => {
    const totals = new Map();
    records.payments.forEach((payment) => {
      const amount = safeAmount(payment.amount);
      totals.set(payment.appointmentId, (totals.get(payment.appointmentId) || 0) + amount);
    });
    return totals;
  }, [records.payments]);
  const missingSetup = records.customers.length === 0 || records.services.length === 0;

  async function saved() {
    await loadRecords();
    setShowForm(false);
    setEditing(null);
  }

  const selectedAppointment = records.appointments.find((item) => item.id === selectedAppointmentId);
  const selectedAppointmentPayments = selectedAppointment
    ? records.payments.filter((payment) => payment.appointmentId === selectedAppointment.id)
    : [];

  async function savePayment(paymentDetails) {
    await addPayment({
      appointmentId: selectedAppointmentId,
      ...paymentDetails,
    });
    await loadRecords();
  }

  return (
    <main className="app-content records-page appointments-page" dir="rtl" data-testid="page-appointments">
      <header className="appointments-hero">
        <div className="appointments-heading-top">
          <div>
            <span className="eyebrow">يومك، مرتب</span>
            <h1 className="records-heading">المواعيد</h1>
          </div>
          <span className="appointments-date-mark" aria-hidden="true">
            {appointmentFilter === 'today' ? 'اليوم' : 'الكل'}
          </span>
        </div>
        <p className="records-subtitle">كل زيارة في وقتها، وكل التفاصيل قريبة.</p>
        <div className="today-date-strip">
          <span className="today-date-number">{new Intl.DateTimeFormat('ar-DZ', { day: 'numeric' }).format(new Date())}</span>
          <span>{new Intl.DateTimeFormat('ar-DZ', { weekday: 'long', month: 'long' }).format(new Date())}</span>
          <span className="today-date-count" data-testid="text-appointments-count">
            {new Intl.NumberFormat('ar-DZ').format(visibleAppointments.length)} موعد
          </span>
        </div>
      </header>

      {status === 'ready' && !missingSetup && (
        <div className="appointment-filter" role="group" aria-label="تصفية المواعيد" data-testid="appointments-filter">
          <button
            className={appointmentFilter === 'today' ? 'is-active' : ''}
            type="button"
            aria-pressed={appointmentFilter === 'today'}
            data-testid="button-filter-appointments-today"
            onClick={() => setAppointmentFilter('today')}
          >
            اليوم
          </button>
          <button
            className={appointmentFilter === 'all' ? 'is-active' : ''}
            type="button"
            aria-pressed={appointmentFilter === 'all'}
            data-testid="button-filter-appointments-all"
            onClick={() => setAppointmentFilter('all')}
          >
            كل المواعيد
          </button>
        </div>
      )}

      {status === 'loading' && (
        <section className="records-loading appointments-loading" role="status" aria-label="جارٍ تحميل المواعيد" data-testid="status-appointments-loading">
          <div className="records-skeleton" /><div className="records-skeleton" /><div className="records-skeleton" />
        </section>
      )}
      {status === 'error' && (
        <section className="records-error" role="alert" data-testid="status-appointments-error">
          <p>تعذّر تحميل المواعيد من الجهاز. أعد المحاولة بعد لحظة.</p>
          <button type="button" className="records-retry" data-testid="button-retry-appointments" onClick={loadRecords}>إعادة المحاولة</button>
        </section>
      )}
      {status === 'ready' && missingSetup && (
        <section className="appointment-setup-card" data-testid="state-appointments-setup">
          <span className="records-empty-mark" aria-hidden="true">ر</span>
          <h2>جهّز قائمتك أولاً</h2>
          <p>أضف عميلاً وخدمة، وبعدها يصبح حجز الموعد بخطوة واحدة.</p>
          <div className="setup-links">
            {records.customers.length === 0 && <Link to="/customers" className="setup-link" data-testid="link-setup-customers">إضافة عميل</Link>}
            {records.services.length === 0 && <Link to="/services" className="setup-link" data-testid="link-setup-services">إضافة خدمة</Link>}
          </div>
        </section>
      )}
      {status === 'ready' && !missingSetup && visibleAppointments.length === 0 && (
        <section className="records-empty appointments-empty" data-testid="state-appointments-empty">
          <span className="appointments-empty-graphic" aria-hidden="true"><span /><span /><span /></span>
          <span className="eyebrow">{appointmentFilter === 'today' ? 'مساحة لبداية جميلة' : 'جدولك الكامل'}</span>
          <h2>{appointmentFilter === 'today' ? 'لا توجد مواعيد اليوم' : 'لا توجد مواعيد مسجّلة'}</h2>
          <p>{appointmentFilter === 'today' ? 'أضف أول موعد ودع تفاصيل يومك تتشكل بهدوء.' : 'ستظهر المواعيد القادمة والسابقة هنا بعد إضافتها.'}</p>
          <button type="button" className="empty-add-link" data-testid="button-empty-add-appointment" onClick={() => setShowForm(true)}>
            إضافة موعد
          </button>
        </section>
      )}
      {status === 'ready' && !missingSetup && visibleAppointments.length > 0 && (
        <section className="appointments-list-wrap" aria-label={appointmentFilter === 'today' ? 'مواعيد اليوم' : 'كل المواعيد'} data-testid="list-appointments">
          <div className="appointments-list-label">
            <h2>{appointmentFilter === 'today' ? 'جدول اليوم' : 'كل المواعيد'}</h2>
            <span>{appointmentFilter === 'today' ? 'مرتّب حسب الوقت' : 'مرتّبة حسب التاريخ والوقت'}</span>
          </div>
          <div className="appointments-list">
            {visibleAppointments.map((appointment) => {
              const customer = customersById.get(appointment.customerId);
              const service = servicesById.get(appointment.serviceId);
              const price = safeAmount(appointment.price);
              const paid = paidByAppointment.get(appointment.id) || 0;
              const due = isCancelled(appointment)
                ? 0
                : Math.max(price - Math.min(paid, price), 0);
              return (
                <article className={`appointment-card${appointmentFilter === 'all' ? ' appointment-card-all' : ''}`} key={appointment.id} data-testid={`appointment-card-${appointment.id}`}>
                  <div className="appointment-card-time">
                    {appointmentFilter === 'all' && (
                      <time className="appointment-card-date" dateTime={appointment.date} data-testid={`text-appointment-date-${appointment.id}`}>
                        {formatAppointmentDate(appointment.date)}
                      </time>
                    )}
                    <time dateTime={`${appointment.date}T${appointment.time}`} data-testid={`text-appointment-time-${appointment.id}`}>{appointment.time}</time>
                    <span className="appointment-time-stem" aria-hidden="true" />
                  </div>
                  <div className="appointment-card-main">
                    <div className="appointment-card-person">
                      <span className="appointment-avatar" aria-hidden="true">{customer?.name?.trim().slice(0, 1) || 'ع'}</span>
                      <div className="appointment-card-names">
                        <h3 data-testid={`text-appointment-customer-${appointment.id}`}>{customer?.name || 'عميل غير متاح'}</h3>
                        <p data-testid={`text-appointment-service-${appointment.id}`}>{service?.name || 'خدمة غير متاحة'}</p>
                      </div>
                      {isCancelled(appointment) && <span className="appointment-cancelled" data-testid={`text-appointment-status-${appointment.id}`}>ملغي</span>}
                    </div>
                    <div className="appointment-card-finances">
                      <span data-testid={`text-appointment-price-${appointment.id}`}>{money.format(price)}</span>
                      <span className="appointment-due" data-testid={`text-appointment-due-${appointment.id}`}>
                        المتبقي <strong>{money.format(due)}</strong>
                      </span>
                    </div>
                    <div className="record-actions appointment-card-actions">
                      <button className="record-action-link" type="button" data-testid={`button-details-appointment-${appointment.id}`} onClick={() => setSelectedAppointmentId(appointment.id)}>تفاصيل الدفعات</button>
                      <button className="record-edit" type="button" aria-label={`تعديل موعد ${customer?.name || ''}`} data-testid={`button-edit-appointment-${appointment.id}`} onClick={() => { setEditing(appointment); setShowForm(true); }}>✏️</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {status === 'ready' && !missingSetup && (
        <button className="record-add-button" type="button" aria-label="إضافة موعد" data-testid="button-add-appointment" onClick={() => setShowForm(true)}>
          <span aria-hidden="true">+</span>
        </button>
      )}
      {showForm && <AppointmentForm appointment={editing} customers={records.customers} services={records.services} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={saved} />}
      {selectedAppointment && (
        <AppointmentDetails
          appointment={selectedAppointment}
          customer={customersById.get(selectedAppointment.customerId)}
          service={servicesById.get(selectedAppointment.serviceId)}
          payments={selectedAppointmentPayments}
          onClose={() => setSelectedAppointmentId(null)}
          onAddPayment={savePayment}
        />
      )}
    </main>
  );
}

export default Appointments;
