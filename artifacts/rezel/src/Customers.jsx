import { useEffect, useRef, useState } from 'react';
import { addCustomer, getAllCustomers, softDeleteCustomer } from './db.js';

function getWhatsAppPhone(phone) {
  const value = String(phone || '').trim();
  let digits = value.replace(/\D/g, '');

  if (value.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = `213${digits.slice(1)}`;
  } else if (digits.length === 9 && !digits.startsWith('213')) {
    digits = `213${digits}`;
  }

  return digits;
}

function CustomerForm({ onClose, onAdded }) {
  const dialogRef = useRef(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'اكتب اسم العميل.';
    if (!phone.trim()) nextErrors.phone = 'اكتب رقم الهاتف.';
    else if (phone.trim().length < 5) nextErrors.phone = 'تحقق من رقم الهاتف.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    setError('');
    try {
      const customer = await addCustomer({ name: name.trim(), phone: phone.trim(), notes: notes.trim() });
      onAdded(customer);
    } catch {
      setError('تعذّر حفظ العميل. تحقق من البيانات وحاول مرة أخرى.');
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="record-modal"
      aria-labelledby="customer-form-title"
      data-testid="dialog-add-customer"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
    >
      <div className="modal-topline">
        <div>
          <h2 className="modal-title" id="customer-form-title">عميل جديد</h2>
          <p className="modal-copy">أضف بيانات التواصل لتبقى قريبة منك.</p>
        </div>
        <button className="modal-close" type="button" aria-label="إغلاق" data-testid="button-close-customer-form" onClick={onClose}>×</button>
      </div>
      <form className="record-form" onSubmit={submit} noValidate>
        <div className="form-field">
          <label htmlFor="customer-name">اسم العميل <span aria-hidden="true">*</span></label>
          <input id="customer-name" data-testid="input-customer-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'customer-name-error' : undefined} maxLength={100} />
          {errors.name && <span className="field-error" id="customer-name-error">{errors.name}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="customer-phone">رقم الهاتف <span aria-hidden="true">*</span></label>
          <input id="customer-phone" data-testid="input-customer-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'customer-phone-error' : undefined} maxLength={30} />
          {errors.phone && <span className="field-error" id="customer-phone-error">{errors.phone}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="customer-notes">ملاحظات <span className="field-hint">(اختياري)</span></label>
          <textarea id="customer-notes" data-testid="input-customer-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} />
        </div>
        {error && <p className="records-error" role="alert" data-testid="status-customer-save-error">{error}</p>}
        <div className="form-actions">
          <button className="cancel-button" type="button" data-testid="button-cancel-customer" onClick={onClose}>إلغاء</button>
          <button className="form-submit" type="submit" data-testid="button-submit-customer" disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ العميل'}</button>
        </div>
      </form>
    </dialog>
  );
}

function DeleteCustomerDialog({ customer, onClose, onConfirm, busy }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return (
    <dialog ref={dialogRef} className="record-modal" aria-labelledby="customer-delete-title" data-testid="dialog-delete-customer" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <h2 className="modal-title" id="customer-delete-title">حذف العميل؟</h2>
      <p className="confirm-copy">سيُزال {customer.name} من قائمتك. يمكنك إلغاء العملية الآن.</p>
      <div className="confirm-actions">
        <button className="cancel-button" type="button" data-testid="button-cancel-delete-customer" onClick={onClose}>إبقاء العميل</button>
        <button className="confirm-delete" type="button" data-testid="button-confirm-delete-customer" disabled={busy} onClick={onConfirm}>{busy ? 'جارٍ الحذف…' : 'حذف العميل'}</button>
      </div>
    </dialog>
  );
}

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function loadCustomers() {
    setStatus('loading');
    setLoadError('');
    try {
      const records = await getAllCustomers();
      setCustomers(Array.isArray(records) ? records : []);
      setStatus('ready');
    } catch {
      setLoadError('تعذّر تحميل قائمة العملاء. حاول مرة أخرى.');
      setStatus('error');
    }
  }
  useEffect(() => { loadCustomers(); }, []);

  function addToList(customer) {
    setCustomers((current) => [customer, ...current]);
    setShowForm(false);
    setActionError('');
  }

  async function confirmDelete() {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    setActionError('');
    try {
      await softDeleteCustomer(deleting.id);
      setCustomers((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
    } catch {
      setActionError('تعذّر حذف العميل. حاول مرة أخرى.');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <main className="app-content records-page" dir="rtl" data-testid="page-customers">
      <div className="records-heading-row">
        <div>
          <h1 className="records-heading">العملاء</h1>
          <p className="records-subtitle">علاقاتك الجميلة، في مكان واحد.</p>
          <span className="records-count" data-testid="text-customer-count"><strong>{customers.length}</strong> عميل</span>
        </div>
      </div>

      <button
        className="record-add-button"
        type="button"
        aria-label="إضافة عميل"
        data-testid="button-add-customer"
        onClick={() => { setActionError(''); setShowForm(true); }}
      >
        <span aria-hidden="true">+</span>
      </button>

      {actionError && <p className="records-error" role="alert" data-testid="status-customer-action-error">{actionError}</p>}
      {status === 'loading' && <div className="records-loading" role="status" aria-label="جارٍ تحميل العملاء" data-testid="status-customers-loading"><div className="records-skeleton" /><div className="records-skeleton" /><div className="records-skeleton" /></div>}
      {status === 'error' && <section className="records-error" role="alert" data-testid="status-customers-error"><p>{loadError}</p><button type="button" className="records-retry" data-testid="button-retry-customers" onClick={loadCustomers}>إعادة المحاولة</button></section>}
      {status === 'ready' && customers.length === 0 && <section className="records-empty" data-testid="state-customers-empty"><span className="records-empty-mark" aria-hidden="true">ر</span><h2>مساحتك تبدأ بعميل</h2><p>أضف أول اسم إلى قائمتك، وسجّل بياناته لتعود إليها متى احتجت.</p></section>}
      {status === 'ready' && customers.length > 0 && (
        <section className="records-list" aria-label="قائمة العملاء" data-testid="list-customers">
          {customers.map((customer) => (
            <article className="record-card" key={customer.id} data-testid={`record-customer-${customer.id}`}>
              <div className="record-main">
                <span className="record-avatar" aria-hidden="true">{customer.name.trim().slice(0, 1)}</span>
                <div className="record-details">
                  <h2 className="record-name" data-testid={`text-customer-name-${customer.id}`}>{customer.name}</h2>
                  <div className="customer-phone-row">
                    <span className="record-meta" data-testid={`text-customer-phone-${customer.id}`}>{customer.phone}</span>
                    <a
                      className="customer-whatsapp"
                      href={`https://wa.me/${getWhatsAppPhone(customer.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`مراسلة ${customer.name} عبر واتساب`}
                      data-testid={`link-whatsapp-customer-${customer.id}`}
                    >
                      واتساب
                    </a>
                  </div>
                </div>
              </div>
              <button className="record-delete" type="button" aria-label={`حذف ${customer.name}`} data-testid={`button-delete-customer-${customer.id}`} onClick={() => setDeleting(customer)}><span aria-hidden="true">×</span></button>
            </article>
          ))}
        </section>
      )}
      {showForm && <CustomerForm onClose={() => setShowForm(false)} onAdded={addToList} />}
      {deleting && <DeleteCustomerDialog customer={deleting} busy={deleteBusy} onClose={() => !deleteBusy && setDeleting(null)} onConfirm={confirmDelete} />}
    </main>
  );
}

export default Customers;
