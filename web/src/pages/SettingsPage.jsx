import { useState } from 'react';
import {
  IconSettings,
  IconDevice,
  IconPhone,
  IconActivity,
  IconDownload,
  IconTrash,
  IconShield,
} from '../components/Icons.jsx';
import { api } from '../api.js';

export default function SettingsPage({ state, onShowToast, onClearLogs }) {
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);

  const status = state?.status || 'disconnected';
  const isConnected = status === 'connected';
  const phone = state?.phone || '';
  const stats = state?.stats || {};

  async function handleClearLogs() {
    if (!window.confirm('Clear all activity logs? This removes the local message log history.')) return;
    setClearing(true);
    try {
      await api.clearLogs();
      if (onClearLogs) onClearLogs();
      if (onShowToast) onShowToast('Activity logs cleared', 'success');
    } catch (err) {
      if (onShowToast) onShowToast(err?.message || 'Failed to clear logs', 'error');
    } finally {
      setClearing(false);
    }
  }

  function handleExport() {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        status,
        phone,
        stats,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (onShowToast) onShowToast('Settings exported', 'success');
    } catch (err) {
      if (onShowToast) onShowToast(err?.message || 'Export failed', 'error');
    }
  }

  async function handleWipe() {
    if (!window.confirm('Wipe all credentials and conversation memories? This will unlink WhatsApp and clear session keys completely.')) return;
    setBusy(true);
    try {
      await api.disconnect();
      if (onClearLogs) onClearLogs();
      if (onShowToast) onShowToast('All data and session keys wiped successfully', 'success');
    } catch (err) {
      if (onShowToast) onShowToast(err?.message || 'Failed to wipe data', 'error');
    } finally {
      setBusy(false);
    }
  }

  const infoTileStyle = {
    background: 'var(--bg-subtle)',
    padding: 14,
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  };
  const infoLabelStyle = { color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 };
  const infoValueStyle = { fontWeight: 600, fontSize: 14, color: 'var(--text-main)' };

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="hero-header">
        <div>
          <h1 className="hero-title">Settings</h1>
          <p className="hero-subtitle">
            Review your connection, manage local data, and perform advanced maintenance.
          </p>
        </div>
      </div>

      {/* Connection info */}
      <div className="card-container" style={{ marginBottom: 20 }}>
        <div className="card-container-header">
          <div className="card-header-title">
            <IconDevice size={18} />
            <span>Connection</span>
          </div>
          <div className="local-mode-indicator">
            <span className="local-dot" />
            <span>Local</span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          <div style={infoTileStyle}>
            <div style={infoLabelStyle}>Current status</div>
            <div style={{ ...infoValueStyle, color: isConnected ? 'var(--emerald)' : 'var(--rose-text)' }}>
              {isConnected ? 'Connected' : status === 'connecting' ? 'Connecting…' : 'Disconnected'}
            </div>
          </div>
          <div style={infoTileStyle}>
            <div style={infoLabelStyle}>Linked phone</div>
            <div style={{ ...infoValueStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconPhone size={15} />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{phone ? `+${phone}` : 'Not linked'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data management */}
      <div className="card-container" style={{ marginBottom: 20 }}>
        <div className="card-container-header">
          <div className="card-header-title">
            <IconActivity size={18} />
            <span>Data Management</span>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Export a snapshot of your current configuration, or clear the local activity log history.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button className="btn" onClick={handleExport}>
            <IconDownload size={15} />
            <span>Export settings</span>
          </button>
          <button className="btn danger" onClick={handleClearLogs} disabled={clearing}>
            <IconTrash size={15} />
            <span>{clearing ? 'Clearing…' : 'Clear activity logs'}</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div
        className="card-container"
        style={{ borderLeft: '3px solid var(--rose)', background: 'var(--bg-subtle)' }}
      >
        <div className="card-container-header">
          <div className="card-header-title" style={{ color: 'var(--rose-text)' }}>
            <IconShield size={18} />
            <span>Danger Zone</span>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          This permanently deletes the local <code>server/auth/</code> session keys, clears all memory
          buffers, and wipes live message logs. WhatsApp will be unlinked and you must re-pair the device.
        </p>

        <button className="btn danger" onClick={handleWipe} disabled={busy}>
          <IconTrash size={15} />
          <span>{busy ? 'Wiping…' : 'Wipe Session & Data'}</span>
        </button>
      </div>
    </div>
  );
}
