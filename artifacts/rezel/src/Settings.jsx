import { useEffect, useRef, useState } from 'react';
import { createBackup, restoreBackup, validateBackup } from './db.js';

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ReplaceBackupDialog({ open, busy, onCancel, onConfirm }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="record-modal backup-confirm-modal"
      aria-labelledby="backup-confirm-title"
      data-testid="dialog-confirm-backup-import"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="modal-topline">
        <div>
          <span className="eyebrow">تأكيد الاستعادة</span>
          <h2 className="modal-title" id="backup-confirm-title">استبدال البيانات الحالية؟</h2>
        </div>
        <button className="modal-close" type="button" aria-label="إغلاق" onClick={onCancel} disabled={busy}>×</button>
      </div>
      <div className="backup-warning" role="alert">
        <span className="backup-warning-mark" aria-hidden="true">!</span>
        <p>سيؤدي الاستيراد إلى استبدال جميع بيانات REZEL المحفوظة على هذا الجهاز، بما فيها العملاء والخدمات والمواعيد والدفعات والمصروفات والطلبات.</p>
      </div>
      <p className="modal-copy backup-confirm-copy">لن تتغير البيانات الحالية ما لم تؤكد الاستعادة.</p>
      <div className="confirm-actions">
        <button className="cancel-button" type="button" onClick={onCancel} disabled={busy}>إلغاء</button>
        <button className="confirm-delete backup-confirm-button" type="button" onClick={onConfirm} disabled={busy} data-testid="button-confirm-backup-import">
          {busy ? 'جارٍ استبدال البيانات…' : 'استبدال واستعادة'}
        </button>
      </div>
    </dialog>
  );
}

function Settings() {
  const fileInputRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingBackup, setPendingBackup] = useState(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [message, setMessage] = useState(null);

  async function exportData() {
    if (exporting) return;
    setExporting(true);
    setMessage(null);
    let downloadUrl;

    try {
      const backup = await createBackup();
      const contents = `${JSON.stringify(backup, null, 2)}\n`;
      const blob = new Blob([contents], { type: 'application/json;charset=utf-8' });
      downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `rezel-backup-${localDateKey()}.json`;
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage({ type: 'success', text: 'تم تنزيل النسخة الاحتياطية بصيغة JSON.' });
    } catch {
      setMessage({ type: 'error', text: 'تعذّر إنشاء النسخة الاحتياطية. حاول مرة أخرى.' });
    } finally {
      if (downloadUrl) window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setExporting(false);
    }
  }

  async function selectBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage(null);

    try {
      const parsed = JSON.parse(await file.text());
      const validatedBackup = validateBackup(parsed);
      setPendingBackup(validatedBackup);
      setConfirmImport(true);
    } catch (error) {
      setPendingBackup(null);
      setMessage({
        type: 'error',
        text: error instanceof SyntaxError
          ? 'الملف المحدد ليس JSON صالحاً.'
          : error instanceof TypeError
            ? error.message
            : 'تعذّر قراءة النسخة الاحتياطية المحددة.',
      });
    }
  }

  function cancelImport() {
    if (importing) return;
    setConfirmImport(false);
    setPendingBackup(null);
  }

  async function confirmRestore() {
    if (!pendingBackup || importing) return;
    setImporting(true);
    setMessage(null);

    try {
      const restoredCounts = await restoreBackup(pendingBackup);
      const totalRecords = Object.entries(restoredCounts)
        .filter(([storeName]) => storeName !== 'settings')
        .reduce((total, [, count]) => total + count, 0);
      setConfirmImport(false);
      setPendingBackup(null);
      setMessage({
        type: 'success',
        text: `تمت استعادة النسخة بنجاح. أُعيد تحميل ${new Intl.NumberFormat('ar-DZ').format(totalRecords)} سجلاً.`,
      });
      window.dispatchEvent(new Event('rezel:backup-restored'));
    } catch {
      setConfirmImport(false);
      setPendingBackup(null);
      setMessage({
        type: 'error',
        text: 'تعذّرت استعادة النسخة. بقيت بياناتك الحالية دون تغيير.',
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="app-content records-page settings-page" dir="rtl" data-testid="page-settings">
      <header className="module-hero">
        <span className="eyebrow">بياناتك على جهازك</span>
        <h1 className="records-heading">الإعدادات</h1>
        <p className="records-subtitle">أنشئ نسخة من بيانات نشاطك أو استعد نسخة سابقة.</p>
      </header>

      <section className="settings-backup-card" aria-labelledby="backup-title">
        <div className="settings-card-heading">
          <span className="settings-backup-mark" aria-hidden="true">↗</span>
          <div>
            <h2 id="backup-title">النسخ الاحتياطي</h2>
            <p>احتفظ بنسخة JSON محلية لتستعيدها عند الحاجة.</p>
          </div>
        </div>
        <div className="settings-actions">
          <button
            className="settings-action-button settings-export-button"
            type="button"
            onClick={exportData}
            disabled={exporting || importing}
            data-testid="button-export-backup"
          >
            <span className="settings-action-symbol" aria-hidden="true">↓</span>
            <span><strong>{exporting ? 'جارٍ تجهيز النسخة…' : 'تصدير نسخة احتياطية'}</strong><small>تنزيل جميع البيانات كملف JSON</small></span>
          </button>
          <button
            className="settings-action-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={exporting || importing}
            data-testid="button-select-backup"
          >
            <span className="settings-action-symbol settings-import-symbol" aria-hidden="true">↑</span>
            <span><strong>استيراد نسخة احتياطية</strong><small>اختيار ملف REZEL محفوظ مسبقاً</small></span>
          </button>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept=".json,application/json"
            onChange={selectBackup}
            aria-label="اختيار ملف نسخة احتياطية"
            data-testid="input-backup-file"
          />
        </div>
        {message && (
          <p
            className={`backup-message backup-message-${message.type}`}
            role={message.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            data-testid="status-backup-message"
          >
            {message.text}
          </p>
        )}
      </section>

      <p className="settings-privacy-note">
        النسخة الاحتياطية تحتوي على بيانات العملاء والسجلات. احفظ الملف في مكان آمن، ولا تشاركه إلا مع من تثق به.
      </p>

      <ReplaceBackupDialog
        open={confirmImport}
        busy={importing}
        onCancel={cancelImport}
        onConfirm={confirmRestore}
      />
    </main>
  );
}

export default Settings;
