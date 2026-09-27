import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { apiRequest } from './api';

const incomeCategories = ['Salary', 'Freelance', 'Allowance', 'Other Income'];
const expenseCategories = ['Rent', 'Food', 'Entertainment', 'Travel', 'Mobile Recharge', 'Shopping', 'Bills', 'Health', 'Education', 'Miscellaneous'];
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const mapColors = ['#EF4444', '#F59E0B', '#10B981', '#9CA3AF', '#059669', '#F9FAFB'];
const budgetRates = { Rent: 0.25, Food: 0.15, Entertainment: 0.05, Travel: 0.08, 'Mobile Recharge': 0.03, Shopping: 0.07, Bills: 0.12, Health: 0.08, Education: 0.08, Miscellaneous: 0.02 };
const protectedBudgetCategories = ['Rent', 'Health'];
const transactionPageSize = 6;

function money(value) { return currency.format(Number(value || 0)); }
function dateOnly(value) { return String(value).slice(0, 10); }
function formatDate(value) { return new Date(`${dateOnly(value)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
function monthLabel(value) { return new Date(`${dateOnly(value)}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); }

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('moneymap_theme') || 'light');
  useEffect(() => {
    if (!localStorage.getItem('moneymap_token')) { setCheckingSession(false); return; }
    apiRequest('/auth/me').then((data) => setUser(data.user)).catch(() => localStorage.removeItem('moneymap_token')).finally(() => setCheckingSession(false));
  }, []);
  function handleAuth(data) { localStorage.setItem('moneymap_token', data.token); setUser(data.user); }
  function logout() { localStorage.removeItem('moneymap_token'); setUser(null); }
  function toggleTheme() { setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light'); }
  useEffect(() => { localStorage.setItem('moneymap_theme', theme); }, [theme]);
  if (checkingSession) return <div className="loading-screen">Loading your MoneyMap...</div>;
  return <div className={`app-root theme-${theme}`}><ThemeToggle theme={theme} onToggleTheme={toggleTheme} /><BrowserRouter><Routes>
    <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="login" onAuth={handleAuth} />} />
    <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="register" onAuth={handleAuth} />} />
    <Route element={user ? <ProtectedLayout user={user} onLogout={logout} theme={theme} onToggleTheme={toggleTheme} /> : <Navigate to="/login" replace />}>
      <Route path="/" element={<Navigate to={localStorage.getItem('moneymap_getting_started_seen') === 'true' ? '/dashboard' : '/getting-started'} replace />} /><Route path="/getting-started" element={<GettingStartedPage />} /><Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/transactions" element={<TransactionsPage />} /><Route path="/transactions/new" element={<TransactionFormPage />} />
      <Route path="/transactions/:id/edit" element={<TransactionFormPage />} /><Route path="/money-map" element={<MoneyMapPage />} /><Route path="/saving-map" element={<SavingMapPageWithGoal />} /><Route path="/profile" element={<ProfilePage />} />
    </Route>
  </Routes></BrowserRouter><BuildFooter /></div>;
}

function BuildFooter() {
  return <footer className="build-footer">Deployed commit <code>{import.meta.env.VITE_GIT_COMMIT || 'local'}</code></footer>;
}

function AuthPage({ mode, onAuth }) {
  const isRegister = mode === 'register'; const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' }); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  async function submit(event) { event.preventDefault(); setError(''); setSubmitting(true); try { const data = await apiRequest(`/auth/${isRegister ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(form) }); onAuth(data); navigate(localStorage.getItem('moneymap_getting_started_seen') === 'true' ? '/dashboard' : '/getting-started'); } catch (requestError) { setError(requestError.message); } finally { setSubmitting(false); } }
  return <main className="auth-shell"><section className="auth-intro"><MoneyMapLogo /><p className="eyebrow">Personal finance, made clear</p><h1>Make room for what matters.</h1><p>See the shape of your money, one thoughtful entry at a time.</p><div className="auth-points"><span><strong>01</strong>Know what comes in</span><span><strong>02</strong>See where it goes</span><span><strong>03</strong>Build your breathing room</span></div></section><form className="auth-card" onSubmit={submit}><div className="form-badge">{isRegister ? 'New here' : 'Your money, in focus'}</div><p className="eyebrow">{isRegister ? 'Start your map' : 'Welcome back'}</p><h2>{isRegister ? 'Create your account' : 'Sign in to MoneyMap'}</h2><p className="auth-card-copy">{isRegister ? 'A clear view of your finances starts here.' : 'Pick up where you left off.'}</p>{isRegister && <label>Username<input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>}<label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Password<input required minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={submitting}>{submitting ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}</button><p className="switch-auth">{isRegister ? 'Already have an account?' : 'New to MoneyMap?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create one'}</Link></p></form></main>;
}

