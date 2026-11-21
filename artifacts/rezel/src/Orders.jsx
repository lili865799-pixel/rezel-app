import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { addOrder, getAllCustomers, getAllOrders } from './db.js';

const money = new Intl.NumberFormat('ar-DZ', {
  style: 'currency',
  currency: 'DZD',
  maximumFractionDigits: 2,
});

const orderStatuses = [
  { value: 'new', label: 'جديد' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'ready', label: 'جاهز' },
  { value: 'delivered', label: 'تم التسليم' },
];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('ar-DZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function OrderForm({ customers, onClose, onAdded }) {
  const dialogRef = useRef(null);
  const [customerId, setCustomerId] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('0');
  const [dueDate, setDueDate] = useState(localDateKey());
  const [status, setStatus] = useState('new');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    const parsedPrice = Number(price);
    const parsedDeposit = Number(deposit);
    const nextErrors = {};
    if (!customerId) nextErrors.customerId = 'اختر العميل.';
    if (!description.trim()) nextErrors.description = 'اكتب وصف الطلب.';
    if (price === '' || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      nextErrors.price = 'أدخل سعراً أكبر من صفر.';
    }
    if (deposit === '' || !Number.isFinite(parsedDeposit) || parsedDeposit < 0) {
      nextErrors.deposit = 'أدخل عربوناً صحيحاً لا يقل عن صفر.';
    } else if (Number.isFinite(parsedPrice) && parsedDeposit > parsedPrice) {
      nextErrors.deposit = 'لا يمكن أن يتجاوز العربون سعر الطلب.';
    }
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      nextErrors.dueDate = 'اختر تاريخ تسليم صحيحاً.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSaveError('');
    try {
      const order = await addOrder({
        customerId,
        description: description.trim(),
        price: parsedPrice,
        deposit: parsedDeposit,
        dueDate,
        status,
        notes: notes.trim(),
      });
      onAdded(order);
    } catch {
      setSaveError('تعذّر حفظ الطلب. تحقق من البيانات وحاول مرة أخرى.');
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="record-modal order-modal"
      aria-labelledby="order-form-title"
      data-testid="dialog-add-order"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
    >
      <div className="modal-topline">
        <div>
          <span className="eyebrow">طلب خاص</span>
          <h2 className="modal-title" id="order-form-title">طلب جديد</h2>
          <p className="modal-copy">احتفظ بالتفاصيل وموعد التسليم في مكان واحد.</p>
        </div>
        <button
          className="modal-close"
          type="button"
          aria-label="إغلاق"
          data-testid="button-close-order-form"
          onClick={onClose}
          disabled={saving}
        >
          ×
        </button>
      </div>
      <form className="record-form" onSubmit={submit} noValidate>
        <div className="form-field">
          <label htmlFor="order-customer">العميل <span aria-hidden="true">*</span></label>
          <select
            id="order-customer"
            data-testid="select-order-customer"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            aria-invalid={Boolean(errors.customerId)}
            aria-describedby={errors.customerId ? 'order-customer-error' : undefined}
            required
          >
            <option value="">اختر من قائمة العملاء</option>
            {customers.map((customer) => (
              <option value={customer.id} key={customer.id}>{customer.name}</option>
            ))}
          </select>
          {errors.customerId && <span className="field-error" id="order-customer-error">{errors.customerId}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="order-description">وصف الطلب <span aria-hidden="true">*</span></label>
          <input
            id="order-description"
            data-testid="input-order-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={160}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'order-description-error' : undefined}
            required
            autoFocus
          />
          {errors.description && <span className="field-error" id="order-description-error">{errors.description}</span>}
        </div>
        <div className="order-fields-row">
          <div className="form-field">
            <label htmlFor="order-price">السعر <span aria-hidden="true">*</span></label>
            <div className="deposit-input-wrap">
              <input
                id="order-price"
                data-testid="input-order-price"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="any"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                aria-invalid={Boolean(errors.price)}
                aria-describedby={errors.price ? 'order-price-error' : undefined}
                required
              />
              <span aria-hidden="true">دج</span>
            </div>
            {errors.price && <span className="field-error" id="order-price-error">{errors.price}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="order-deposit">العربون</label>
            <div className="deposit-input-wrap">
              <input
                id="order-deposit"
                data-testid="input-order-deposit"
                type="number"
                inputMode="decimal"
                min="0"
                max={price === '' ? undefined : Number(price)}
                step="any"
                value={deposit}
                onChange={(event) => setDeposit(event.target.value)}
                aria-invalid={Boolean(errors.deposit)}
                aria-describedby={errors.deposit ? 'order-deposit-error' : 'order-deposit-hint'}
              />
              <span aria-hidden="true">دج</span>
            </div>
            {errors.deposit
              ? <span className="field-error" id="order-deposit-error">{errors.deposit}</span>
              : <span className="field-hint" id="order-deposit-hint">من صفر حتى سعر الطلب.</span>}
          </div>
        </div>
        <div className="order-fields-row">
          <div className="form-field">
            <label htmlFor="order-due-date">موعد التسليم <span aria-hidden="true">*</span></label>
            <input
              id="order-due-date"
              data-testid="input-order-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              aria-invalid={Boolean(errors.dueDate)}
              aria-describedby={errors.dueDate ? 'order-due-date-error' : undefined}
              required
            />
            {errors.dueDate && <span className="field-error" id="order-due-date-error">{errors.dueDate}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="order-status">الحالة</label>
            <select
              id="order-status"
              data-testid="select-order-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {orderStatuses.map((item) => (
                <option value={item.value} key={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="order-notes">ملاحظات <span className="field-hint">(اختياري)</span></label>
          <textarea
            id="order-notes"
            data-testid="input-order-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
          />
        </div>
        {saveError && <p className="records-error" role="alert" data-testid="status-order-save-error">{saveError}</p>}
        <div className="form-actions">
          <button className="cancel-button" type="button" data-testid="button-cancel-order" onClick={onClose} disabled={saving}>إلغاء</button>
          <button className="form-submit" type="submit" data-testid="button-submit-order" disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : 'حفظ الطلب'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [showForm, setShowForm] = useState(false);

  const loadOrders = useCallback(async () => {
    setStatus('loading');
    try {
      const [savedOrders, savedCustomers] = await Promise.all([
        getAllOrders(),
        getAllCustomers(),
      ]);
      setOrders(Array.isArray(savedOrders) ? savedOrders : []);
      setCustomers(Array.isArray(savedCustomers) ? savedCustomers : []);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  function addToList(order) {
    setOrders((current) => [order, ...current].sort(
      (a, b) => a.dueDate.localeCompare(b.dueDate) || b.createdAt.localeCompare(a.createdAt),
    ));
    setShowForm(false);
  }

  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const hasCustomers = customers.length > 0;

  return (
    <main className="app-content records-page orders-page" dir="rtl" data-testid="page-orders">
      <header className="module-hero">
        <span className="eyebrow">طلباتك الخاصة</span>
        <h1 className="records-heading">الطلبات</h1>
        <p className="records-subtitle">تابع التفاصيل والتسليمات القادمة بسهولة.</p>
        <div className="module-today-line">
          <span>{new Intl.DateTimeFormat('ar-DZ', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>
          <strong data-testid="text-order-count">{new Intl.NumberFormat('ar-DZ').format(orders.length)} طلب</strong>
        </div>
      </header>

      {status === 'loading' && (
        <div className="records-loading module-record-loading" role="status" aria-label="جارٍ تحميل الطلبات" data-testid="status-orders-loading">
          <div className="records-skeleton" /><div className="records-skeleton" /><div className="records-skeleton" />
        </div>
      )}
      {status === 'error' && (
        <section className="records-error" role="alert" data-testid="status-orders-error">
          <p>تعذّر تحميل الطلبات من الجهاز.</p>
          <button type="button" className="records-retry" data-testid="button-retry-orders" onClick={loadOrders}>إعادة المحاولة</button>
        </section>
      )}
      {status === 'ready' && !hasCustomers && (
        <section className="records-empty module-empty" data-testid="state-orders-no-customers">
          <span className="records-empty-mark" aria-hidden="true">ر</span>
          <h2>أضف عميلاً قبل تسجيل الطلب</h2>
          <p>اربط كل طلب خاص بعميل محفوظ في قائمتك.</p>
          <Link className="setup-link" to="/customers" data-testid="link-orders-customers">إضافة عميل</Link>
        </section>
      )}
      {status === 'ready' && hasCustomers && orders.length === 0 && (
        <section className="records-empty module-empty" data-testid="state-orders-empty">
          <span className="records-empty-mark" aria-hidden="true">ر</span>
          <h2>لا توجد طلبات خاصة بعد</h2>
          <p>سجّل وصف الطلب وسعره وموعد تسليمه لتتابعه بسهولة.</p>
        </section>
      )}
      {status === 'ready' && orders.length > 0 && (
        <section className="module-list" aria-label="قائمة الطلبات" data-testid="list-orders">
          <div className="module-list-heading">
            <h2>طلباتك</h2>
            <span>حسب موعد التسليم</span>
          </div>
          {orders.map((order) => {
            const currentStatus = orderStatuses.find((item) => item.value === order.status);
            return (
              <article className="module-record-card order-record" key={order.id} data-testid={`order-card-${order.id}`}>
                <span className="module-record-mark order-record-mark" aria-hidden="true">ر</span>
                <div className="module-record-main">
                  <div className="order-record-title">
                    <h3 data-testid={`text-order-customer-${order.id}`}>{customersById.get(order.customerId)?.name || 'عميل غير متاح'}</h3>
                    <span className={`order-status order-status-${order.status}`} data-testid={`text-order-status-${order.id}`}>
                      {currentStatus?.label || 'جديد'}
                    </span>
                  </div>
                  <p className="order-description" data-testid={`text-order-description-${order.id}`}>{order.description}</p>
                  <div className="order-record-meta">
                    <time dateTime={order.dueDate} data-testid={`text-order-due-date-${order.id}`}>التسليم {formatDate(order.dueDate)}</time>
                    <span data-testid={`text-order-deposit-${order.id}`}>العربون {money.format(order.deposit)}</span>
                  </div>
                </div>
                <strong className="order-record-price" data-testid={`text-order-price-${order.id}`}>{money.format(order.price)}</strong>
              </article>
            );
          })}
        </section>
      )}

      {status === 'ready' && hasCustomers && (
        <button
          className="record-add-button"
          type="button"
          aria-label="إضافة طلب"
          data-testid="button-add-order"
          onClick={() => setShowForm(true)}
        >
          <span aria-hidden="true">+</span>
        </button>
      )}
      {showForm && <OrderForm customers={customers} onClose={() => setShowForm(false)} onAdded={addToList} />}
    </main>
  );
}

export default Orders;
