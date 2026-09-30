import { useState, useMemo } from 'react';
import { IconSearch, IconUser, IconMessageSquare } from '../components/Icons.jsx';

export default function ContactsPage({ logs, onSelectChat }) {
  const [search, setSearch] = useState('');

  const contacts = useMemo(() => {
    const map = new Map();
    for (const log of logs) {
      if (log.direction === 'sys' || !log.sender) continue;
      const key = log.sender;
      if (!map.has(key)) {
        map.set(key, {
          phone: key,
          name: log.pushName || `+${key}`,
          lastSeen: log.time,
          lastMessage: log.body,
          count: 0,
        });
      }
      const item = map.get(key);
      if (log.pushName) item.name = log.pushName;
      item.count++;
      item.lastSeen = log.time;
      item.lastMessage = log.body;
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
  }, [logs]);

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const totalMessages = contacts.reduce((sum, c) => sum + c.count, 0);

  return (
    <div>
      <div className="hero-header">
        <div>
          <h1 className="hero-title">Contacts Directory</h1>
          <p className="hero-subtitle">
            All contacts who have exchanged messages with your WhatsApp bot.
          </p>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{contacts.length}</div>
          <div className="metric-label">Total Contacts</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{totalMessages}</div>
          <div className="metric-label">Messages Exchanged</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{filtered.length}</div>
          <div className="metric-label">Matching Search</div>
        </div>
      </div>

      <div className="card-container">
        <div className="card-container-header">
          <div className="card-header-title">
            <IconUser size={18} />
            <span>Identified Contacts ({filtered.length})</span>
          </div>
          <div className="stream-search-input" style={{ width: 260 }}>
            <IconSearch size={14} color="var(--text-light)" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ padding: 16 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-light)' }}>
              <IconUser size={32} />
              <p style={{ marginTop: 8, fontSize: 13 }}>No active contacts recorded yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {filtered.map((c) => (
                <div
                  key={c.phone}
                  onClick={onSelectChat ? () => onSelectChat(c.phone) : undefined}
                  style={{
                    padding: 14,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: onSelectChat ? 'pointer' : 'default',
                  }}
                >
                  <div className="user-avatar-circle">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-main)' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>+{c.phone}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                      {c.lastMessage}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                    <IconMessageSquare size={13} />
                    <span>{c.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