function MoneyMapLogo() { return <span className="logo-lockup"><span className="logo-symbol" aria-hidden="true"><span>₹</span></span><span>MoneyMap</span></span>; }
function ThemeToggle({ theme, onToggleTheme }) { return <button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}><span aria-hidden="true">{theme === 'light' ? '◐' : '☼'}</span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</button>; }
function ProtectedLayout({ user, onLogout }) { const location = useLocation(); return <div className="app-layout"><aside className="sidebar"><Link className="brand" to="/dashboard"><MoneyMapLogo /></Link><nav className="main-nav"><NavLink to="/dashboard">Overview</NavLink><NavLink to="/transactions">Transactions</NavLink><NavLink className="money-map-link" to="/money-map">Money Map</NavLink><NavLink to="/saving-map">Saving Map</NavLink><NavLink to="/getting-started">How it works</NavLink></nav><div className="sidebar-bottom"><NavLink to="/profile">{user.username}</NavLink><button className="text-button" onClick={onLogout}>Log out</button></div></aside><main className="main-content"><div className="page-view" key={location.pathname}><Outlet context={{ user }} /></div></main></div>; }
function PageHeader({ eyebrow, title, action }) { return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{action}</header>; }
function SummaryCard({ label, value, tone, isCount }) { return <article className={`summary-card ${tone}`}><span>{label}</span><strong>{isCount ? value : money(value)}</strong><small>{isCount ? 'recorded so far' : value >= 0 ? 'current total' : 'needs attention'}</small></article>; }

function GettingStartedPage() {
  const navigate = useNavigate();
  const [monthlyChange, setMonthlyChange] = useState('1000');
  const [activeStep, setActiveStep] = useState('');
  const steps = [
    ['Track', 'Add your income and expenses.', 'guide-track'],
    ['Understand', 'See where your money goes.', 'guide-understand'],
    ['Plan', 'Compare spending with a monthly plan.', 'guide-plan'],
    ['Save', 'Set a monthly savings target.', 'guide-save'],
    ['Simulate', 'Try a simple what-if scenario.', 'guide-simulate'],
  ];
  const annualDifference = (Number(monthlyChange) || 0) * 12;

  function getStarted() {
    localStorage.setItem('moneymap_getting_started_seen', 'true');
    navigate('/dashboard');
  }

  return <div className="getting-started-page">
    <header className="getting-started-hero">
      <p className="eyebrow">Getting started</p>
      <h1>Welcome to MoneyMap</h1>
      <p>Track your money. Understand your spending. Plan your future.</p>
      <button className="primary-button" type="button" onClick={getStarted}>Get Started</button>
    </header>

    <section className="guide-section" aria-labelledby="how-money-map-works">
      <div className="guide-section-heading"><p className="eyebrow">Track → Understand → Plan → Save</p><h2 id="how-money-map-works">How MoneyMap Works</h2></div>
      <div className="guide-step-grid">{steps.map(([title, description, anchor], index) => <a className={`guide-step ${activeStep === title ? 'selected' : ''}`} href={`#${anchor}`} key={title} onClick={() => setActiveStep(title)}><span className="guide-step-number">0{index + 1}</span><h3>{title}</h3><p>{description}</p></a>)}</div>
    </section>

    <section className="guide-why" aria-labelledby="why-money-map">
      <div><p className="eyebrow">One clear picture</p><h2 id="why-money-map">Why MoneyMap?</h2><p>MoneyMap brings your financial information together into one unified view, helping you understand your income, expenses, spending patterns, budgets, and savings goals.</p></div>
      <div className="guide-flow" aria-label="Financial sources flow into transactions, MoneyMap, spending analysis, budgets and savings goals, and financial planning">{['Financial sources', 'Transactions', 'MoneyMap', 'Spending analysis', 'Budgets + savings goals', 'Financial planning'].map((item, index) => <div className="guide-flow-step" key={item}><span>0{index + 1}</span><strong>{item}</strong></div>)}</div>
    </section>

    <section className="guide-details" aria-label="MoneyMap features">
      <article className="guide-detail" id="guide-track"><p className="eyebrow">01 · Track</p><h3>Add your financial data</h3><p>Enter income and expenses manually, choose a category, and add a date and description. Cash purchases, card spending, and digital-wallet payments can all be recorded this way. Direct payment-app connections and CSV import are not available in the current version.</p></article>
      <article className="guide-detail" id="guide-understand"><p className="eyebrow">02 · Understand</p><h3>See where your money goes</h3><p>The dashboard summarizes income, expenses, remaining balance, and savings. Money Map groups expenses into categories such as food, rent, travel, entertainment, bills, and shopping so spending patterns are easier to see.</p></article>
      <article className="guide-detail" id="guide-plan"><p className="eyebrow">03 · Plan</p><h3>Compare plans with real spending</h3><p>Saving Map compares recorded spending with category recommendations based on the salary and savings rate you enter. These recommendations are adjustable through those inputs; separate custom limits for each category are not currently supported.</p></article>
      <article className="guide-detail" id="guide-save"><p className="eyebrow">04 · Save</p><h3>Set a savings target</h3><p>Set a monthly savings amount and follow progress against your current savings. Goals such as a laptop, emergency fund, trip, or education can guide the amount you choose. Named goal tracking and target dates are not currently available.</p></article>
      <article className="guide-detail guide-simulation" id="guide-simulate"><p className="eyebrow">05 · Simulate</p><h3>Explore a what-if scenario</h3><p>For example, see the arithmetic impact of reducing entertainment spending by a chosen amount each month.</p><label htmlFor="what-if-reduction">Hypothetical monthly reduction<input id="what-if-reduction" type="number" min="0" step="100" value={monthlyChange} onChange={(event) => setMonthlyChange(event.target.value)} /></label><div className="scenario-result"><span>Illustrative difference over 12 months</span><strong>{money(annualDifference)}</strong></div><p className="guide-note">This is a simple planning illustration only. It does not change transactions or predict results, and it is not financial advice.</p></article>
      <article className="guide-detail"><p className="eyebrow">06 · Review</p><h3>Keep track over time</h3><p>Transaction history is grouped by month and divided into pages. Search, filters, and month-to-month comparison views are not currently available.</p></article>
    </section>

    <div className="guide-finish"><p>Ready to see your own MoneyMap?</p><button className="primary-button" type="button" onClick={getStarted}>Get Started</button></div>
  </div>;
}

