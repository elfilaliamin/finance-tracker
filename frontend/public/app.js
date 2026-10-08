const { useState, useEffect, useRef, useContext } = React;

function LoginPage({ onLoggedIn, toast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await Api.login(username, password);
      onLoggedIn(data.user);
    } catch (err) {
      toast.push(err.response?.data?.error || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-700">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <i className="fa-solid fa-wallet text-3xl text-brand-600"></i>
          <h1 className="text-xl font-bold mt-2">Finance Tracker</h1>
          <p className="text-sm text-gray-400">Sign in to continue</p>
        </div>
        <label className="text-xs font-medium text-gray-500">Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)} autoFocus
          className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-3 mt-1 text-sm" />
        <label className="text-xs font-medium text-gray-500">Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-5 mt-1 text-sm" />
        <button disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

function DashboardPage({ displayCurrency, toast, dashboardConfig, t }) {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('year');
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    Api.dashboard(displayCurrency, period, year).then(d => { setData(d); if (d.year !== year) setYear(d.year); })
      .catch(() => toast.push('Failed to load dashboard', 'error'));
  }, [displayCurrency, period, year]);

  if (!data) {
    return <div className="grid grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  }

  const c = data.cards;
  const cardsCfg = dashboardConfig?.cards || {};
  const chartsCfg = dashboardConfig?.charts || {};
  const monthNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const anyTrendChart = chartsCfg.income_trend || chartsCfg.growth;

  const Toolbar = (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 text-sm">
        {['week', 'month', 'year'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-md ${period === p ? 'bg-white dark:bg-gray-900 shadow text-brand-700 dark:text-brand-300 font-medium' : 'text-gray-500 dark:text-gray-300'}`}>
            {t(p)}
          </button>
        ))}
      </div>
      <select value={year} onChange={e => setYear(parseInt(e.target.value, 10))}
        className="text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-1.5">
        {data.available_years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cardsCfg.today_net_worth && <Card title={t('today_net_worth')} value={fmtMoney(c.today_net_worth, displayCurrency)} icon="fa-scale-balanced" trend={c.net_worth_growth_pct} />}
        {cardsCfg.current_month_income && <Card title={t('current_month_income')} value={fmtMoney(c.current_month_income, displayCurrency)} icon="fa-calendar-day" trend={c.monthly_growth_pct} />}
        {cardsCfg.previous_month_income && <Card title={t('previous_month_income')} value={fmtMoney(c.previous_month_income, displayCurrency)} icon="fa-calendar-minus" />}
        {cardsCfg.year_income && <Card title={t('year_income')} value={fmtMoney(c.year_income, displayCurrency)} icon="fa-calendar" />}
        {cardsCfg.lifetime_income && <Card title={t('lifetime_income')} value={fmtMoney(c.lifetime_income, displayCurrency)} icon="fa-infinity" />}
        {cardsCfg.average_monthly_income && <Card title={t('average_monthly_income')} value={fmtMoney(c.average_monthly_income, displayCurrency)} icon="fa-chart-simple" />}
        {cardsCfg.highest_income_month && <Card title={t('highest_income_month')} value={c.highest_income_month ? fmtMoney(c.highest_income_month.amount, displayCurrency) : '—'}
          sub={c.highest_income_month ? `${monthNames[c.highest_income_month.month]} ${c.highest_income_month.year}` : ''} icon="fa-arrow-trend-up" />}
        {cardsCfg.lowest_income_month && <Card title={t('lowest_income_month')} value={c.lowest_income_month ? fmtMoney(c.lowest_income_month.amount, displayCurrency) : '—'}
          sub={c.lowest_income_month ? `${monthNames[c.lowest_income_month.month]} ${c.lowest_income_month.year}` : ''} icon="fa-arrow-trend-down" />}
        {cardsCfg.largest_income_source && <Card title={t('largest_income_source')} value={c.largest_income_source ? c.largest_income_source.name : '—'}
          sub={c.largest_income_source ? fmtMoney(c.largest_income_source.amount, displayCurrency) : ''} icon="fa-trophy" />}
        {cardsCfg.number_of_income_sources && <Card title={t('active_income_sources')} value={c.number_of_income_sources} icon="fa-layer-group" />}
        {cardsCfg.latest_income && <Card title={t('latest_income')} value={c.latest_income ? fmtMoney(c.latest_income.amount, displayCurrency) : '—'}
          sub={c.latest_income ? `${c.latest_income.source} · ${c.latest_income.date}` : ''} icon="fa-receipt" />}
        {cardsCfg.latest_net_worth && <Card title={t('latest_net_worth')} value={c.latest_net_worth ? fmtMoney(c.latest_net_worth.amount, displayCurrency) : '—'}
          sub={c.latest_net_worth ? c.latest_net_worth.date : ''} icon="fa-piggy-bank" />}
      </div>

      {anyTrendChart && (
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Trends</h2>
          {Toolbar}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {chartsCfg.income_trend && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <h3 className="font-semibold mb-3 text-sm text-gray-700 dark:text-gray-200">{t('income_trend')}</h3>
            <ChartBox height={280} type="line" data={{
              labels: data.charts.income_trend.map(r => r.label),
              datasets: [{ label: t('income'), data: data.charts.income_trend.map(r => r.value), borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,.1)', fill: true, tension: 0.3, pointRadius: period === 'month' ? 0 : 3 }],
            }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        )}
        {chartsCfg.growth && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <h3 className="font-semibold mb-3 text-sm text-gray-700 dark:text-gray-200">{t('growth')}</h3>
            <ChartBox height={280} type="bar" data={{
              labels: data.charts.income_growth.map(r => r.label),
              datasets: [
                { label: 'Income Growth %', data: data.charts.income_growth.map(r => r.value), backgroundColor: '#4F46E5', borderRadius: 4 },
                { label: 'Net Worth Growth %', data: data.charts.net_worth_growth.map(r => r.value), backgroundColor: '#059669', borderRadius: 4 },
              ],
            }} options={{ maintainAspectRatio: false, scales: { y: { ticks: { callback: (v) => v + '%' } } } }} />
            <p className="text-xs text-gray-400 mt-2">Net worth growth only plots where a new snapshot was recorded — gaps mean no snapshot was added that period, not zero growth.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {chartsCfg.net_worth_history && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <h3 className="font-semibold mb-3 text-sm text-gray-700 dark:text-gray-200">{t('net_worth_history')} ({year})</h3>
            <ChartBox type="line" data={{
              labels: data.charts.net_worth_history.map(r => r.date),
              datasets: [{ label: t('networth'), data: data.charts.net_worth_history.map(r => r.value), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.1)', fill: true, tension: 0.3 }],
            }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        )}
        {chartsCfg.income_by_source && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <h3 className="font-semibold mb-3 text-sm text-gray-700 dark:text-gray-200">{t('income_by_source')} ({year})</h3>
            <ChartBox type="doughnut" data={{
              labels: data.charts.income_by_source.map(r => r.name),
              datasets: [{ data: data.charts.income_by_source.map(r => r.value), backgroundColor: data.charts.income_by_source.map(r => r.color) }],
            }} options={{ maintainAspectRatio: false }} />
          </div>
        )}
        {chartsCfg.year_comparison && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <h3 className="font-semibold mb-3 text-sm text-gray-700 dark:text-gray-200">{t('year_comparison')}</h3>
            <ChartBox type="bar" data={{
              labels: data.charts.year_comparison.map(r => r.year),
              datasets: [{ label: t('income'), data: data.charts.year_comparison.map(r => r.value),
                backgroundColor: data.charts.year_comparison.map(r => r.year === year ? '#4F46E5' : '#c7d2fe'), borderRadius: 4 }],
            }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        )}
      </div>
    </div>
  );
}

function IncomeSourcesPage({ toast, t, displayCurrency }) {
  const [sources, setSources] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('sort_order');
  const [modal, setModal] = useState(null); // {mode, source}
  const [confirmId, setConfirmId] = useState(null);
  const dragIndex = useRef(null);

  const load = () => Api.listSources({ search, sort_by: sortBy, sort_dir: sortBy === 'created_at' ? 'DESC' : 'ASC', display_currency: displayCurrency })
    .then(d => setSources(d.sources)).catch(() => toast.push('Failed to load sources', 'error'));
  useEffect(() => { load(); }, [search, sortBy, displayCurrency]);

  const save = async (form) => {
    try {
      if (modal.mode === 'edit') await Api.updateSource({ id: modal.source.id, ...form });
      else await Api.createSource(form);
      toast.push('Saved', 'success');
      setModal(null);
      load();
    } catch (err) { toast.push(err.response?.data?.error || 'Save failed', 'error'); }
  };

  const doDelete = async () => {
    try { await Api.deleteSource(confirmId); toast.push('Deleted', 'success'); setConfirmId(null); load(); }
    catch (err) { toast.push(err.response?.data?.error || 'Delete failed', 'error'); setConfirmId(null); }
  };

  const onDragStart = (index) => { dragIndex.current = index; };
  const onDragOver = (e, overIndex) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === overIndex) return;
    const next = [...sources];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(overIndex, 0, moved);
    dragIndex.current = overIndex;
    setSources(next);
  };
  const onDrop = async () => {
    dragIndex.current = null;
    try {
      await Api.reorderSources(sources.map(s => s.id));
      if (sortBy !== 'sort_order') setSortBy('sort_order'); else toast.push('Order saved', 'success');
    } catch (err) { toast.push('Failed to save order', 'error'); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <input placeholder="Search sources…" value={search} onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm w-64" />
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500 dark:text-gray-400">{t('sort_by')}</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-2">
            <option value="sort_order">{t('manual_order')}</option>
            <option value="name">{t('name')}</option>
            <option value="status">{t('status')}</option>
            <option value="created_at">{t('created')}</option>
          </select>
          <button onClick={() => setModal({ mode: 'create', source: {} })} className="bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700">
            <i className="fa-solid fa-plus mr-1"></i> Add Source
          </button>
        </div>
      </div>
      {sortBy === 'sort_order' && <p className="text-xs text-gray-400"><i className="fa-solid fa-arrows-up-down mr-1"></i>{t('drag_to_reorder')}</p>}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs uppercase">
            <tr>
              {sortBy === 'sort_order' && <th className="px-4 py-3 w-8"></th>}
              <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Records</th><th className="text-left px-4 py-3">Total ({displayCurrency})</th><th></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s, index) => (
              <tr key={s.id} className="border-t border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                draggable={sortBy === 'sort_order'}
                onDragStart={() => onDragStart(index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDrop={onDrop}
                style={{ cursor: sortBy === 'sort_order' ? 'grab' : 'default' }}>
                {sortBy === 'sort_order' && <td className="px-4 py-3 text-gray-300 dark:text-gray-600"><i className="fa-solid fa-grip-vertical"></i></td>}
                <td className="px-4 py-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: s.color }}></span>{s.name}
                </td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{s.status}</span></td>
                <td className="px-4 py-3">{s.income_count}</td>
                <td className="px-4 py-3">{fmtMoney(parseFloat(s.total_display_amount), displayCurrency)}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setModal({ mode: 'edit', source: s })} className="text-gray-400 hover:text-brand-600"><i className="fa-solid fa-pen"></i></button>
                  <button onClick={() => setConfirmId(s.id)} className="text-gray-400 hover:text-red-600"><i className="fa-solid fa-trash"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SourceModal modal={modal} onClose={() => setModal(null)} onSave={save} />
      <ConfirmDialog open={!!confirmId} onCancel={() => setConfirmId(null)} onConfirm={doDelete} message="Delete this income source? This can't be undone." />
    </div>
  );
}

function SourceModal({ modal, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', color: '#4F46E5', icon: 'fa-money-bill', description: '', status: 'active' });
  const [colorError, setColorError] = useState(false);
  useEffect(() => { if (modal) { setForm({ name: '', color: '#4F46E5', icon: 'fa-money-bill', description: '', status: 'active', ...modal.source }); setColorError(false); } }, [modal]);
  if (!modal) return null;

  const setHex = (raw) => {
    let v = raw.trim();
    if (v && !v.startsWith('#')) v = '#' + v;
    setForm({ ...form, color: v });
    setColorError(v.length > 0 && !/^#[0-9A-Fa-f]{6}$/.test(v));
  };

  return (
    <Modal open={!!modal} onClose={onClose} title={modal.mode === 'edit' ? 'Edit Source' : 'Add Source'}>
      <div className="space-y-3">
        <div><label className="text-xs text-gray-500 dark:text-gray-400">Name</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm mt-1" /></div>
        <div className="flex gap-3">
          <div className="flex-1"><label className="text-xs text-gray-500 dark:text-gray-400">Color</label>
            <div className="flex gap-2 mt-1">
              <input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(form.color) ? form.color : '#4F46E5'}
                onChange={e => setHex(e.target.value)} className="h-9 w-12 rounded-lg border border-gray-200 dark:border-gray-600 shrink-0 p-0" />
              <input type="text" value={form.color} placeholder="#4F46E5" maxLength={7}
                onChange={e => setHex(e.target.value)}
                className={`flex-1 border rounded-lg px-3 py-2 text-sm font-mono dark:bg-gray-900 ${colorError ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`} />
            </div>
            {colorError && <p className="text-xs text-red-500 mt-1">Enter a valid hex code, e.g. #4F46E5</p>}
          </div>
          <div className="flex-1"><label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm mt-1">
              <option value="active">Active</option><option value="inactive">Inactive</option>
            </select></div>
        </div>
        <div><label className="text-xs text-gray-500 dark:text-gray-400">Description</label>
          <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm mt-1" /></div>
        <button disabled={colorError} onClick={() => onSave(form)} className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Save</button>
      </div>
    </Modal>
  );
}

const MONTH_NAMES = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

function groupByMonth(rows) {
  const groups = [];
  const map = new Map();
  for (const r of rows) {
    const key = r.entry_date.slice(0, 7); // YYYY-MM
    if (!map.has(key)) {
      const [y, m] = key.split('-').map(Number);
      const group = { key, label: `${MONTH_NAMES[m]} ${y}`, rows: [], subtotal: 0 };
      map.set(key, group);
      groups.push(group);
    }
    const group = map.get(key);
    group.rows.push(r);
    group.subtotal += r.display_amount;
  }
  return groups;
}

function IncomePage({ displayCurrency, toast }) {
  const [rows, setRows] = useState([]);
  const [sources, setSources] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const perPage = 50; // larger page size so month groups aren't awkwardly split

  const load = () => {
    Api.listIncome({
      search, page, per_page: perPage, display_currency: displayCurrency,
      sort_by: 'entry_date', sort_dir: 'DESC',
      year: yearFilter || undefined, source_id: sourceFilter || undefined,
    }).then(d => { setRows(d.rows); setTotal(d.total); setAvailableYears(d.available_years || []); })
      .catch(() => toast.push('Failed to load income', 'error'));
  };
  useEffect(() => { load(); }, [search, page, displayCurrency, yearFilter, sourceFilter]);
  useEffect(() => { Api.listSources({}).then(d => setSources(d.sources)); }, []);

  const save = async (form) => {
    try {
      if (modal.mode === 'edit') await Api.updateIncome({ id: modal.row.id, ...form });
      else await Api.createIncome(form);
      toast.push('Saved', 'success'); setModal(null); load();
    } catch (err) { toast.push(err.response?.data?.error || 'Save failed', 'error'); }
  };
  const doDelete = async () => {
    try { await Api.deleteIncome(confirmId); toast.push('Deleted', 'success'); setConfirmId(null); load(); }
    catch (err) { toast.push('Delete failed', 'error'); setConfirmId(null); }
  };

  const pages = Math.max(1, Math.ceil(total / perPage));
  const groups = groupByMonth(rows);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <input placeholder="Search description, notes, source…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm w-72" />
        <div className="flex items-center gap-2">
          <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-2">
            <option value="">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-2">
            <option value="">All Sources</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={() => setModal({ mode: 'create', row: {} })} className="bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 whitespace-nowrap">
            <i className="fa-solid fa-plus mr-1"></i> Add Income
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs uppercase">
            <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Source</th><th className="text-left px-4 py-3">Description</th>
              <th className="text-left px-4 py-3">Original</th><th className="text-left px-4 py-3">{displayCurrency}</th><th></th></tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <React.Fragment key={g.key}>
                <tr className="bg-gray-50 dark:bg-gray-900/60">
                  <td colSpan="4" className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">{g.label}</td>
                  <td className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-300 text-xs">{fmtMoney(g.subtotal, displayCurrency)}</td>
                  <td></td>
                </tr>
                {g.rows.map(r => (
                  <tr key={r.id} className="border-t border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3">{r.entry_date}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: r.source_color }}></span>{r.source_name}</span></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.description || '—'}</td>
                    <td className="px-4 py-3">{fmtMoney(parseFloat(r.original_amount), r.original_currency)}</td>
                    <td className="px-4 py-3 font-medium">{fmtMoney(r.display_amount, displayCurrency)}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => setModal({ mode: 'edit', row: r })} className="text-gray-400 hover:text-brand-600"><i className="fa-solid fa-pen"></i></button>
                      <button onClick={() => setConfirmId(r.id)} className="text-gray-400 hover:text-red-600"><i className="fa-solid fa-trash"></i></button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
            {rows.length === 0 && <tr><td colSpan="6" className="text-center py-10 text-gray-400">No income records yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <span>{total} records</span>
        <div className="space-x-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40">Prev</button>
          <span>Page {page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40">Next</button>
        </div>
      </div>

      <IncomeModal modal={modal} sources={sources} onClose={() => setModal(null)} onSave={save} />
      <ConfirmDialog open={!!confirmId} onCancel={() => setConfirmId(null)} onConfirm={doDelete} message="Delete this income record?" />
    </div>
  );
}

function IncomeModal({ modal, sources, onClose, onSave }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    if (modal) setForm({
      entry_date: new Date().toISOString().slice(0, 10), income_source_id: sources[0]?.id || '', category: '',
      description: '', original_currency: 'MAD', original_amount: '', notes: '', ...modal.row,
    });
  }, [modal, sources]);
  if (!modal) return null;
  return (
    <Modal open={!!modal} onClose={onClose} title={modal.mode === 'edit' ? 'Edit Income' : 'Add Income'}>
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1"><label className="text-xs text-gray-500">Date</label>
            <input type="date" value={form.entry_date || ''} onChange={e => setForm({ ...form, entry_date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
          <div className="flex-1"><label className="text-xs text-gray-500">Source</label>
            <select value={form.income_source_id || ''} onChange={e => setForm({ ...form, income_source_id: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1">
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1"><label className="text-xs text-gray-500">Amount</label>
            <input type="number" step="0.01" min="0" value={form.original_amount} onChange={e => setForm({ ...form, original_amount: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
          <div className="w-28"><label className="text-xs text-gray-500">Currency</label>
            <select value={form.original_currency} onChange={e => setForm({ ...form, original_currency: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1">
              <option>MAD</option><option>USD</option><option>EUR</option>
            </select></div>
        </div>
        <div><label className="text-xs text-gray-500">Category</label>
          <input value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
        <div><label className="text-xs text-gray-500">Description</label>
          <input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
        <div><label className="text-xs text-gray-500">Notes</label>
          <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
        <button onClick={() => onSave(form)} className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700">Save</button>
      </div>
    </Modal>
  );
}

function NetWorthPage({ displayCurrency, toast }) {
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = () => Api.listNetWorth({ display_currency: displayCurrency }).then(d => setRows(d.rows)).catch(() => toast.push('Failed to load net worth', 'error'));
  useEffect(() => { load(); }, [displayCurrency]);

  const save = async (form) => {
    try { await Api.saveNetWorth(form); toast.push('Saved', 'success'); setModal(null); load(); }
    catch (err) { toast.push(err.response?.data?.error || 'Save failed', 'error'); }
  };
  const doDelete = async () => {
    try { await Api.deleteNetWorth(confirmId); toast.push('Deleted', 'success'); setConfirmId(null); load(); }
    catch (err) { toast.push('Delete failed', 'error'); setConfirmId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm text-gray-500">Snapshots of your net worth over time. Negative values are fully supported.</h2>
        <button onClick={() => setModal({ mode: 'create', row: {} })} className="bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700">
          <i className="fa-solid fa-plus mr-1"></i> Add Snapshot
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Original</th><th className="text-left px-4 py-3">{displayCurrency}</th><th className="text-left px-4 py-3">Notes</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">{r.entry_date}</td>
                <td className="px-4 py-3">{fmtMoney(parseFloat(r.original_amount), r.original_currency)}</td>
                <td className={`px-4 py-3 font-medium ${r.display_amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>{fmtMoney(r.display_amount, displayCurrency)}</td>
                <td className="px-4 py-3 text-gray-500">{r.notes || '—'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setModal({ mode: 'edit', row: r })} className="text-gray-400 hover:text-brand-600"><i className="fa-solid fa-pen"></i></button>
                  <button onClick={() => setConfirmId(r.id)} className="text-gray-400 hover:text-red-600"><i className="fa-solid fa-trash"></i></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="5" className="text-center py-10 text-gray-400">No net worth snapshots yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <NetWorthModal modal={modal} onClose={() => setModal(null)} onSave={save} />
      <ConfirmDialog open={!!confirmId} onCancel={() => setConfirmId(null)} onConfirm={doDelete} message="Delete this net worth snapshot?" />
    </div>
  );
}

function NetWorthModal({ modal, onClose, onSave }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    if (modal) setForm({ entry_date: new Date().toISOString().slice(0, 10), original_currency: 'MAD', original_amount: '', notes: '', ...modal.row });
  }, [modal]);
  if (!modal) return null;
  return (
    <Modal open={!!modal} onClose={onClose} title={modal.mode === 'edit' ? 'Edit Snapshot' : 'Add Snapshot'}>
      <div className="space-y-3">
        <div><label className="text-xs text-gray-500">Date</label>
          <input type="date" value={form.entry_date || ''} onChange={e => setForm({ ...form, entry_date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
        <div className="flex gap-3">
          <div className="flex-1"><label className="text-xs text-gray-500">Amount (may be negative)</label>
            <input type="number" step="0.01" value={form.original_amount} onChange={e => setForm({ ...form, original_amount: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
          <div className="w-28"><label className="text-xs text-gray-500">Currency</label>
            <select value={form.original_currency} onChange={e => setForm({ ...form, original_currency: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1">
              <option>MAD</option><option>USD</option><option>EUR</option>
            </select></div>
        </div>
        <div><label className="text-xs text-gray-500">Notes</label>
          <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
        <button onClick={() => onSave(form)} className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700">Save</button>
      </div>
    </Modal>
  );
}

function ReportsPage({ displayCurrency }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-xl space-y-4">
      <h2 className="font-semibold">Export Reports</h2>
      <p className="text-sm text-gray-500">Exports use the currently selected display currency ({displayCurrency}). CSV opens directly in Excel. For native .xlsx/.pdf export, wire in PhpSpreadsheet or mPDF via Composer — see README "Extending" section.</p>
      <div className="flex gap-3">
        <div className="flex-1"><label className="text-xs text-gray-500">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
        <div className="flex-1"><label className="text-xs text-gray-500">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
      </div>
      <div className="flex gap-3">
        <a className="flex-1 text-center bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700"
          href={Api.exportCsvUrl('income', { date_from: dateFrom, date_to: dateTo, display_currency: displayCurrency })} target="_blank">
          <i className="fa-solid fa-file-csv mr-1"></i> Export Income CSV
        </a>
        <a className="flex-1 text-center bg-gray-800 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-900"
          href={Api.exportCsvUrl('networth', { date_from: dateFrom, date_to: dateTo, display_currency: displayCurrency })} target="_blank">
          <i className="fa-solid fa-file-csv mr-1"></i> Export Net Worth CSV
        </a>
      </div>
    </div>
  );
}

function ActivityLogsPage({ toast }) {
  const [rows, setRows] = useState([]);
  const [type, setType] = useState('activity');
  useEffect(() => { Api.listActivityLogs({ type }).then(d => setRows(d.rows)).catch(() => toast.push('Failed to load logs', 'error')); }, [type]);
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setType('activity')} className={`px-3 py-1.5 rounded-lg text-sm ${type === 'activity' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Activity</button>
        <button onClick={() => setType('login')} className={`px-3 py-1.5 rounded-lg text-sm ${type === 'login' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Logins</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            {type === 'activity'
              ? <tr><th className="text-left px-4 py-3">When</th><th className="text-left px-4 py-3">User</th><th className="text-left px-4 py-3">Action</th><th className="text-left px-4 py-3">Entity</th></tr>
              : <tr><th className="text-left px-4 py-3">When</th><th className="text-left px-4 py-3">Username</th><th className="text-left px-4 py-3">Success</th><th className="text-left px-4 py-3">IP</th></tr>}
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-gray-50">
                <td className="px-4 py-3 text-gray-500">{r.created_at}</td>
                {type === 'activity' ? (<>
                  <td className="px-4 py-3">{r.username || '—'}</td>
                  <td className="px-4 py-3">{r.action}</td>
                  <td className="px-4 py-3 text-gray-500">{r.entity_type || '—'} {r.entity_id || ''}</td>
                </>) : (<>
                  <td className="px-4 py-3">{r.username}</td>
                  <td className="px-4 py-3">{r.success ? <span className="text-emerald-600">✓</span> : <span className="text-red-600">✗</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{r.ip_address}</td>
                </>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChangePasswordCard({ toast, t }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) { toast.push("New passwords don't match", 'error'); return; }
    if (form.new_password.length < 8) { toast.push('New password must be at least 8 characters', 'error'); return; }
    setLoading(true);
    try {
      await Api.changePassword({ current_password: form.current_password, new_password: form.new_password });
      toast.push('Password updated', 'success');
      setForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) { toast.push(err.response?.data?.error || 'Failed to update password', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-3">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('change_password')}</h2>
      <div><label className="text-xs text-gray-500 dark:text-gray-400">{t('current_password')}</label>
        <input type="password" value={form.current_password} onChange={e => setForm({ ...form, current_password: e.target.value })}
          className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm mt-1" required /></div>
      <div><label className="text-xs text-gray-500 dark:text-gray-400">{t('new_password')}</label>
        <input type="password" value={form.new_password} onChange={e => setForm({ ...form, new_password: e.target.value })}
          className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm mt-1" required /></div>
      <div><label className="text-xs text-gray-500 dark:text-gray-400">{t('confirm_new_password')}</label>
        <input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
          className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm mt-1" required /></div>
      <button disabled={loading} className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
        {t('update_password')}
      </button>
    </form>
  );
}

function DashboardCustomizationCard({ dashboardConfig, setDashboardConfig, toast, t }) {
  const cardLabels = {
    today_net_worth: t('today_net_worth'), current_month_income: t('current_month_income'), previous_month_income: t('previous_month_income'),
    year_income: t('year_income'), lifetime_income: t('lifetime_income'), average_monthly_income: t('average_monthly_income'),
    highest_income_month: t('highest_income_month'), lowest_income_month: t('lowest_income_month'), largest_income_source: t('largest_income_source'),
    number_of_income_sources: t('active_income_sources'), latest_income: t('latest_income'), latest_net_worth: t('latest_net_worth'),
  };
  const chartLabels = {
    income_trend: t('income_trend'), growth: t('growth'), net_worth_history: t('net_worth_history'),
    income_by_source: t('income_by_source'), year_comparison: t('year_comparison'),
  };

  const toggle = async (section, key) => {
    const next = { ...dashboardConfig, [section]: { ...dashboardConfig[section], [key]: !dashboardConfig[section][key] } };
    setDashboardConfig(next);
    try { await Api.updateSettings({ dashboard_config: next }); }
    catch (err) { toast.push('Failed to save dashboard preference', 'error'); }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4 lg:col-span-2">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard_customization')}</h2>
      <div>
        <h3 className="text-xs uppercase text-gray-400 mb-2">{t('show_cards')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.keys(cardLabels).map(key => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={!!dashboardConfig.cards[key]} onChange={() => toggle('cards', key)} className="rounded" />
              {cardLabels[key]}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs uppercase text-gray-400 mb-2">{t('show_charts')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.keys(chartLabels).map(key => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={!!dashboardConfig.charts[key]} onChange={() => toggle('charts', key)} className="rounded" />
              {chartLabels[key]}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClearDataCard({ toast, t }) {
  const [scope, setScope] = useState(null); // 'income' | 'networth' | 'all' | null
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doClear = async () => {
    setLoading(true);
    try {
      await Api.clearData({ password, scope });
      toast.push('Data cleared', 'success');
      setScope(null); setPassword('');
    } catch (err) { toast.push(err.response?.data?.error || 'Failed to clear data', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/50 p-6 space-y-3">
      <h2 className="font-semibold text-red-600">{t('danger_zone')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">{t('clear_data_desc')}</p>
      <div className="flex flex-col gap-2">
        <button onClick={() => setScope('income')} className="text-sm text-left px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">{t('clear_income')}</button>
        <button onClick={() => setScope('networth')} className="text-sm text-left px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">{t('clear_networth')}</button>
        <button onClick={() => setScope('all')} className="text-sm text-left px-3 py-2 rounded-lg border border-red-300 dark:border-red-900/50 text-red-700 font-medium hover:bg-red-50 dark:hover:bg-red-900/20">{t('clear_all')}</button>
      </div>

      <Modal open={!!scope} onClose={() => setScope(null)} title={t('clear_data')}>
        <div className="space-y-3">
          <p className="text-sm text-red-600">{t('clear_data_desc')}</p>
          <div><label className="text-xs text-gray-500 dark:text-gray-400">{t('enter_password_confirm')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm mt-1" /></div>
          <button disabled={loading || !password} onClick={doClear} className="w-full bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {t('confirm_clear')}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function SettingsPage({ displayCurrency, setDisplayCurrency, toast, t, onSettingsApplied, dashboardConfig, setDashboardConfig }) {
  const [settings, setSettings] = useState(null);
  const [rates, setRates] = useState(null);

  const load = () => {
    Api.getSettings().then(d => setSettings(d.settings));
    Api.getExchangeRates().then(setRates);
  };
  useEffect(load, []);

  const update = async (patch) => {
    try {
      const d = await Api.updateSettings(patch);
      setSettings(d.settings);
      onSettingsApplied(d.settings); // re-applies theme/language/currency immediately app-wide
      toast.push('Settings updated', 'success');
    } catch (err) { toast.push('Update failed', 'error'); }
  };

  const refreshRates = async () => {
    try { await Api.refreshExchangeRates(); toast.push('Rates refreshed', 'success'); load(); }
    catch (err) { toast.push(err.response?.data?.error || 'Refresh failed (using cached rates)', 'error'); }
  };

  if (!settings) return <Skeleton className="h-64" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('currency_display')}</h2>
        <div><label className="text-xs text-gray-500 dark:text-gray-400">{t('display_currency')}</label>
          <select value={settings.display_currency} onChange={e => update({ display_currency: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm mt-1">
            <option>MAD</option><option>USD</option><option>EUR</option>
          </select></div>
        <div><label className="text-xs text-gray-500 dark:text-gray-400">{t('conversion_mode')}</label>
          <select value={settings.conversion_mode} onChange={e => update({ conversion_mode: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm mt-1">
            <option value="historical">{t('historical_rates')}</option><option value="live">{t('live_rates')}</option>
          </select></div>
        <div><label className="text-xs text-gray-500 dark:text-gray-400">{t('auto_update_frequency')}</label>
          <select value={settings.auto_update_rates} onChange={e => update({ auto_update_rates: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm mt-1">
            <option value="startup">Every Startup</option><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="manual">Manual Only</option>
          </select></div>
        <div><label className="text-xs text-gray-500 dark:text-gray-400">{t('theme')}</label>
          <select value={settings.theme} onChange={e => update({ theme: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm mt-1">
            <option value="light">{t('light')}</option><option value="dark">{t('dark')}</option>
          </select></div>
        <div><label className="text-xs text-gray-500 dark:text-gray-400">{t('language')}</label>
          <select value={settings.language || 'en'} onChange={e => update({ language: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm mt-1">
            <option value="en">English</option><option value="fr">Français</option><option value="ar">العربية</option>
          </select></div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('exchange_rates')}</h2>
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <div>USD → MAD: <b>{rates?.USD_MAD ?? '—'}</b> <span className="text-xs text-gray-400">({rates?.usd_source || 'n/a'})</span></div>
          <div>EUR → MAD: <b>{rates?.EUR_MAD ?? '—'}</b> <span className="text-xs text-gray-400">({rates?.eur_source || 'n/a'})</span></div>
          <div className="text-xs text-gray-400">Last updated: {settings.last_rate_update || 'never'}</div>
        </div>
        <button onClick={refreshRates} className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700">
          <i className="fa-solid fa-rotate mr-1"></i> {t('update_rates_now')}
        </button>
        <p className="text-xs text-gray-400">Fallback chain: frankfurter.app → open.er-api.com → exchangerate.host → cached DB values.</p>
      </div>

      <ChangePasswordCard toast={toast} t={t} />
      <ClearDataCard toast={toast} t={t} />
      <DashboardCustomizationCard dashboardConfig={dashboardConfig} setDashboardConfig={setDashboardConfig} toast={toast} t={t} />
    </div>
  );
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function applyLanguage(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

const DEFAULT_DASHBOARD_CONFIG = {
  cards: {
    today_net_worth: true, current_month_income: true, previous_month_income: true, year_income: true,
    lifetime_income: true, average_monthly_income: true, highest_income_month: true, lowest_income_month: true,
    largest_income_source: true, number_of_income_sources: true, latest_income: true, latest_net_worth: true,
  },
  charts: {
    income_trend: true, growth: true, net_worth_history: true, income_by_source: true, year_comparison: true,
  },
};

function App() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = logged out
  const [page, setPage] = useState('dashboard');
  const [displayCurrency, setDisplayCurrency] = useState('MAD');
  const [lang, setLang] = useState('en');
  const [dashboardConfig, setDashboardConfig] = useState(DEFAULT_DASHBOARD_CONFIG);
  const toast = useToasts();
  const t = (key) => translate(lang, key);

  const applySettings = (s) => {
    setDisplayCurrency(s.display_currency);
    setLang(s.language || 'en');
    applyTheme(s.theme || 'light');
    applyLanguage(s.language || 'en');
    setDashboardConfig({
      cards: { ...DEFAULT_DASHBOARD_CONFIG.cards, ...(s.dashboard_config?.cards || {}) },
      charts: { ...DEFAULT_DASHBOARD_CONFIG.charts, ...(s.dashboard_config?.charts || {}) },
    });
  };

  useEffect(() => {
    Api.checkSession().then(d => {
      if (d.authenticated) { setUser(d.user); Api.getSettings().then(s => applySettings(s.settings)); }
      else setUser(null);
    }).catch(() => setUser(null));
  }, []);

  const handleLogout = async () => { await Api.logout(); setUser(null); };

  if (user === undefined) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (!user) return (<><LoginPage onLoggedIn={(u) => { setUser(u); Api.getSettings().then(s => applySettings(s.settings)); }} toast={toast} /><Toast toasts={toast.toasts} remove={toast.remove} /></>);

  const titles = { dashboard: t('dashboard'), income: t('income'), sources: t('sources'), networth: t('networth'), reports: t('reports'), logs: t('logs'), settings: t('settings') };

  return (
    <LangContext.Provider value={{ lang, t }}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar page={page} setPage={setPage} onLogout={handleLogout} t={t} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar title={titles[page]} displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} />
          <main className="flex-1 overflow-y-auto p-6">
            {page === 'dashboard' && <DashboardPage displayCurrency={displayCurrency} toast={toast} dashboardConfig={dashboardConfig} t={t} />}
            {page === 'income' && <IncomePage displayCurrency={displayCurrency} toast={toast} />}
            {page === 'sources' && <IncomeSourcesPage toast={toast} t={t} displayCurrency={displayCurrency} />}
            {page === 'networth' && <NetWorthPage displayCurrency={displayCurrency} toast={toast} />}
            {page === 'reports' && <ReportsPage displayCurrency={displayCurrency} />}
            {page === 'logs' && <ActivityLogsPage toast={toast} />}
            {page === 'settings' && <SettingsPage displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency}
              toast={toast} t={t} onSettingsApplied={applySettings} dashboardConfig={dashboardConfig} setDashboardConfig={setDashboardConfig} />}
          </main>
        </div>
        <Toast toasts={toast.toasts} remove={toast.remove} />
      </div>
    </LangContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
