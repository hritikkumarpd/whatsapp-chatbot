import { useState, useMemo, useRef, useEffect } from 'react';
import { api } from '../api.js';
import {
  IconWhatsApp,
  IconMessageSquare,
  IconBot,
  IconShield,
  IconUsers,
  IconDevice,
  IconActivity,
  IconDownload,
  IconTrash,
  IconSearch,
  IconBook,
  IconMoreVertical,
  IconGear,
  IconUser,
  IconGroup,
} from '../components/Icons.jsx';

export default function Dashboard({ state, logs, onClearLogs, cfg, onToggleAutoReply }) {
  const [busy, setBusy] = useState(false);
  const [connTab, setConnTab] = useState('qr'); // 'qr' | 'pairing' | 'linked'
  const [phoneInput, setPhoneInput] = useState('');
  const [pairingCode, setPairingCode] = useState(state.pairingCode || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'in' | 'out' | 'sys' | 'ai' | 'group'
  const [autoScroll, setAutoScroll] = useState(true);
  const timelineEndRef = useRef(null);

  const status = state.status || 'disconnected';
  const isConnected = status === 'connected';
  const stats = state.stats || { received: 0, replied: 0, rulesTriggered: 0, activeSessions: 0 };

  useEffect(() => {
    if (autoScroll) {
      timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  async function handleConnect() {
    setBusy(true);
    try {
      await api.connect();
    } catch (err) {
      alert(err.message || 'Connection failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Are you sure you want to disconnect WhatsApp? This will log out the active session.')) return;
    setBusy(true);
    try {
      await api.disconnect();
      if (onClearLogs) onClearLogs();
    } catch (err) {
      alert(err.message || 'Failed to disconnect');
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestPairing(e) {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    setBusy(true);
    try {
      const res = await api.requestPairingCode(phoneInput.trim());
      if (res.code) {
        setPairingCode(res.code);
      }
    } catch (err) {
      alert(err.message || 'Pairing code request failed');
    } finally {
      setBusy(false);
    }
  }

  function exportLogs() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `wabot-activity-${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterType === 'in' && log.direction !== 'in') return false;
      if (filterType === 'out' && log.direction !== 'out') return false;
      if (filterType === 'sys' && log.direction !== 'sys') return false;
      if (filterType === 'ai' && (log.direction !== 'out' || log.ruleMatched)) return false;
      if (filterType === 'group' && !log.isGroup) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const body = (log.body || '').toLowerCase();
        const sender = (log.sender || '').toLowerCase();
        const name = (log.pushName || '').toLowerCase();
        return body.includes(q) || sender.includes(q) || name.includes(q);
      }
      return true;
    });
  }, [logs, filterType, searchQuery]);

  return (
    <div>
      {/* Hero Welcome Header */}
      <div className="hero-header">
        <div>
          <h1 className="hero-title">Welcome back, Hritik! 👋</h1>
          <p className="hero-subtitle">
            Your local WhatsApp bot is ready. Monitor live activity and manage everything in one place.
          </p>
        </div>

        <div className="hero-actions">
          {/* Auto-Reply Master Switch */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#ffffff',
            border: '1px solid var(--border)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-card)',
          }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: cfg?.autoReply ? 'var(--emerald-text)' : '#64748b' }}>
                {cfg?.autoReply ? '● Auto-Reply ON' : '○ Auto-Reply OFF'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                {cfg?.autoReply ? 'Gemini AI answering' : 'Replies paused'}
              </div>
            </div>
            <label className="switch-pill">
              <input
                type="checkbox"
                checked={!!cfg?.autoReply}
                onChange={onToggleAutoReply}
              />
              <span className="switch-slider" />
            </label>
          </div>

          <div className="connection-status-pill">
            <span className={`status-dot-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
            <div>
              <div className="status-label-main">
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <div className="status-label-sub">
                {isConnected ? `Linked (+${state.phone || ''})` : 'WhatsApp not connected'}
              </div>
            </div>
          </div>

          {isConnected ? (
            <button className="btn-primary-wa danger" onClick={handleDisconnect} disabled={busy}>
              <IconWhatsApp size={18} />
              <span>{busy ? 'Disconnecting...' : 'Disconnect WhatsApp'}</span>
            </button>
          ) : (
            <button className="btn-primary-wa" onClick={handleConnect} disabled={busy}>
              <IconWhatsApp size={18} />
              <span>{busy ? 'Connecting...' : 'Connect WhatsApp'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="metrics-grid">
        {/* Inbound Messages */}
        <div className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-circle inbound">
              <IconMessageSquare size={20} />
            </div>
            <div>
              <div className="metric-label">Inbound Messages</div>
            </div>
          </div>
          <div className="metric-card-bottom">
            <div>
              <div className="metric-value">{stats.received || 0}</div>
              <div className="metric-trend">▲ 0% vs last 24h</div>
            </div>
            <svg className="metric-sparkline" viewBox="0 0 100 35" fill="none">
              <path d="M0 25 C20 28, 40 18, 60 22 C80 26, 90 12, 100 10" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* AI Dispatched */}
        <div className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-circle dispatched">
              <IconBot size={20} />
            </div>
            <div>
              <div className="metric-label">AI Dispatched</div>
            </div>
          </div>
          <div className="metric-card-bottom">
            <div>
              <div className="metric-value">{stats.replied || 0}</div>
              <div className="metric-trend">▲ 0% vs last 24h</div>
            </div>
            <svg className="metric-sparkline" viewBox="0 0 100 35" fill="none">
              <path d="M0 28 C25 28, 45 10, 65 18 C85 24, 90 12, 100 14" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Rules Triggered */}
        <div className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-circle rules">
              <IconShield size={20} />
            </div>
            <div>
              <div className="metric-label">Rules Triggered</div>
            </div>
          </div>
          <div className="metric-card-bottom">
            <div>
              <div className="metric-value">{stats.rulesTriggered || 0}</div>
              <div className="metric-trend">▲ 0% vs last 24h</div>
            </div>
            <svg className="metric-sparkline" viewBox="0 0 100 35" fill="none">
              <path d="M0 30 C30 30, 45 22, 60 25 C75 28, 85 14, 100 12" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-circle sessions">
              <IconUsers size={20} />
            </div>
            <div>
              <div className="metric-label">Active Sessions</div>
            </div>
          </div>
          <div className="metric-card-bottom">
            <div>
              <div className="metric-value">{stats.activeSessions || (isConnected ? 1 : 0)}</div>
              <div className="metric-trend" style={{ color: '#94a3b8' }}>
                {isConnected ? '1 device connected' : '0 devices connected'}
              </div>
            </div>
            <svg className="metric-sparkline" viewBox="0 0 100 35" fill="none">
              <path d="M0 26 C20 26, 35 15, 55 20 C75 25, 85 10, 100 15" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Split Grid: Device Connection + Live Activity Stream */}
      <div className="dashboard-split-grid">
        {/* Device Connection Card */}
        <div className="card-container">
          <div className="card-container-header">
            <div className="card-header-title">
              <IconDevice size={18} />
              <span>Device Connection</span>
            </div>
          </div>

          {/* Underline Tabs */}
          <div className="connection-underline-tabs">
            <button
              className={`conn-tab-btn ${connTab === 'qr' ? 'active' : ''}`}
              onClick={() => setConnTab('qr')}
            >
              QR Code
            </button>
            <button
              className={`conn-tab-btn ${connTab === 'pairing' ? 'active' : ''}`}
              onClick={() => setConnTab('pairing')}
            >
              Pairing Code
            </button>
            <button
              className={`conn-tab-btn ${connTab === 'linked' ? 'active' : ''}`}
              onClick={() => setConnTab('linked')}
            >
              Linked Devices
            </button>
          </div>

          {/* Tab Body */}
          {connTab === 'qr' && (
            <div>
              <div className="connection-dashed-box">
                {isConnected ? (
                  <div>
                    <div className="dashed-icon-center" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#d1fae5' }}>
                      <IconWhatsApp size={24} />
                    </div>
                    <div className="dashed-title">WhatsApp Session Linked</div>
                    <div className="dashed-sub">
                      Active session: <b>{state.profileName || 'Hritik Kumar'}</b> (+{state.phone}). The bot is actively responding to incoming messages.
                    </div>
                    <button className="btn-primary-wa danger" onClick={handleDisconnect} disabled={busy}>
                      Disconnect Session
                    </button>
                  </div>
                ) : status === 'qr' && state.qr ? (
                  <div>
                    <img
                      src={state.qr}
                      alt="WhatsApp QR Code"
                      style={{
                        width: 190,
                        height: 190,
                        background: '#ffffff',
                        padding: 8,
                        borderRadius: 12,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      }}
                    />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                      Scan with WhatsApp camera. Refreshes automatically.
                    </div>
                  </div>
                ) : status === 'connecting' ? (
                  <div>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    <div className="dashed-title">Initializing WhatsApp Baileys...</div>
                    <div className="dashed-sub">Generating cryptographic handshake keys.</div>
                  </div>
                ) : (
                  <div>
                    <div className="dashed-icon-center">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                        <rect x="14" y="14" width="7" height="7" rx="1.5" />
                      </svg>
                    </div>
                    <div className="dashed-title">WhatsApp session not initialized</div>
                    <div className="dashed-sub">
                      Click the button below to connect and display QR code.
                    </div>
                    <button className="btn-primary-wa" onClick={handleConnect} disabled={busy}>
                      <IconWhatsApp size={17} />
                      <span>{busy ? 'Starting...' : 'Connect WhatsApp'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* How to connect? Box */}
              <div className="how-to-connect-box">
                <div className="how-to-title">
                  <IconBook size={16} />
                  <span>How to connect?</span>
                </div>
                <ol className="how-to-list">
                  <li>1. Open WhatsApp on your phone</li>
                  <li>2. Go to Settings &gt; <b>Linked Devices</b></li>
                  <li>3. Tap <b>Link a Device</b> and scan the QR code</li>
                </ol>
              </div>
            </div>
          )}

          {connTab === 'pairing' && (
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                Enter your phone number with country code (e.g. 919876543210) to generate an 8-digit link code:
              </div>
              <form onSubmit={handleRequestPairing}>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. 919876543210"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  style={{ marginBottom: 12, fontFamily: 'var(--font-mono)' }}
                />
                <button className="btn-primary-wa" style={{ width: '100%' }} disabled={busy || !phoneInput.trim()}>
                  {busy ? 'Requesting...' : 'Request Pairing Code'}
                </button>
              </form>

              {(pairingCode || state.pairingCode) && (
                <div style={{ marginTop: 20, textAlign: 'center', background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Enter Code on WhatsApp:
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '4px', color: 'var(--emerald-text)', margin: '8px 0', fontFamily: 'var(--font-mono)' }}>
                    {pairingCode || state.pairingCode}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                    Linked Devices &gt; Link with phone number instead
                  </div>
                </div>
              )}
            </div>
          )}

          {connTab === 'linked' && (
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Linked Device Status</div>
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 12, padding: 14, fontSize: 12.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>Platform:</span>
                  <b>Baileys Multi-Device (Node.js)</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>Connection:</span>
                  <span style={{ color: isConnected ? '#059669' : '#dc2626', fontWeight: 600 }}>
                    {isConnected ? 'Active & Answering' : 'Disconnected'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Phone Number:</span>
                  <b>{state.phone ? `+${state.phone}` : 'None'}</b>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Activity Stream Card */}
        <div className="card-container">
          <div className="card-container-header">
            <div className="card-header-title">
              <IconActivity size={18} />
              <span>Live Activity Stream</span>
            </div>

            <div className="activity-controls">
              <div className="auto-scroll-row">
                <span>Auto Scroll</span>
                <label className="switch-pill">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              <button className="btn" onClick={exportLogs} title="Export activity logs">
                <IconDownload size={13} />
                <span>Export</span>
              </button>

              <button className="btn danger" onClick={onClearLogs} title="Clear stream logs">
                <IconTrash size={13} />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="stream-filter-bar">
            <div className="filter-pills-group">
              {[
                { id: 'all', label: 'All' },
                { id: 'in', label: 'Inbound' },
                { id: 'out', label: 'Outbound' },
                { id: 'sys', label: 'System' },
                { id: 'ai', label: 'AI' },
                { id: 'group', label: 'Groups' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  className={`filter-pill ${filterType === pill.id ? 'active' : ''}`}
                  onClick={() => setFilterType(pill.id)}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="stream-search-input">
              <IconSearch size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Filter by sender, message text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Timeline List */}
          <div className="timeline-stream-container">
            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <p style={{ fontSize: 13.5, fontWeight: 500 }}>No activity recorded yet</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Live incoming messages, AI dispatches and events stream here.</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isSys = log.direction === 'sys';
                const isIn = log.direction === 'in';
                const isOut = log.direction === 'out';
                const isGroup = !!log.isGroup;

                const nodeType = isSys ? 'system' : isGroup ? 'group' : isIn ? 'in' : 'out';

                const timeStr = log.time
                  ? new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                  : '--:--:--';

                return (
                  <div key={log.id} className="timeline-entry">
                    <span className={`timeline-node ${nodeType}`} />
                    <span className="timeline-time">{timeStr}</span>

                    <div className={`timeline-icon-box ${nodeType}`}>
                      {isSys && <IconGear size={14} />}
                      {!isSys && isGroup && <IconGroup size={14} />}
                      {!isSys && !isGroup && isIn && <IconUser size={14} />}
                      {!isSys && !isGroup && isOut && <IconBot size={14} />}
                    </div>

                    <span className={`timeline-tag-badge ${nodeType}`}>
                      {isSys ? 'SYSTEM' : isGroup ? 'GROUP' : isIn ? 'INBOUND' : 'AI BOT'}
                    </span>

                    <div className="timeline-body-box">
                      <div className="timeline-title-row">
                        <span className="timeline-sender-name">
                          {log.pushName ? `${log.pushName} (+${log.sender})` : log.sender === 'system' ? '+system' : `+${log.sender}`}
                        </span>
                      </div>
                      <div className="timeline-message-text">{log.body}</div>
                    </div>

                    <button className="timeline-menu-btn" title="Options">
                      <IconMoreVertical size={16} />
                    </button>
                  </div>
                );
              })
            )}
            <div ref={timelineEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