function DashboardPage() {
  const [data, setData] = useState({ summary: null, breakdown: [], transactions: [] }); const [error, setError] = useState('');
  useEffect(() => { Promise.all([apiRequest('/dashboard/summary'), apiRequest('/dashboard/category-breakdown'), apiRequest('/transactions')]).then(([summaryData, breakdownData, transactionData]) => setData({ summary: summaryData.summary, breakdown: breakdownData.breakdown, transactions: transactionData.transactions })).catch((requestError) => setError(requestError.message)); }, []);
  const summary = data.summary || { income: 0, expenses: 0, balance: 0, savings: 0, transactionCount: 0 }; const savingGoal = Number(localStorage.getItem('moneymap_saving_goal')) || 0;
  return <><PageHeader eyebrow="Your month at a glance" title="Good to see you." action={<Link className="primary-button compact" to="/transactions/new">+ Add transaction</Link>} />{error && <p className="form-error">{error}</p>}{data.summary && summary.balance <= 0 && <BalanceAlert balance={summary.balance} />}<SavingGoalDashboard goal={savingGoal} saved={summary.savings} /><section className="summary-grid"><SummaryCard label="Total income" value={summary.income} tone="green" /><SummaryCard label="Total expenses" value={summary.expenses} tone="coral" /><SummaryCard label="Remaining balance" value={summary.balance} tone="ink" /><SummaryCard label="Total savings" value={summary.savings} tone="cream" /></section><section className="content-grid"><div className="panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">Latest activity</p><h2>Recent transactions</h2></div><Link to="/transactions">View all</Link></div><TransactionList transactions={data.transactions.slice(0, 5)} /></div><CategoryPanel breakdown={data.breakdown} /></section></>;
}

