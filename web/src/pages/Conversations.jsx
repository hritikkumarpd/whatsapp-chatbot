import { useMemo, useState } from 'react';
import { api } from '../api.js';
import {
  IconUsers,
  IconUser,
  IconSearch,
  IconTrash,
  IconRefresh,
  IconClock,
  IconMessageIncoming,
  IconSend,
} from '../components/Icons.jsx';

export default function Conversations({ logs, onShowToast }) {
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  // Group logs by sender/chat
  const contacts = useMemo(() => {
    const map = new Map();
    for (const log of logs) {
      if (log.direction === 'sys') continue;
      const key = log.sender || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          sender: key,
          pushName: log.pushName || '',
          isGroup: log.isGroup,
          firstSeen: log.time,
          lastSeen: log.time,
          lastMessage: log.body,
          totalIncoming: 0,
          totalOutgoing: 0,
        });
      }
      const item = map.get(key);
      if (log.pushName && !item.pushName) item.pushName = log.pushName;
      if (log.direction === 'in') item.totalIncoming++;
      if (log.direction === 'out') item.totalOutgoing++;
      item.lastSeen = log.time;
      item.lastMessage = log.body;
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastSeen) - new Date(a.lastSeen)
    );
  }, [logs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.sender.toLowerCase().includes(q) ||
        (c.pushName && c.pushName.toLowerCase().includes(q)) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  }, [contacts, search]);

  async function handleClearContactMemory(sender) {
    const jid = sender.includes('@') ? sender : `${sender}@s.whatsapp.net`;
    setBusy(true);
    try {
      await api.clearHistory(jid);
      if (onShowToast) onShowToast(`Context memory purged for +${sender}`, 'success');
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to clear memory', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleClearAll() {
    if (!window.confirm('Purge multi-turn context memory for all active contacts?')) return;
    setBusy(true);
    try {
      await api.clearHistory();
      if (onShowToast) onShowToast('All conversation memories purged', 'success');
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to purge memories', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Session Directory & Context Explorer</h2>
          <p>Active peer sessions, recorded interactions, and Gemini multi-turn memory buffers</p>
        </div>
        <button
          className="btn danger btn-sm"
          onClick={handleClearAll}
          disabled={busy || contacts.length === 0}
          title="Purge all active memory buffers"
        >
          <IconTrash size={14} />
          <span>Purge All Context</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <IconUsers size={16} />
            <span>Active Sessions ({filtered.length})</span>
          </div>
          <div style={{ position: 'relative', width: 240 }}>
            <input
              type="text"
              className="input"
              style={{ paddingLeft: 30, paddingRight: 10, fontSize: 12.5 }}
              placeholder="Filter by name, number or body..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div
              style={{
                position: 'absolute',
                left: 9,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconSearch size={14} />
            </div>
          </div>
        </div>

        <div className="card-body">
          {filtered.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--text-tertiary)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border)',
                  margin: '0 auto 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-tertiary)',
                }}
              >
                <IconUsers size={22} />
              </div>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
                No active session records
              </p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                When incoming WhatsApp messages are received, peer sessions will populate here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((c) => (
                <div
                  key={c.sender}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--radius-md)',
                        background: c.isGroup
                          ? 'var(--blue-muted)'
                          : 'var(--accent-muted)',
                        border: `1px solid ${c.isGroup ? 'var(--blue-border)' : 'var(--accent-border)'}`,
                        color: c.isGroup ? 'var(--blue)' : 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {c.isGroup ? <IconUsers size={17} /> : <IconUser size={17} />}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {c.pushName ? c.pushName : `+${c.sender}`}
                        </span>
                        {c.pushName && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                            (+{c.sender})
                          </span>
                        )}
                        {c.isGroup && (
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 10,
                              fontWeight: 600,
                              background: 'var(--blue-muted)',
                              color: 'var(--blue)',
                              border: '1px solid var(--blue-border)',
                              padding: '1px 5px',
                              borderRadius: 4,
                            }}
                          >
                            GROUP
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 520,
                          marginTop: 2,
                        }}
                      >
                        {c.lastMessage}
                      </div>

                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <IconMessageIncoming size={12} />
                          <span>In: {c.totalIncoming}</span>
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <IconSend size={12} />
                          <span>Out: {c.totalOutgoing}</span>
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <IconClock size={12} />
                          <span>{new Date(c.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      className="btn-sm btn"
                      onClick={() => handleClearContactMemory(c.sender)}
                      title="Purge context memory for this contact"
                      disabled={busy}
                    >
                      <IconRefresh size={13} />
                      <span>Reset Context</span>
                    </button>
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
