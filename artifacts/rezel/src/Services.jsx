import { useEffect, useRef, useState } from 'react';
import { addService, getAllServices, softDeleteService, updateService } from './db.js';

const dinarFormatter = new Intl.NumberFormat('ar-DZ', {
  style: 'currency',
  currency: 'DZD',
  maximumFractionDigits: 2,
});

function ServiceForm({ service, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const [name, setName] = useState(service?.name || '');
  const [price, setPrice] = useState(service ? String(service.price) : '');
  const [notes, setNotes] = useState(service?.notes || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  async function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'اكتب اسم الخدمة.';
    if (price === '') nextErrors.price = 'اكتب سعر الخدمة.';
    else if (!Number.isFinite(Number(price)) || Number(price) < 0) nextErrors.price = 'أدخل سعراً صحيحاً لا يقل عن صفر.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    setError('');
    try {
      const savedService = service
        ? await updateService(service.id, { name: name.trim(), price: Number(price), duration: service.duration, notes: notes.trim() })
        : await addService({ name: name.trim(), price: Number(price), duration: null, notes: notes.trim() });
      onSaved(savedService);
    } catch {
      setError('تعذّر حفظ الخدمة. تحقق من البيانات وحاول مرة أخرى.');
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="record-modal service-form-modal" aria-labelledby="service-form-title" data-testid="dialog-add-service" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="modal-topline">
        <div><h2 className="modal-title" id="service-form-title">{service ? 'تعديل الخدمة' : 'خدمة جديدة'}</h2><p className="modal-copy">{service ? 'حدّث تفاصيل الخدمة وسعرها.' : 'أضف خدمة وسعراً واضحاً لقائمتك.'}</p></div>
        <button className="modal-close" type="button" aria-label="إغلاق" data-testid="button-close-service-form" onClick={onClose}>×</button>
      </div>
      <form className="record-form" onSubmit={submit} noValidate>
        <div className="form-field">
          <label htmlFor="service-name">اسم الخدمة <span aria-hidden="true">*</span></label>
          <input id="service-name" data-testid="input-service-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'service-name-error' : undefined} maxLength={100} />
          {errors.name && <span className="field-error" id="service-name-error">{errors.name}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="service-price">السعر <span aria-hidden="true">*</span></label>
          <input id="service-price" data-testid="input-service-price" type="number" inputMode="decimal" min="0" step="any" value={price} onChange={(event) => setPrice(event.target.value)} aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? 'service-price-error' : 'service-price-hint'} />
          {errors.price ? <span className="field-error" id="service-price-error">{errors.price}</span> : <span className="field-hint" id="service-price-hint">السعر بالدينار الجزائري (دج)</span>}
        </div>
        <div className="form-field">
          <label htmlFor="service-notes">ملاحظات <span className="field-hint">(اختياري)</span></label>
          <textarea id="service-notes" data-testid="input-service-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} />
        </div>
        {error && <p className="records-error" role="alert" data-testid="status-service-save-error">{error}</p>}
        <div className="form-actions">
          <button className="cancel-button" type="button" data-testid="button-cancel-service" onClick={onClose}>إلغاء</button>
          <button className="form-submit" type="submit" data-testid="button-submit-service" disabled={saving}>{saving ? 'جارٍ الحفظ…' : service ? 'حفظ التعديلات' : 'حفظ الخدمة'}</button>
        </div>
      </form>
    </dialog>
  );
}

function DeleteServiceDialog({ service, onClose, onConfirm, busy }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return (
    <dialog ref={dialogRef} className="record-modal" aria-labelledby="service-delete-title" data-testid="dialog-delete-service" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <h2 className="modal-title" id="service-delete-title">حذف الخدمة؟</h2>
      <p className="confirm-copy">سيُزال «{service.name}» من قائمة خدماتك. يمكنك إلغاء العملية الآن.</p>
      <div className="confirm-actions">
        <button className="cancel-button" type="button" data-testid="button-cancel-delete-service" onClick={onClose}>إبقاء الخدمة</button>
        <button className="confirm-delete" type="button" data-testid="button-confirm-delete-service" disabled={busy} onClick={onConfirm}>{busy ? 'جارٍ الحذف…' : 'حذف الخدمة'}</button>
      </div>
    </dialog>
  );
}

function Services() {
  const [services, setServices] = useState([]);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function loadServices() {
    setStatus('loading');
    setLoadError('');
    try {
      const records = await getAllServices();
      setServices(Array.isArray(records) ? records : []);
      setStatus('ready');
    } catch {
      setLoadError('تعذّر تحميل قائمة الخدمات. حاول مرة أخرى.');
      setStatus('error');
    }
  }
  useEffect(() => { loadServices(); }, []);

  function saveToList(service) {
    setServices((current) => editing
      ? current.map((item) => item.id === service.id ? service : item)
      : [service, ...current]);
    setShowForm(false);
    setEditing(null);
    setActionError('');
  }

  async function confirmDelete() {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    setActionError('');
    try {
      await softDeleteService(deleting.id);
      setServices((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
    } catch {
      setActionError('تعذّر حذف الخدمة. حاول مرة أخرى.');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <main className="app-content records-page" dir="rtl" data-testid="page-services">
      <div className="records-heading-row">
        <div>
          <h1 className="records-heading">الخدمات</h1>
          <p className="records-subtitle">قائمة مرتبة، وأسعار واضحة.</p>
          <span className="records-count" data-testid="text-service-count"><strong>{services.length}</strong> خدمة</span>
        </div>
      </div>

      <button
        className="record-add-button"
        type="button"
        aria-label="إضافة خدمة"
        data-testid="button-add-service"
        onClick={() => { setActionError(''); setShowForm(true); }}
      >
        <span aria-hidden="true">+</span>
      </button>

      {actionError && <p className="records-error" role="alert" data-testid="status-service-action-error">{actionError}</p>}
      {status === 'loading' && <div className="records-loading" role="status" aria-label="جارٍ تحميل الخدمات" data-testid="status-services-loading"><div className="records-skeleton" /><div className="records-skeleton" /><div className="records-skeleton" /></div>}
      {status === 'error' && <section className="records-error" role="alert" data-testid="status-services-error"><p>{loadError}</p><button type="button" className="records-retry" data-testid="button-retry-services" onClick={loadServices}>إعادة المحاولة</button></section>}
      {status === 'ready' && services.length === 0 && <section className="records-empty" data-testid="state-services-empty"><span className="records-empty-mark" aria-hidden="true">دج</span><h2>أضف أول خدمة</h2><p>حدّد ما تقدّمه وسعره، لتكون قائمتك جاهزة دائماً.</p></section>}
      {status === 'ready' && services.length > 0 && (
        <section className="records-list" aria-label="قائمة الخدمات" data-testid="list-services">
          {services.map((service) => (
            <article className="record-card" key={service.id} data-testid={`record-service-${service.id}`}>
              <div className="record-main">
                <span className="record-avatar" aria-hidden="true">دج</span>
                <div className="record-details"><h2 className="record-name" data-testid={`text-service-name-${service.id}`}>{service.name}</h2><span className="record-price" data-testid={`text-service-price-${service.id}`}>{dinarFormatter.format(service.price)}</span></div>
              </div>
              <div className="record-actions">
                <button className="record-edit" type="button" aria-label={`تعديل ${service.name}`} data-testid={`button-edit-service-${service.id}`} onClick={() => { setActionError(''); setEditing(service); setShowForm(true); }}>✏️</button>
              <button className="record-delete" type="button" aria-label={`حذف ${service.name}`} data-testid={`button-delete-service-${service.id}`} onClick={() => setDeleting(service)}><span aria-hidden="true">×</span></button>
              </div>
            </article>
          ))}
        </section>
      )}
      {showForm && <ServiceForm service={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={saveToList} />}
      {deleting && <DeleteServiceDialog service={deleting} busy={deleteBusy} onClose={() => !deleteBusy && setDeleting(null)} onConfirm={confirmDelete} />}
    </main>
  );
}

export default Services;
