import { useState, useEffect } from 'react';
import { socket, api } from './api.js';
import Dashboard from './pages/Dashboard.jsx';
import BotConfig from './pages/BotConfig.jsx';
import Playground from './pages/Playground.jsx';
import RulesAndFilters from './pages/RulesAndFilters.jsx';
import Conversations from './pages/Conversations.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import GroupManagementPage from './pages/GroupManagementPage.jsx';
import TemplatesPage from './pages/TemplatesPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import {
  IconWhatsApp,
  IconDashboard,
  IconBot,
  IconPlayground,
  IconShield,
  IconUsers,
  IconContacts,
  IconGroup,
  IconTemplate,
  IconCalendar,
  IconAnalytics,
  IconDevice,
  IconSettings,
  IconGitHub,
  IconSearch,
  IconMoon,
  IconBell,
  IconChevronDown,
  IconExternalLink,
} from './components/Icons.jsx';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [state, setState] = useState({
    status: 'disconnected',
    qr: null,
    phone: null,
    pairingCode: null,
    stats: { received: 0, replied: 0, rulesTriggered: 0, activeSessions: 0 },
  });
  const [logs, setLogs] = useState([]);
  const [cfg, setCfg] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('wabot_theme') === 'dark');

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  }

  function handleAuthSubmit() {
    if (!tokenInput.trim()) return;
    api.setToken(tokenInput.trim());
    setShowAuthModal(false);
    showToast('Token saved! Reconnecting...', 'success');
    api.getState().then((s) => {
      setState(s);
      if (Array.isArray(s.logs)) setLogs(s.logs);
    }).catch(() => {});
    api.getConfig().then((c) => setCfg(c)).catch(() => {});
  }

  useEffect(() => {
    const unsubAuth = api.onAuthRequired(() => {
      setShowAuthModal(true);
    });

    api.getState().then((s) => {
      setState(s);
      if (Array.isArray(s.logs)) setLogs(s.logs);
    }).catch(() => {});

    api.getConfig().then((c) => {
      setCfg(c);
    }).catch(() => {});

    const onState = (s) => setState(s);
    const onLog = (newLog) => setLogs((prev) => [...prev.slice(-300), newLog]);
    const onStats = (st) => setState((prev) => ({ ...prev, stats: st }));
    const onLogsCleared = () => setLogs([]);

    socket.on('state', onState);
    socket.on('log', onLog);
    socket.on('stats', onStats);
    socket.on('logs-cleared', onLogsCleared);

    return () => {
      unsubAuth();
      socket.off('state', onState);
      socket.off('log', onLog);
      socket.off('stats', onStats);
      socket.off('logs-cleared', onLogsCleared);
    };
  }, []);

  async function handleSaveConfig(patch) {
    const res = await api.saveConfig(patch);
    setCfg((prev) => ({ ...prev, ...patch }));
    return res;
  }

  async function toggleMasterAutoReply() {
    if (!cfg) return;
    const updated = !cfg.autoReply;
    try {
      await api.saveConfig({ autoReply: updated });
      setCfg((prev) => ({ ...prev, autoReply: updated }));
      showToast(`Auto-Reply turned ${updated ? 'ON' : 'OFF'}`, updated ? 'success' : 'error');
    } catch {
      showToast('Failed to toggle auto-reply', 'error');
    }
  }

  async function handleClearLogs() {
    if (!window.confirm('Clear all activity logs?')) return;
    try {
      await api.clearLogs();
      setLogs([]);
      showToast('Activity logs cleared', 'success');
    } catch {
      showToast('Failed to clear logs', 'error');
    }
  }

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('wabot_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const uniqueContactsCount = new Set(
    logs.filter((l) => l.sender && l.sender !== 'system').map((l) => l.sender)
  ).size;

  const isLinked = state.status === 'connected';
  const profileName = state.profileName || (state.phone ? `+${state.phone}` : 'Not linked');
  const profileInitials = (() => {
    const nameToUse = state.profileName || null;
    if (nameToUse) {
      const parts = nameToUse.trim().split(/\s+/).filter(Boolean);
      const letters = parts.slice(0, 2).map((p) => p[0]).join('');
      return (letters || nameToUse[0] || '?').toUpperCase();
    }
    if (state.phone) return state.phone.slice(-2);
    return '—';
  })();
  const profileRole = isLinked ? (state.phone ? `+${state.phone}` : 'WhatsApp Connected') : 'Not Connected';

  return (
    <div className="app-shell">
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="brand-section">
          <div className="brand-title">
            <IconWhatsApp size={24} />
            <span>WaBot</span>
          </div>
          <span className="brand-version-pill">v2.4.0</span>
        </div>

        {/* Nav Links */}
        <nav className="sidebar-nav">
          <div
            className={`nav-item ${tab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setTab('dashboard'); setSidebarOpen(false); }}
          >
            <IconDashboard size={18} />
            <span>Dashboard</span>
            <span className="nav-badge">{logs.length > 0 ? logs.length : 2}</span>
          </div>

          <div
            className={`nav-item ${tab === 'config' ? 'active' : ''}`}
            onClick={() => { setTab('config'); setSidebarOpen(false); }}
          >
            <IconBot size={18} />
            <span>AI Personality</span>
          </div>

          <div
            className={`nav-item ${tab === 'playground' ? 'active' : ''}`}
            onClick={() => { setTab('playground'); setSidebarOpen(false); }}
          >
            <IconPlayground size={18} />
            <span>AI Sandbox</span>
            <span className="nav-badge test">TEST</span>
          </div>

          <div
            className={`nav-item ${tab === 'rules' ? 'active' : ''}`}
            onClick={() => { setTab('rules'); setSidebarOpen(false); }}
          >
            <IconShield size={18} />
            <span>Rules & Filters</span>
          </div>

          <div
            className={`nav-item ${tab === 'conversations' ? 'active' : ''}`}
            onClick={() => { setTab('conversations'); setSidebarOpen(false); }}
          >
            <IconUsers size={18} />
            <span>Conversations</span>
            <span className="nav-badge">{uniqueContactsCount}</span>
          </div>

          <div
            className={`nav-item ${tab === 'contacts' ? 'active' : ''}`}
            onClick={() => { setTab('contacts'); setSidebarOpen(false); }}
          >
            <IconContacts size={18} />
            <span>Contacts</span>
          </div>

          <div
            className={`nav-item ${tab === 'groups' ? 'active' : ''}`}
            onClick={() => { setTab('groups'); setSidebarOpen(false); }}
          >
            <IconGroup size={18} />
            <span>Group Management</span>
          </div>

          <div
            className={`nav-item ${tab === 'templates' ? 'active' : ''}`}
            onClick={() => { setTab('templates'); setSidebarOpen(false); }}
          >
            <IconTemplate size={18} />
            <span>Templates</span>
          </div>

          <div
            className={`nav-item ${tab === 'schedule' ? 'active' : ''}`}
            onClick={() => { setTab('schedule'); setSidebarOpen(false); }}
          >
            <IconCalendar size={18} />
            <span>Schedule</span>
          </div>

          <div
            className={`nav-item ${tab === 'analytics' ? 'active' : ''}`}
            onClick={() => { setTab('analytics'); setSidebarOpen(false); }}
          >
            <IconAnalytics size={18} />
            <span>Analytics</span>
          </div>

          <div
            className={`nav-item ${tab === 'device' ? 'active' : ''}`}
            onClick={() => { setTab('device'); setSidebarOpen(false); }}
          >
            <IconDevice size={18} />
            <span>Device & QR</span>
          </div>

          <div
            className={`nav-item ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => { setTab('settings'); setSidebarOpen(false); }}
          >
            <IconSettings size={18} />
            <span>Settings</span>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <a
            href="https://github.com/hritikkumarpd/whatsapp-chatbot"
            target="_blank"
            rel="noreferrer"
            className="opensource-card"
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="opensource-title">
                <IconGitHub size={17} />
                <span>Open Source</span>
              </div>
              <div className="opensource-sub">Star on GitHub</div>
            </div>
            <IconExternalLink size={13} color="#94a3b8" />
          </a>

          <div className="local-mode-indicator">
            <span className="local-dot" />
            <div>
              {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'Local Mode' : 'Remote Mode'} <br />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#64748b' }}>
                {window.location.origin}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="app-main">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <div className="global-search-bar">
              <IconSearch size={15} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search messages, contacts, or sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="kbd-shortcut">Ctrl K</span>
            </div>
          </div>

          <div className="topbar-right">
            {/* Topbar Auto-Reply quick toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f8fafc',
              border: '1px solid var(--border)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontWeight: 600,
            }}>
              <span style={{ color: cfg?.autoReply ? 'var(--emerald-text)' : '#64748b' }}>
                {cfg?.autoReply ? 'Auto-Reply ON' : 'Auto-Reply OFF'}
              </span>
              <label className="switch-pill">
                <input
                  type="checkbox"
                  checked={!!cfg?.autoReply}
                  onChange={toggleMasterAutoReply}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <button className="icon-action-btn" title="Toggle theme" onClick={() => setDarkMode((v) => !v)}>
              <IconMoon size={18} />
            </button>

            <button className="icon-action-btn" title="Notifications">
              <IconBell size={18} />
              <span className="notification-dot" />
            </button>

            <div className="user-profile-widget">
              <div className="user-avatar-circle">{profileInitials}</div>
              <div>
                <div className="user-meta-name">{profileName}</div>
                <div className="user-meta-role">{profileRole}</div>
              </div>
              <IconChevronDown size={14} color="#94a3b8" />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-area">
          {tab === 'dashboard' && (
            <Dashboard
              state={state}
              logs={logs}
              onClearLogs={handleClearLogs}
              cfg={cfg}
              onToggleAutoReply={toggleMasterAutoReply}
            />
          )}

          {tab === 'config' && (
            <BotConfig onShowToast={showToast} />
          )}

          {tab === 'playground' && (
            <Playground onShowToast={showToast} />
          )}

          {tab === 'rules' && (
            <RulesAndFilters onShowToast={showToast} />
          )}

          {tab === 'conversations' && (
            <Conversations logs={logs} onShowToast={showToast} />
          )}

          {tab === 'contacts' && (
            <ContactsPage logs={logs} />
          )}

          {tab === 'groups' && (
            <GroupManagementPage
              cfg={cfg}
              onSaveConfig={handleSaveConfig}
              onShowToast={showToast}
            />
          )}

          {tab === 'templates' && (
            <TemplatesPage onShowToast={showToast} />
          )}

          {tab === 'schedule' && (
            <div style={{ maxWidth: 860 }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Automated Schedule & Working Hours</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Configure time-based response rules and planned broadcasts</p>
              </div>
              <div className="card-container" style={{ padding: 24 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Working Hours Rule</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Auto-respond with away messages during off-hours:
                </p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input type="time" defaultValue="09:00" className="input" style={{ width: 130 }} />
                  <span>to</span>
                  <input type="time" defaultValue="20:00" className="input" style={{ width: 130 }} />
                  <button className="btn-primary-wa" onClick={() => showToast('Schedule saved', 'success')}>
                    Save Hours
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'analytics' && (
            <AnalyticsPage state={state} logs={logs} />
          )}

          {tab === 'device' && (
            <Dashboard
              state={state}
              logs={logs}
              onClearLogs={handleClearLogs}
            />
          )}

          {tab === 'settings' && (
            <SettingsPage
              state={state}
              onShowToast={showToast}
              onClearLogs={handleClearLogs}
            />
          )}
        </main>
      </div>

      {showAuthModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #111b21)',
              border: '1px solid var(--border, #2a3942)',
              borderRadius: 16,
              padding: 28,
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(37, 211, 102, 0.15)',
                  color: '#25d366',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                🔒
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-main, #e9edef)' }}>
                  Access Token Required
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted, #8696a0)', margin: 0 }}>
                  Remote Server / Custom Domain Security
                </p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted, #8696a0)', lineHeight: 1.5, marginBottom: 16 }}>
              This WaBot Pro instance is running remotely or on a custom domain. Please enter your secret Access Token to authenticate.
            </p>

            <input
              type="password"
              className="input"
              placeholder="Paste authToken here..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAuthSubmit();
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                marginBottom: 16,
                background: 'var(--bg-subtle, #202c33)',
                border: '1px solid var(--border, #2a3942)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
              }}
              autoFocus
            />

            <button
              className="btn-primary-wa"
              onClick={handleAuthSubmit}
              disabled={!tokenInput.trim()}
              style={{
                width: '100%',
                padding: '11px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 8,
                background: '#00a884',
                color: '#111b21',
                border: 'none',
                cursor: tokenInput.trim() ? 'pointer' : 'not-allowed',
                opacity: tokenInput.trim() ? 1 : 0.6,
              }}
            >
              Authenticate & Connect
            </button>

            <div
              style={{
                marginTop: 16,
                padding: 10,
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.03)',
                fontSize: 12,
                color: 'var(--text-muted, #8696a0)',
                lineHeight: 1.4,
              }}
            >
              💡 <b>Where is my token?</b> Check <code>server/config.json</code> under <code>authToken</code>, or run <code>node cli.js status</code> on your server.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
