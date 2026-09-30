import { useMemo } from 'react';
import {
  IconAnalytics,
  IconMessageSquare,
  IconBot,
  IconShield,
  IconUsers,
  IconMessageIncoming,
  IconSend,
  IconClock,
  IconContacts,
} from '../components/Icons.jsx';

export default function AnalyticsPage({ state, logs }) {
  const stats = state?.stats || { received: 0, replied: 0, rulesTriggered: 0, activeSessions: 0 };
  const entries = Array.isArray(logs) ? logs : [];

  const { inbound, outbound, replyRate, topContacts, hourly, maxHour } = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    const byContact = new Map();
    const hours = new Array(24).fill(0);

    for (const log of entries) {
      if (log.direction === 'in') {
        inbound++;
        const key = log.sender || 'unknown';
        const existing = byContact.get(key) || { key, name: log.pushName || log.sender || 'Unknown', count: 0 };
        existing.count++;
        if (log.pushName) existing.name = log.pushName;
        byContact.set(key, existing);
      } else if (log.direction === 'out') {
        outbound++;
      }

      const t = new Date(log.time);
      if (!Number.isNaN(t.getTime())) hours[t.getHours()]++;
    }

    const topContacts = [...byContact.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    const total = inbound + outbound;

    return {
      inbound,
      outbound,
      replyRate: inbound > 0 ? Math.round((outbound / inbound) * 100) : 0,
      topContacts,
      hourly: hours,
      maxHour: Math.max(1, ...hours),
    };
  }, [entries]);

  const totalMessages = inbound + outbound;
  const maxContact = topContacts.length > 0 ? topContacts[0].count : 1;

  const metrics = [
    {
      cls: 'inbound',
      Icon: IconMessageSquare,
      label: 'Total Messages',
      value: totalMessages,
      trend: `${inbound} in · ${outbound} out`,
    },
    {
      cls: 'dispatched',
      Icon: IconBot,
      label: 'AI Replies',
      value: stats.replied || 0,
      trend: `${replyRate}% reply rate`,
    },
    {
      cls: 'rules',
      Icon: IconShield,
      label: 'Rules Triggered',
      value: stats.rulesTriggered || 0,
      trend: 'Instant automations',
    },
    {
      cls: 'sessions',
      Icon: IconUsers,
      label: 'Active Sessions',
      value: stats.activeSessions || 0,
      trend: state?.status === 'connected' ? 'Live now' : 'Idle',
    },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="hero-header">
        <div>
          <h1 className="hero-title">Analytics & Insights</h1>
          <p className="hero-subtitle">
            Real message activity computed from {totalMessages.toLocaleString()} logged event
            {totalMessages === 1 ? '' : 's'}
          </p>
        </div>
        <div className="hero-actions">
          <IconAnalytics size={22} />
        </div>
      </div>

      <div className="metrics-grid">
        {metrics.map((m) => (
          <div className="metric-card" key={m.label}>
            <div className="metric-card-top">
              <div className={`metric-icon-circle ${m.cls}`}>
                <m.Icon size={20} />
              </div>
              <div>
                <div className="metric-label">{m.label}</div>
              </div>
            </div>
            <div className="metric-card-bottom">
              <div>
                <div className="metric-value">{(m.value || 0).toLocaleString()}</div>
                <div className="metric-trend">{m.trend}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        <div className="card-container">
          <div className="card-container-header">
            <div className="card-header-title">
              <IconMessageIncoming size={18} />
              <span>Inbound vs Outbound</span>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {totalMessages === 0 ? (
              <EmptyState label="No messages logged yet" />
            ) : (
              <>
                <FlowRow
                  Icon={IconMessageIncoming}
                  color="var(--emerald)"
                  label="Inbound"
                  count={inbound}
                  pct={Math.round((inbound / totalMessages) * 100)}
                />
                <div style={{ height: 14 }} />
                <FlowRow
                  Icon={IconSend}
                  color="var(--blue)"
                  label="Outbound"
                  count={outbound}
                  pct={Math.round((outbound / totalMessages) * 100)}
                />
              </>
            )}
          </div>
        </div>

        <div className="card-container">
          <div className="card-container-header">
            <div className="card-header-title">
              <IconContacts size={18} />
              <span>Top Contacts</span>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {topContacts.length === 0 ? (
              <EmptyState label="No inbound contacts yet" />
            ) : (
              topContacts.map((c, i) => (
                <div key={c.key} style={{ marginBottom: i === topContacts.length - 1 ? 0 : 14 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      marginBottom: 6,
                      color: 'var(--text-main)',
                    }}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '75%',
                      }}
                    >
                      {c.name}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{c.count}</span>
                  </div>
                  <Bar pct={Math.round((c.count / maxContact) * 100)} color="var(--purple)" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card-container" style={{ marginTop: 16 }}>
        <div className="card-container-header">
          <div className="card-header-title">
            <IconClock size={18} />
            <span>Messages by Hour</span>
          </div>
        </div>
        <div style={{ padding: '24px 20px' }}>
          {totalMessages === 0 ? (
            <EmptyState label="No activity to chart yet" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160 }}>
              {hourly.map((count, hour) => (
                <div
                  key={hour}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                  title={`${String(hour).padStart(2, '0')}:00 — ${count} message${count === 1 ? '' : 's'}`}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(4, Math.round((count / maxHour) * 130))}px`,
                      background: count > 0 ? 'var(--emerald)' : 'var(--bg-subtle)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.2s ease',
                    }}
                  />
                  {hour % 3 === 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {String(hour).padStart(2, '0')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Bar({ pct, color }) {
  return (
    <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );
}

function FlowRow({ Icon, color, label, count, pct }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          marginBottom: 6,
          color: 'var(--text-main)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color }}>
          <Icon size={16} />
          <span style={{ color: 'var(--text-main)' }}>{label}</span>
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          {count} ({pct}%)
        </span>
      </div>
      <Bar pct={pct} color={color} />
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 13 }}>{label}</div>
  );
}
