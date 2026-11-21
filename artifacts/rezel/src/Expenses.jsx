import { useCallback, useEffect, useRef, useState } from 'react';
import { addExpense, getAllExpenses } from './db.js';

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

function formatDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('ar-DZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function ExpenseForm({ onClose, onAdded }) {
  const dialogRef = useRef(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(localDateKey());
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
    const parsedAmount = Number(amount);
    const nextErrors = {};
    if (amount === '' || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      nextErrors.amount = 'أدخل مبلغاً أكبر من صفر.';
    }
    if (!category.trim()) nextErrors.category = 'اكتب تصنيف المصروف.';
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      nextErrors.date = 'اختر تاريخاً صحيحاً.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSaveError('');
    try {
      const expense = await addExpense({
        amount: parsedAmount,
        category: category.trim(),
        date,
        notes: notes.trim(),
      });
      onAdded(expense);
    } catch {
      setSaveError('تعذّر حفظ المصروف. تحقق من البيانات وحاول مرة أخرى.');
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="record-modal expense-modal"
      aria-labelledby="expense-form-title"
      data-testid="dialog-add-expense"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
    >
      <div className="modal-topline">
        <div>
          <span className="eyebrow">تسجيل مصروف</span>
          <h2 className="modal-title" id="expense-form-title">مصروف جديد</h2>
          <p className="modal-copy">سجّل التفاصيل لتبقى مصروفاتك واضحة.</p>
        </div>
        <button
          className="modal-close"
          type="button"
          aria-label="إغلاق"
          data-testid="button-close-expense-form"
          onClick={onClose}
          disabled={saving}
        >
          ×
        </button>
      </div>
      <form className="record-form" onSubmit={submit} noValidate>
        <div className="form-field">
          <label htmlFor="expense-amount">المبلغ <span aria-hidden="true">*</span></label>
          <div className="deposit-input-wrap">
            <input
              id="expense-amount"
              data-testid="input-expense-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? 'expense-amount-error' : 'expense-amount-hint'}
              required
              autoFocus
            />
            <span aria-hidden="true">دج</span>
          </div>
          {errors.amount
            ? <span className="field-error" id="expense-amount-error">{errors.amount}</span>
            : <span className="field-hint" id="expense-amount-hint">المبلغ بالدينار الجزائري.</span>}
        </div>
        <div className="form-field">
          <label htmlFor="expense-category">التصنيف <span aria-hidden="true">*</span></label>
          <input
            id="expense-category"
            data-testid="input-expense-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            maxLength={80}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? 'expense-category-error' : undefined}
            required
          />
          {errors.category && <span className="field-error" id="expense-category-error">{errors.category}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="expense-date">التاريخ <span aria-hidden="true">*</span></label>
          <input
            id="expense-date"
            data-testid="input-expense-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? 'expense-date-error' : undefined}
            required
          />
          {errors.date && <span className="field-error" id="expense-date-error">{errors.date}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="expense-notes">ملاحظات <span className="field-hint">(اختياري)</span></label>
          <textarea
            id="expense-notes"
            data-testid="input-expense-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
          />
        </div>
        {saveError && <p className="records-error" role="alert" data-testid="status-expense-save-error">{saveError}</p>}
        <div className="form-actions">
          <button className="cancel-button" type="button" data-testid="button-cancel-expense" onClick={onClose} disabled={saving}>إلغاء</button>
          <button className="form-submit" type="submit" data-testid="button-submit-expense" disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : 'حفظ المصروف'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [status, setStatus] = useState('loading');
  const [showForm, setShowForm] = useState(false);

  const loadExpenses = useCallback(async () => {
    setStatus('loading');
    try {
      const records = await getAllExpenses();
      setExpenses(Array.isArray(records) ? records : []);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  function addToList(expense) {
    setExpenses((current) => [expense, ...current].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    ));
    setShowForm(false);
  }

  return (
    <main className="app-content records-page expense-page" dir="rtl" data-testid="page-expenses">
      <header className="module-hero">
        <span className="eyebrow">متابعة يومية</span>
        <h1 className="records-heading">المصروفات</h1>
        <p className="records-subtitle">كل ما خرج من نشاطك، مسجّل بوضوح.</p>
        <div className="module-today-line">
          <span>{new Intl.DateTimeFormat('ar-DZ', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>
          <strong data-testid="text-expense-count">{new Intl.NumberFormat('ar-DZ').format(expenses.length)} مصروف</strong>
        </div>
      </header>

      <button
        className="record-add-button"
        type="button"
        aria-label="إضافة مصروف"
        data-testid="button-add-expense"
        onClick={() => setShowForm(true)}
      >
        <span aria-hidden="true">+</span>
      </button>

      {status === 'loading' && (
        <div className="records-loading module-record-loading" role="status" aria-label="جارٍ تحميل المصروفات" data-testid="status-expenses-loading">
          <div className="records-skeleton" /><div className="records-skeleton" /><div className="records-skeleton" />
        </div>
      )}
      {status === 'error' && (
        <section className="records-error" role="alert" data-testid="status-expenses-error">
          <p>تعذّر تحميل المصروفات من الجهاز.</p>
          <button type="button" className="records-retry" data-testid="button-retry-expenses" onClick={loadExpenses}>إعادة المحاولة</button>
        </section>
      )}
      {status === 'ready' && expenses.length === 0 && (
        <section className="records-empty module-empty" data-testid="state-expenses-empty">
          <span className="records-empty-mark" aria-hidden="true">دج</span>
          <h2>ابدأ بتسجيل مصروفاتك</h2>
          <p>أضف أول مبلغ خرج من نشاطك، وستجده هنا كلما احتجت.</p>
        </section>
      )}
      {status === 'ready' && expenses.length > 0 && (
        <section className="module-list" aria-label="قائمة المصروفات" data-testid="list-expenses">
          <div className="module-list-heading">
            <h2>سجل المصروفات</h2>
            <span>الأحدث أولاً</span>
          </div>
          {expenses.map((expense) => (
            <article className="module-record-card expense-record" key={expense.id} data-testid={`expense-card-${expense.id}`}>
              <span className="module-record-mark expense-record-mark" aria-hidden="true">−</span>
              <div className="module-record-main">
                <h3 data-testid={`text-expense-category-${expense.id}`}>{expense.category}</h3>
                <time dateTime={expense.date} data-testid={`text-expense-date-${expense.id}`}>{formatDate(expense.date)}</time>
                {expense.notes && <p className="module-record-note">{expense.notes}</p>}
              </div>
              <strong className="expense-record-amount" data-testid={`text-expense-amount-${expense.id}`}>{money.format(expense.amount)}</strong>
            </article>
          ))}
        </section>
      )}
      {showForm && <ExpenseForm onClose={() => setShowForm(false)} onAdded={addToList} />}
    </main>
  );
}

export default Expenses;
