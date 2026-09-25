import { useEffect, useState } from 'react';
import { IconGroup, IconCheck } from '../components/Icons.jsx';

export default function GroupManagementPage({ cfg, onSaveConfig, onShowToast }) {
  const [replyInGroups, setReplyInGroups] = useState(cfg?.replyInGroups ?? true);
  const [onlyWhenMentioned, setOnlyWhenMentioned] = useState(cfg?.groupOnlyWhenMentioned ?? false);
  const [busy, setBusy] = useState(false);

  // cfg loads asynchronously in App — sync the toggles once it arrives so the
  // UI reflects the saved config instead of the initial defaults.
  useEffect(() => {
    if (!cfg) return;
    setReplyInGroups(cfg.replyInGroups ?? true);
    setOnlyWhenMentioned(cfg.groupOnlyWhenMentioned ?? false);
  }, [cfg]);

  async function handleSave() {
    setBusy(true);
    try {
      await onSaveConfig({
        replyInGroups,
        groupOnlyWhenMentioned: onlyWhenMentioned,
      });
      if (onShowToast) onShowToast('Group preferences updated', 'success');
    } catch {
      if (onShowToast) onShowToast('Failed to update group settings', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconGroup size={22} />
          <span>Group Management & Auto-Reply</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Configure automated AI responses for WhatsApp groups</p>
      </div>

      <div className="card-container" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 18, borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Enable Auto-Reply in Groups</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Allow Gemini to answer messages in WhatsApp group chats
            </div>
          </div>
          <label className="switch-pill">
            <input
              type="checkbox"
              checked={replyInGroups}
              onChange={(e) => setReplyInGroups(e.target.checked)}
            />
            <span className="switch-slider" />
          </label>
        </div>

        {replyInGroups && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 18, paddingBottom: 18, borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Require Direct @Mention</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Bot will only trigger when someone explicitly mentions @WaBot or quotes its message
              </div>
            </div>
            <label className="switch-pill">
              <input
                type="checkbox"
                checked={onlyWhenMentioned}
                onChange={(e) => setOnlyWhenMentioned(e.target.checked)}
              />
              <span className="switch-slider" />
            </label>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <button className="btn-primary-wa" onClick={handleSave} disabled={busy}>
            <IconCheck size={16} />
            <span>{busy ? 'Saving...' : 'Save Group Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
