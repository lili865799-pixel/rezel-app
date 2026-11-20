const stats = [
  { key: 'appointments', label: 'مواعيد اليوم', symbol: '◷', value: '٠', unit: 'موعد' },
  { key: 'revenue', label: 'إيرادات اليوم', symbol: 'ر', value: '٠', unit: '' },
  { key: 'pending', label: 'مدفوعات معلّقة', symbol: '◌', value: '٠', unit: 'دفعة' },
  { key: 'expenses', label: 'المصروفات', symbol: '−', value: '٠', unit: '' },
];

function Dashboard({ businessName, currentDate }) {
  return (
    <main className="app-content" dir="rtl" data-testid="page-dashboard">
      <header className="dashboard-welcome" aria-labelledby="dashboard-title">
        <p className="welcome-label">مساحة عملك اليوم</p>
        <h1 className="business-title" id="dashboard-title" data-testid="text-business-name">{businessName}</h1>
        <time className="date-line" data-testid="text-current-date">{currentDate}</time>
      </header>

      <h2 className="section-title">ملخص اليوم</h2>
      <section className="stats-grid" aria-label="إحصائيات اليوم">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.key} data-testid={`card-stat-${stat.key}`}>
            <div className="stat-topline">
              <p className="stat-label">{stat.label}</p>
              <span className="stat-mark" aria-hidden="true">{stat.symbol}</span>
            </div>
            <p className="stat-value" data-testid={`text-stat-${stat.key}`}>
              {stat.value}<span className="stat-unit">{stat.unit}</span>
            </p>
          </article>
        ))}
      </section>
      <h2 className="section-title">ابدأ يومك</h2>
      <aside className="dashboard-note" data-testid="text-dashboard-note">
        <span className="note-mark" aria-hidden="true">✦</span>
        <p>ستظهر هنا لمحة نشاطك بمجرد تسجيل أول موعد أو معاملة.</p>
      </aside>
    </main>
  );
}

export default Dashboard;
