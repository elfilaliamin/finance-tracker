const { useState, useEffect, useRef, useCallback } = React;

function fmtMoney(amount, currency) {
  if (amount === null || amount === undefined) return '—';
  const symbols = { MAD: 'MAD ', USD: '$', EUR: '€' };
  const sym = symbols[currency] || (currency + ' ');
  const sign = amount < 0 ? '-' : '';
  return `${sign}${sym}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Toast({ toasts, remove }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} onClick={() => remove(t.id)}
          className={`px-4 py-2 rounded-lg shadow-lg text-sm text-white cursor-pointer animate-[fadeIn_.2s_ease] ${t.type === 'error' ? 'bg-red-600' : t.type === 'success' ? 'bg-emerald-600' : 'bg-gray-800'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  const remove = (id) => setToasts(t => t.filter(x => x.id !== id));
  return { toasts, push, remove };
}

function Card({ title, value, sub, icon, trend }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</span>
        {icon && <i className={`fa-solid ${icon} text-brand-500`}></i>}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      {trend !== undefined && trend !== null && (
        <div className={`text-xs mt-2 font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          <i className={`fa-solid ${trend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={`skeleton rounded-lg ${className}`}></div>;
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-[fadeIn_.15s_ease]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><i className="fa-solid fa-xmark"></i></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ open, onCancel, onConfirm, message }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <p className="text-gray-700 dark:text-gray-200 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
}

// Generic Chart.js wrapper — supports line/bar/pie/doughnut with area/stacked options
function ChartBox({ type, data, options, height = 260 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, { type, data, options: options || {} });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [JSON.stringify(data), type, JSON.stringify(options)]);

  return <div style={{ height }}><canvas ref={canvasRef}></canvas></div>;
}

function Sidebar({ page, setPage, onLogout, t }) {
  const items = [
    { key: 'dashboard', label: t('dashboard'), icon: 'fa-gauge' },
    { key: 'income', label: t('income'), icon: 'fa-sack-dollar' },
    { key: 'sources', label: t('sources'), icon: 'fa-layer-group' },
    { key: 'networth', label: t('networth'), icon: 'fa-chart-line' },
    { key: 'reports', label: t('reports'), icon: 'fa-file-lines' },
    { key: 'logs', label: t('logs'), icon: 'fa-clock-rotate-left' },
    { key: 'settings', label: t('settings'), icon: 'fa-gear' },
  ];
  return (
    <aside className="w-60 bg-white dark:bg-gray-800 border-e border-gray-100 dark:border-gray-700 flex flex-col shrink-0">
      <div className="px-5 py-5 font-bold text-lg text-brand-600 dark:text-brand-400 flex items-center gap-2">
        <i className="fa-solid fa-wallet"></i> FinanceTracker
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {items.map(it => (
          <button key={it.key} onClick={() => setPage(it.key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${page === it.key ? 'bg-brand-50 dark:bg-brand-700/20 text-brand-700 dark:text-brand-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
            <i className={`fa-solid ${it.icon} w-4`}></i> {it.label}
          </button>
        ))}
      </nav>
      <button onClick={onLogout} className="m-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
        <i className="fa-solid fa-right-from-bracket"></i> {t('logout')}
      </button>
    </aside>
  );
}

function Topbar({ title, displayCurrency, setDisplayCurrency }) {
  return (
    <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
      <div className="flex items-center gap-3">
        <select value={displayCurrency} onChange={e => setDisplayCurrency(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-gray-50 dark:bg-gray-700 dark:text-gray-100">
          <option value="MAD">MAD</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </div>
    </div>
  );
}
