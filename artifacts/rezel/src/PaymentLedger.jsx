import { useState } from 'react';

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

function formatPaymentDate(value) {
  if (typeof value !== 'string' || !value) return 'تاريخ غير متاح';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return 'تاريخ غير متاح';
  const [, year, month, day] = match;
  return new Intl.DateTimeFormat('ar-DZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1, Number(day), 12));
}

function PaymentLedger({
  recordId,
  type,
  title,
  price,
  initialDeposit = 0,
  payments = [],
  onAddPayment,
}) {
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localDateKey());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const normalizedPrice = Number.isFinite(Number(price)) ? Math.max(Number(price), 0) : 0;
  const normalizedDeposit = Number.isFinite(Number(initialDeposit)) ? Math.max(Number(initialDeposit), 0) : 0;
  const paid = normalizedDeposit + payments.reduce((total, payment) => {
    const value = Number(payment.amount);
    return total + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);
  const remaining = Math.max(normalizedPrice - paid, 0);

  async function submit(event) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('أدخل مبلغاً أكبر من صفر.');
      return;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('اختر تاريخاً صحيحاً.');
      return;
    }
    if (parsedAmount > remaining + 0.000001) {
      setError('لا يمكن أن يتجاوز المبلغ الرصيد المتبقي.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onAddPayment({
        amount: parsedAmount,
        date,
        notes: notes.trim(),
      });
      setAmount('');
      setDate(localDateKey());
      setNotes('');
      setAdding(false);
    } catch (saveError) {
      setError(saveError instanceof RangeError
        ? 'المبلغ أكبر من الرصيد المتبقي.'
        : 'تعذّر تسجيل الدفعة. تحقق من البيانات وحاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="payment-ledger" aria-label={`مدفوعات ${title}`} data-testid={`payment-ledger-${type}-${recordId}`}>
      <div className="payment-balance">
        <div><span>السعر الإجمالي</span><strong>{money.format(normalizedPrice)}</strong></div>
        <div><span>إجمالي المدفوع</span><strong>{money.format(paid)}</strong></div>
        <div className="payment-remaining"><span>الرصيد المتبقي</span><strong>{money.format(remaining)}</strong></div>
      </div>

      <div className="payment-history-heading">
        <h3>سجل الدفعات</h3>
        <span>{payments.length + (normalizedDeposit > 0 ? 1 : 0)} دفعة</span>
      </div>
      <div className="payment-history" data-testid={`list-payments-${type}-${recordId}`}>
        {normalizedDeposit > 0 && (
          <div className="payment-history-row" data-testid={`payment-initial-deposit-${recordId}`}>
            <div><strong>العربون عند إنشاء {type === 'order' ? 'الطلب' : 'الموعد'}</strong><time>دفعة أولية</time></div>
            <strong>{money.format(normalizedDeposit)}</strong>
          </div>
        )}
        {payments
          .slice()
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
          .map((payment) => (
            <div className="payment-history-row" key={payment.id} data-testid={`payment-row-${payment.id}`}>
              <div><strong>{payment.notes || (payment.type === 'deposit' ? 'عربون' : 'دفعة')}</strong><time>{formatPaymentDate(payment.date)}</time></div>
              <strong>{money.format(Number(payment.amount) || 0)}</strong>
            </div>
          ))}
        {normalizedDeposit <= 0 && payments.length === 0 && (
          <p className="payment-history-empty">لم تُسجّل أي دفعات بعد.</p>
        )}
      </div>

      {adding ? (
        <form className="record-form payment-entry-form" onSubmit={submit} noValidate>
          <div className="form-field">
            <label htmlFor={`payment-amount-${type}-${recordId}`}>مبلغ الدفعة <span aria-hidden="true">*</span></label>
            <input
              id={`payment-amount-${type}-${recordId}`}
              type="number"
              inputMode="decimal"
              min="0.01"
              max={remaining}
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={Boolean(error)}
              autoFocus
              required
            />
            <span className="field-hint">المتاح: {money.format(remaining)}</span>
          </div>
          <div className="form-field">
            <label htmlFor={`payment-date-${type}-${recordId}`}>تاريخ الدفع <span aria-hidden="true">*</span></label>
            <input
              id={`payment-date-${type}-${recordId}`}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor={`payment-notes-${type}-${recordId}`}>ملاحظة <span className="field-hint">(اختياري)</span></label>
            <input
              id={`payment-notes-${type}-${recordId}`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={250}
            />
          </div>
          {error && <p className="records-error payment-save-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="cancel-button" type="button" onClick={() => { setAdding(false); setError(''); }} disabled={saving}>إلغاء</button>
            <button className="form-submit" type="submit" data-testid={`button-submit-payment-${type}-${recordId}`} disabled={saving}>{saving ? 'جارٍ التسجيل…' : 'تسجيل الدفعة'}</button>
          </div>
        </form>
      ) : (
        <button
          className="payment-add-button"
          type="button"
          onClick={() => setAdding(true)}
          disabled={remaining <= 0}
          data-testid={`button-add-payment-${type}-${recordId}`}
        >
          {remaining <= 0 ? 'تم سداد المبلغ' : 'إضافة دفعة'}
        </button>
      )}
    </section>
  );
}

export default PaymentLedger;