function BalanceAlert({ balance }) { const isNegative = balance < 0; return <div className="balance-alert" role="alert"><span className="balance-alert-icon">!</span><div><strong>{isNegative ? 'Your current balance is negative.' : 'Your current balance is zero.'}</strong><p>{isNegative ? 'Add income or review your expenses to bring your balance back up.' : 'Consider adding income or keeping new expenses low for now.'}</p></div></div>; }
function SavingGoalDashboard({ goal, saved }) {
  const [showCelebration, setShowCelebration] = useState(false);
  const progress = goal > 0 ? Math.min(100, Math.max(0, (saved / goal) * 100)) : 0;
  const goalReached = goal > 0 && saved >= goal;

  useEffect(() => {
    if (!goalReached) return undefined;
    const key = `moneymap_goal_celebrated_${goal}`;
    if (sessionStorage.getItem(key)) return undefined;

    sessionStorage.setItem(key, 'true');
    setShowCelebration(true);
    const timeout = window.setTimeout(() => setShowCelebration(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [goal, goalReached]);

  if (!goal) return <div className="saving-goal-dashboard empty-goal"><div><p className="eyebrow">This month</p><strong>No saving goal set yet</strong><span>Choose an amount to protect before month end.</span></div><Link className="secondary-button" to="/saving-map">Set a goal</Link></div>;

  const remaining = Math.max(0, goal - saved);
  return <div className={`saving-goal-dashboard${goalReached ? ' goal-complete' : ''}`}>
    {showCelebration && <div className="goal-confetti" aria-hidden="true">{[-132, -108, -84, -60, -36, -12, 12, 36, 60, 84, 108, 132, -120, -72, -24, 24, 72, 120].map((offset, index) => <span key={index} style={{ '--confetti-x': `${offset}px`, '--confetti-delay': `${(index % 6) * 45}ms`, '--confetti-hue': `${(index * 37) % 360}deg` }} />)}</div>}
    <div className="goal-copy"><p className="eyebrow">This month’s goal</p><strong>Save {money(goal)} by month end</strong><span>{remaining ? `${money(remaining)} left to reach your goal` : 'Goal reached. Great work.'}</span>{goalReached && <span className="goal-achieved" role="status">🎉 Goal achieved — you did it!</span>}</div>
    <div className="goal-progress"><div><span>Progress</span><strong>{Math.round(progress)}%</strong></div><div className="goal-progress-track"><span style={{ width: `${progress}%` }} /></div></div>
    <Link className="secondary-button" to="/saving-map">View plan</Link>
  </div>;
}
function TransactionList({ transactions, onDelete }) { if (!transactions.length) return <div className="empty-state">No transactions yet. Add your first income or expense to begin.</div>; return <div className="transaction-list">{transactions.map((transaction) => <div className="transaction-row" key={transaction.id}><div className={`transaction-icon ${transaction.type}`}>{transaction.type === 'income' ? '↑' : '↓'}</div><div className="transaction-info"><strong>{transaction.category}</strong><span>{transaction.description || 'No description'} · {formatDate(transaction.date)}</span></div><strong className={transaction.type === 'income' ? 'amount-income' : 'amount-expense'}>{transaction.type === 'income' ? '+' : '-'}{money(transaction.amount)}</strong>{onDelete && <><Link className="row-action" to={`/transactions/${transaction.id}/edit`}>Edit</Link><button className="row-action delete-action" onClick={() => onDelete(transaction.id)}>Delete</button></>}</div>)}</div>; }
function CategoryPanel({ breakdown }) { const [selectedCategory, setSelectedCategory] = useState(null); const max = breakdown[0]?.amount || 1; function selectCategory(category) { setSelectedCategory((currentCategory) => currentCategory === category ? null : category); } function handleKeyDown(event, category) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectCategory(category); } } return <div className="panel category-panel"><div className="panel-heading"><div><p className="eyebrow">Where it goes</p><h2>Expense breakdown</h2></div><Link to="/money-map">Details</Link></div>{breakdown.length ? <div className="category-bars">{breakdown.slice(0, 5).map((item) => <div className={`category-item ${selectedCategory === item.category ? 'selected' : ''}`} key={item.category} role="button" tabIndex="0" onClick={() => selectCategory(item.category)} onKeyDown={(event) => handleKeyDown(event, item.category)}><div><span>{item.category}</span><strong>{money(item.amount)}</strong></div><div className="bar-track"><span style={{ width: `${(item.amount / max) * 100}%` }} /></div></div>)}</div> : <div className="empty-state">Your category chart will appear here.</div>}</div>; }

function TransactionsPage() {
  const [transactions, setTransactions] = useState([]); const [page, setPage] = useState(1); const [error, setError] = useState(''); const load = () => apiRequest('/transactions').then((data) => { setTransactions(data.transactions); setPage(1); }).catch((requestError) => setError(requestError.message)); useEffect(() => { load(); }, []);
  async function remove(id) { if (!window.confirm('Delete this transaction?')) return; try { await apiRequest(`/transactions/${id}`, { method: 'DELETE' }); load(); } catch (requestError) { setError(requestError.message); } }
  const pageCount = Math.max(1, Math.ceil(transactions.length / transactionPageSize)); const pageTransactions = transactions.slice((page - 1) * transactionPageSize, page * transactionPageSize); const grouped = pageTransactions.reduce((groups, transaction) => { const month = monthLabel(transaction.date); groups[month] = groups[month] || []; groups[month].push(transaction); return groups; }, {});
  return <><PageHeader eyebrow="Your record" title="Transactions" action={<Link className="primary-button compact" to="/transactions/new">+ Add transaction</Link>} />{error && <p className="form-error">{error}</p>}<div className="panel full-panel">{Object.keys(grouped).length ? Object.entries(grouped).map(([month, monthTransactions]) => <section className="month-group" key={month}><div className="month-heading"><h2>{month}</h2><span>{monthTransactions.length} record{monthTransactions.length === 1 ? '' : 's'}</span></div><TransactionList transactions={monthTransactions} onDelete={remove} /></section>) : <div className="empty-state">No transactions yet. Add your first income or expense to begin.</div>}{transactions.length > transactionPageSize && <div className="pagination"><button className="secondary-button" disabled={page === 1} onClick={() => setPage((currentPage) => currentPage - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button className="secondary-button" disabled={page === pageCount} onClick={() => setPage((currentPage) => currentPage + 1)}>Next</button></div>}</div></>;
}

function TransactionFormPage() {
  const { id } = useParams(); const navigate = useNavigate(); const [form, setForm] = useState({ type: 'expense', amount: '', category: 'Food', description: '', date: new Date().toISOString().slice(0, 10) }); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const [budgetWarning, setBudgetWarning] = useState(false);
  useEffect(() => { if (id) apiRequest(`/transactions/${id}`).then((data) => setForm({ ...data.transaction, amount: data.transaction.amount })).catch((requestError) => setError(requestError.message)); }, [id]);
  const categories = form.type === 'income' ? incomeCategories : expenseCategories; function changeType(type) { setForm({ ...form, type, category: type === 'income' ? incomeCategories[0] : expenseCategories[0] }); }
  async function saveTransaction(skipWarning = false) { setSaving(true); setError(''); try { if (!id && form.type === 'expense' && !skipWarning) { const { summary } = await apiRequest('/dashboard/summary'); const projectedBalance = summary.balance - Number(form.amount); if (projectedBalance <= 0) { setBudgetWarning(true); setSaving(false); return; } } await apiRequest(id ? `/transactions/${id}` : '/transactions', { method: id ? 'PUT' : 'POST', body: JSON.stringify(form) }); navigate('/transactions'); } catch (requestError) { setError(requestError.message); } finally { setSaving(false); } }
  function submit(event) { event.preventDefault(); saveTransaction(); }
  return <><PageHeader eyebrow={id ? 'Update a record' : 'New record'} title={id ? 'Edit transaction' : 'Add transaction'} /><form className="panel form-panel" onSubmit={submit}><div className="type-switch"><button type="button" className={form.type === 'expense' ? 'selected expense-tab' : ''} onClick={() => changeType('expense')}>Expense</button><button type="button" className={form.type === 'income' ? 'selected income-tab' : ''} onClick={() => changeType('income')}>Income</button></div><div className="form-grid"><label>Amount<input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" /></label><label>Date<input required type="date" value={form.date ? String(form.date).slice(0, 10) : ''} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Description<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What was this for?" /></label></div>{error && <p className="form-error">{error}</p>}<div className="form-actions"><Link className="secondary-button" to="/transactions">Cancel</Link><button className="primary-button" disabled={saving}>{saving ? 'Saving...' : id ? 'Save changes' : 'Add transaction'}</button></div></form>{budgetWarning && <BudgetWarning onCancel={() => setBudgetWarning(false)} onContinue={() => { setBudgetWarning(false); saveTransaction(true); }} />}</>;
}

function BudgetWarning({ onCancel, onContinue }) { return <div className="budget-warning-overlay" role="presentation"><div className="budget-warning-card" role="alertdialog" aria-modal="true" aria-labelledby="budget-warning-title"><div className="budget-warning-icon">!</div><p className="eyebrow">Budget check</p><h2 id="budget-warning-title">Your spending is running low.</h2><p className="budget-warning-copy">This expense will use up your remaining balance. A little breathing room now can make the rest of the month easier.</p><div className="budget-meter"><span /><span /><span /><span /><span /></div><p className="budget-warning-tip"><strong>Suggestion:</strong> review flexible categories like Food, Entertainment, Shopping, and Travel before adding more expenses.</p><div className="warning-actions"><button className="secondary-button" type="button" onClick={onCancel}>Go back</button><button className="primary-button warning-continue" type="button" onClick={onContinue}>Add anyway</button></div></div></div>; }

function MoneyMapPage() {
  const [summary, setSummary] = useState(null); const [breakdown, setBreakdown] = useState([]); const [error, setError] = useState('');
  useEffect(() => { Promise.all([apiRequest('/dashboard/summary'), apiRequest('/dashboard/category-breakdown')]).then(([summaryData, breakdownData]) => { setSummary(summaryData.summary); setBreakdown(breakdownData.breakdown); }).catch((requestError) => setError(requestError.message)); }, []);
  const total = breakdown.reduce((sum, item) => sum + item.amount, 0); const largest = breakdown[0]; const gradient = breakdown.length ? `conic-gradient(${breakdown.map((item, index) => `${mapColors[index % mapColors.length]} ${breakdown.slice(0, index).reduce((sum, part) => sum + part.percentage, 0)}% ${breakdown.slice(0, index + 1).reduce((sum, part) => sum + part.percentage, 0)}%`).join(', ')})` : '#e7e1d5';
  return <><PageHeader eyebrow="Follow the flow" title="Money Map" />{error && <p className="form-error">{error}</p>}<section className="map-hero"><div className="map-copy"><p className="eyebrow">Your financial picture</p><h2>Where is your money going?</h2><p>This view turns your expense categories into a simple picture of your habits.</p><div className="map-stats"><span><small>Total expenses</small><strong>{money(total)}</strong></span><span><small>Remaining</small><strong>{money(summary?.balance)}</strong></span></div></div><div className="donut" style={{ background: gradient }}><div><strong>{Math.round(summary?.income ? (total / summary.income) * 100 : 0)}%</strong><span>of income spent</span></div></div></section><div className="panel map-list"><div className="panel-heading"><div><p className="eyebrow">Category by category</p><h2>Spending map</h2></div>{largest && <span className="largest-badge">Largest: {largest.category}</span>}</div>{breakdown.length ? breakdown.map((item, index) => <div className="map-row" key={item.category}><span className="swatch" style={{ background: mapColors[index % mapColors.length] }} /><strong>{item.category}</strong><div className="map-row-track"><span style={{ width: `${item.percentage}%`, background: mapColors[index % mapColors.length] }} /></div><span>{item.percentage}%</span><strong>{money(item.amount)}</strong></div>) : <div className="empty-state">Add expenses to see your Money Map.</div>}</div></>;
}

function SavingMapPageWithGoal() { return <><SavingGoalPanel /><SavingMapPage /></>; }

function SavingGoalPanel() {
  const [salary, setSalary] = useState(0); const [totalExpenses, setTotalExpenses] = useState(0); const [savingGoal, setSavingGoal] = useState(() => localStorage.getItem('moneymap_saving_goal') || ''); const [error, setError] = useState('');
  useEffect(() => { Promise.all([apiRequest('/dashboard/summary'), apiRequest('/dashboard/category-breakdown')]).then(([summaryData, breakdownData]) => { setSalary(Number(summaryData.summary.income) || 0); setTotalExpenses(breakdownData.totalExpenses || 0); }).catch((requestError) => setError(requestError.message)); }, []);
  const goal = Number(savingGoal) || 0; const safeToSpend = Math.max(0, salary - goal); const goalAtRisk = goal > 0 && totalExpenses > safeToSpend; const shortfall = Math.max(0, totalExpenses - safeToSpend);
  function updateGoal(event) { const value = event.target.value; setSavingGoal(value); localStorage.setItem('moneymap_saving_goal', value); }
  return <section className="panel saving-goal-panel"><div className="saving-goal-heading"><div><p className="eyebrow">This month</p><h2>Set a saving goal</h2><p>Choose the amount you want to protect before spending the rest.</p></div><label>Monthly saving goal<input type="number" min="0" step="100" value={savingGoal} onChange={updateGoal} placeholder="10000" /></label></div>{error && <p className="form-error">{error}</p>}{goalAtRisk && <div className="saving-goal-alert" role="alert"><span>!</span><div><strong>You might miss your saving goal.</strong><p>Spending is {money(shortfall)} beyond your safe limit. Review flexible categories before adding more expenses.</p></div></div>}</section>;
}

function WishlistPlanner({ monthlySalary, savingsRate, userKey }) {
  const storageKey = `moneymap_wishlist_${encodeURIComponent(String(userKey).toLowerCase())}`;
  const [items, setItems] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [product, setProduct] = useState('');
  const [price, setPrice] = useState('');
  const [sharePercent, setSharePercent] = useState('5');
  const [error, setError] = useState('');
  const allocatedPercent = items.reduce((total, item) => total + Number(item.sharePercent || 0), 0);
  const availablePercent = Math.max(0, Number(savingsRate || 0) - allocatedPercent);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  function addWish(event) {
    event.preventDefault();
    setError('');
    const name = product.trim();
    const amount = Number(price);
    const percent = Number(sharePercent);
    if (!name) return setError('Enter the product you want to save for.');
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter a price greater than zero.');
    if (monthlySalary <= 0) return setError('Enter your monthly salary above to calculate a purchase plan.');
    if (!Number.isFinite(percent) || percent <= 0) return setError('Choose a salary percentage greater than zero.');
    if (allocatedPercent + percent > Number(savingsRate || 0)) return setError(`Your wishlist plans cannot use more than your ${savingsRate}% monthly savings target. ${availablePercent}% is available.`);

    setItems((current) => [...current, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, product: name, price: amount, sharePercent: percent }]);
    setProduct('');
    setPrice('');
  }

  function removeWish(id) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return <section className="panel wishlist-panel" aria-labelledby="wishlist-heading">
    <div className="panel-heading"><div><p className="eyebrow">Plan a purchase</p><h2 id="wishlist-heading">Your wishlist</h2></div><span className="roadmap-note">{money(monthlySalary * allocatedPercent / 100)} / month planned · {allocatedPercent}% of salary</span></div>
    <p className="wishlist-intro">Add something you want to buy. We’ll estimate a monthly contribution and timeline from your salary. Each plan assumes you keep income and prices steady.</p>
    <form className="wishlist-form" onSubmit={addWish}>
      <label>Product or item<input value={product} onChange={(event) => setProduct(event.target.value)} maxLength="80" placeholder="e.g. Headphones" /></label>
      <label>Price<input type="number" min="1" step="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="15000" /></label>
      <label>Salary share (%)<input type="number" min="1" max={Math.max(1, Number(savingsRate || 0))} step="1" value={sharePercent} onChange={(event) => setSharePercent(event.target.value)} /><span className="input-suffix">%</span></label>
      <button className="primary-button" type="submit">Add to wishlist</button>
    </form>
    <p className="wishlist-budget-note">Your wishlist plans share the {savingsRate}% savings target ({money(monthlySalary * Number(savingsRate || 0) / 100)} per month). {availablePercent}% remains available.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {items.length ? <div className="wishlist-list" aria-live="polite">{items.map((item) => {
      const monthlyContribution = monthlySalary * Number(item.sharePercent || 0) / 100;
      const months = monthlyContribution > 0 ? Math.ceil(Number(item.price) / monthlyContribution) : null;
      return <article className="wishlist-item" key={item.id}>
        <div className="wishlist-item-name"><strong>{item.product}</strong><span>Price {money(item.price)}</span></div>
        <div className="wishlist-plan"><span>Set aside each month</span><strong>{money(monthlyContribution)} <small>({item.sharePercent}% of salary)</small></strong></div>
        <div className="wishlist-timeline"><span>Estimated time</span><strong>{months ? `${months} ${months === 1 ? 'month' : 'months'}` : 'Enter salary'}</strong></div>
        <button className="wishlist-remove" type="button" onClick={() => removeWish(item.id)} aria-label={`Remove ${item.product} from wishlist`}>Remove</button>
      </article>;
    })}</div> : <p className="wishlist-empty">Your wishlist is empty. Add your first item to get a savings plan.</p>}
  </section>;
}

function SavingMapPage() {
  const { user } = useOutletContext();
  const [summary, setSummary] = useState(null); const [breakdown, setBreakdown] = useState([]); const [salary, setSalary] = useState(''); const [savingsRate, setSavingsRate] = useState('20'); const [error, setError] = useState('');
  useEffect(() => { Promise.all([apiRequest('/dashboard/summary'), apiRequest('/dashboard/category-breakdown')]).then(([summaryData, breakdownData]) => { setSummary(summaryData.summary); setSalary(String(summaryData.summary.income || '')); setBreakdown(breakdownData.breakdown); }).catch((requestError) => setError(requestError.message)); }, []);
  const monthlySalary = Number(salary) || 0; const targetSavings = monthlySalary * ((Number(savingsRate) || 0) / 100); const safeToSpend = Math.max(0, monthlySalary - targetSavings); const rows = breakdown.map((item) => { const isProtected = protectedBudgetCategories.includes(item.category); const recommended = isProtected ? item.amount : monthlySalary * (budgetRates[item.category] || 0.05); const overage = isProtected ? 0 : Math.max(0, item.amount - recommended); return { ...item, recommended, overage, isProtected, progress: recommended ? Math.min(100, (item.amount / recommended) * 100) : 0 }; }); const possibleSavings = rows.reduce((total, item) => total + item.overage, 0);
  return <><PageHeader eyebrow="A plan for your money" title="Saving Map" /><section className="panel planner-controls"><div><p className="eyebrow">Set your direction</p><h2>Build a monthly roadmap</h2><p className="planner-copy">Your transactions provide the reality. These two inputs shape a more useful plan.</p></div><div className="planner-inputs"><label>Monthly salary<input type="number" min="0" step="100" value={salary} onChange={(event) => setSalary(event.target.value)} placeholder="50000" /></label><label>Savings target<input type="number" min="0" max="90" step="1" value={savingsRate} onChange={(event) => setSavingsRate(event.target.value)} /><span className="input-suffix">%</span></label></div></section>{error && <p className="form-error">{error}</p>}<section className="roadmap-summary"><article><span>Save first</span><strong>{money(targetSavings)}</strong><small>{savingsRate}% of salary</small></article><article><span>Safe to spend</span><strong>{money(safeToSpend)}</strong><small>after planned savings</small></article><article><span>Possible extra savings</span><strong>{money(possibleSavings)}</strong><small>from flexible categories</small></article></section><WishlistPlanner monthlySalary={monthlySalary} savingsRate={savingsRate} userKey={user.id ?? user.username} /><div className="panel roadmap-panel"><div className="panel-heading"><div><p className="eyebrow">Actual versus recommended</p><h2>Category roadmap</h2></div><span className="roadmap-note">Rent is fixed. Health comes first. Miscellaneous stays low priority.</span></div>{rows.length ? rows.map((item) => <div className="roadmap-row" key={item.category}><div className="roadmap-label"><strong>{item.category}</strong><span>{money(item.amount)} spent</span></div><div className="roadmap-track"><span className={item.overage ? 'over-budget' : ''} style={{ width: `${item.progress}%` }} /></div><div className="roadmap-budget"><span>{item.isProtected ? 'Protected need' : `Target ${money(item.recommended)}`}</span>{item.category === 'Health' ? <strong className="protected-budget">Get well soon</strong> : item.category === 'Rent' ? <strong className="protected-budget">Fixed need</strong> : item.category === 'Miscellaneous' && item.overage ? <strong className="low-priority-budget">Save here first</strong> : item.overage ? <strong>Save {money(item.overage)}</strong> : <strong className="on-track">On track</strong>}</div></div>) : <div className="empty-state">Add expense transactions to generate your saving roadmap.</div>}</div></>;
}

function ProfilePage() { const { user } = useOutletContext(); const [clearing, setClearing] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState(''); async function clearHistory() { if (!window.confirm('Start fresh? This will permanently delete all of your transactions but keep your account.')) return; setClearing(true); setMessage(''); setError(''); try { const result = await apiRequest('/transactions', { method: 'DELETE' }); setMessage(`${result.deletedCount} transaction${result.deletedCount === 1 ? '' : 's'} cleared. You are ready for a fresh month.`); } catch (requestError) { setError(requestError.message); } finally { setClearing(false); } } return <><PageHeader eyebrow="Your account" title="Profile" /><div className="panel profile-panel"><div className="profile-avatar">{user.username[0].toUpperCase()}</div><div><p className="eyebrow">Signed in as</p><h2>{user.username}</h2><p>{user.email}</p></div></div><div className="panel reset-panel"><div><p className="eyebrow">New month</p><h2>Start fresh</h2><p>Clear your transaction history while keeping your account and login.</p></div><button className="danger-button" type="button" onClick={clearHistory} disabled={clearing}>{clearing ? 'Clearing...' : 'Clear transaction history'}</button>{message && <p className="success-message">{message}</p>}{error && <p className="form-error">{error}</p>}</div></>; }
export default App;
