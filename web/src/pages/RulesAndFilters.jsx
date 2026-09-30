import { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  IconShield,
  IconTag,
  IconBot,
  IconTrash,
  IconCheck,
} from '../components/Icons.jsx';

export default function RulesAndFilters({ onShowToast }) {
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState(false);

  // New rule form
  const [newKeyword, setNewKeyword] = useState('');
  const [newMatchType, setNewMatchType] = useState('contains');
  const [newReply, setNewReply] = useState('');

  // Number input for blacklist / whitelist
  const [numberInput, setNumberInput] = useState('');

  useEffect(() => {
    api.getConfig().then(setCfg);
  }, []);

  async function saveConfigPatch(patch) {
    setBusy(true);
    try {
      await api.saveConfig(patch);
      setCfg((prev) => ({ ...prev, ...patch }));
      if (onShowToast) onShowToast('Settings updated successfully', 'success');
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setBusy(false);
    }
  }

  function handleAddRule(e) {
    e.preventDefault();
    if (!newKeyword.trim() || !newReply.trim()) return;

    const newRule = {
      id: 'rule-' + Date.now(),
      keyword: newKeyword.trim(),
      matchType: newMatchType,
      reply: newReply.trim(),
      enabled: true,
    };

    const updatedRules = [...(cfg.customRules || []), newRule];
    saveConfigPatch({ customRules: updatedRules });
    setNewKeyword('');
    setNewReply('');
  }

  function handleToggleRule(ruleId) {
    const updated = (cfg.customRules || []).map((r) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    saveConfigPatch({ customRules: updated });
  }

  function handleDeleteRule(ruleId) {
    const updated = (cfg.customRules || []).filter((r) => r.id !== ruleId);
    saveConfigPatch({ customRules: updated });
  }

  function handleAddNumber(listKey) {
    if (!numberInput.trim()) return;
    const cleanNum = numberInput.replace(/\D/g, '');
    if (!cleanNum) return;

    const currentList = Array.isArray(cfg[listKey]) ? cfg[listKey] : [];
    if (!currentList.includes(cleanNum)) {
      const updated = [...currentList, cleanNum];
      saveConfigPatch({ [listKey]: updated });
    }
    setNumberInput('');
  }

  function handleRemoveNumber(listKey, numToRemove) {
    const currentList = Array.isArray(cfg[listKey]) ? cfg[listKey] : [];
    const updated = currentList.filter((n) => n !== numToRemove);
    saveConfigPatch({ [listKey]: updated });
  }

  if (!cfg) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading rules & filters...</p>
      </div>
    );
  }

  const customRules = cfg.customRules || [];
  const blacklist = cfg.blacklist || [];
  const whitelist = cfg.whitelist || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Rules, Filters & Simulation</h2>
          <p>Deterministic keyword triggers, access control lists, and human presence simulation</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 20 }}>
        {/* Left Column: Keyword Quick Rules */}
        <div>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div className="card-title">
                <IconTag size={16} />
                <span>Deterministic Trigger Rules</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {customRules.length} rules active
              </span>
            </div>
            <div className="card-body">
              {/* Existing Rules List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {customRules.length === 0 ? (
                  <div
                    style={{
                      padding: '32px 20px',
                      textAlign: 'center',
                      color: 'var(--text-tertiary)',
                      background: 'var(--bg-canvas)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px dashed var(--border)',
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                      No trigger rules configured
                    </p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>
                      Add keyword matches below for immediate, deterministic replies without AI inference.
                    </p>
                  </div>
                ) : (
                  customRules.map((rule) => (
                    <div
                      key={rule.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'var(--blue-muted)',
                              color: 'var(--blue)',
                              border: '1px solid var(--blue-border)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {rule.matchType}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            "{rule.keyword}"
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 12.5, wordBreak: 'break-word' }}>
                          → {rule.reply}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={() => handleToggleRule(rule.id)}
                          />
                          <span className="slider" />
                        </label>
                        <button
                          className="btn-sm btn danger"
                          onClick={() => handleDeleteRule(rule.id)}
                          style={{ padding: '4px 8px' }}
                          title="Delete trigger rule"
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Rule Form */}
              <div
                style={{
                  background: 'var(--bg-canvas)',
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
                  New Trigger Rule
                </div>
                <form onSubmit={handleAddRule}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10, marginBottom: 10 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Keyword or trigger phrase..."
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                    />
                    <select
                      value={newMatchType}
                      onChange={(e) => setNewMatchType(e.target.value)}
                      style={{ fontSize: 12.5 }}
                    >
                      <option value="contains">Contains</option>
                      <option value="exact">Exact match</option>
                      <option value="starts">Starts with</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <textarea
                      rows={2}
                      className="input"
                      placeholder="Instant reply text..."
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={busy || !newKeyword.trim() || !newReply.trim()}
                  >
                    <IconCheck size={14} />
                    <span>Create Trigger Rule</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Routing & Anti-Ban Safety */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Access Control (Blacklist / Whitelist) */}
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div className="card-title">
                <IconShield size={16} />
                <span>Access Control & Routing</span>
              </div>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">
                  <span>Routing Policy</span>
                </label>
                <select
                  value={cfg.filterMode || 'all'}
                  onChange={(e) => saveConfigPatch({ filterMode: e.target.value })}
                  style={{ fontSize: 13 }}
                >
                  <option value="all">Permissive (Respond to all chats)</option>
                  <option value="blacklist">Blacklist (Drop specified numbers)</option>
                  <option value="whitelist">Whitelist (Strictly allow specified only)</option>
                </select>
              </div>

              {cfg.filterMode === 'blacklist' && (
                <div>
                  <label className="form-label" style={{ marginTop: 14 }}>
                    <span>Blacklisted Numbers</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 919876543210"
                      value={numberInput}
                      onChange={(e) => setNumberInput(e.target.value)}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleAddNumber('blacklist')}
                    >
                      Add
                    </button>
                  </div>

                  <div className="tag-list">
                    {blacklist.length === 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>No numbers blocked</span>
                    ) : (
                      blacklist.map((num) => (
                        <span key={num} className="tag-chip">
                          <span>+{num}</span>
                          <button type="button" onClick={() => handleRemoveNumber('blacklist', num)}>✕</button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}

              {cfg.filterMode === 'whitelist' && (
                <div>
                  <label className="form-label" style={{ marginTop: 14 }}>
                    <span>Whitelisted Numbers</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 919876543210"
                      value={numberInput}
                      onChange={(e) => setNumberInput(e.target.value)}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleAddNumber('whitelist')}
                    >
                      Add
                    </button>
                  </div>

                  <div className="tag-list">
                    {whitelist.length === 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>No numbers allowed</span>
                    ) : (
                      whitelist.map((num) => (
                        <span key={num} className="tag-chip">
                          <span>+{num}</span>
                          <button type="button" onClick={() => handleRemoveNumber('whitelist', num)}>✕</button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Anti-Ban & Human Simulation */}
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div className="card-title">
                <IconBot size={16} />
                <span>Human Presence Simulation</span>
              </div>
            </div>
            <div className="card-body">
              {/* Typing Simulation Delay */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">
                  <span>Presence / Typing Delay</span>
                </label>
                <select
                  value={cfg.typingDelay || 'realistic'}
                  onChange={(e) => saveConfigPatch({ typingDelay: e.target.value })}
                  style={{ fontSize: 13 }}
                >
                  <option value="realistic">Natural cadence (1.2s – 3.5s dynamic typing)</option>
                  <option value="fast">Fast (800ms fixed indicator)</option>
                  <option value="instant">Immediate (0s delay)</option>
                </select>
                <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Simulates realistic composition duration before message dispatch.
                </p>
              </div>

              {/* Blue Ticks (Mark as Read) */}
              <div className="toggle-switch-row">
                <div className="toggle-info">
                  <h4>Read Receipts</h4>
                  <p>Send blue tick delivery confirmation upon replying</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={!!cfg.markRead}
                    onChange={(e) => saveConfigPatch({ markRead: e.target.checked })}
                  />
                  <span className="slider" />
                </label>
              </div>

              {/* Reply in Groups */}
              <div className="toggle-switch-row">
                <div className="toggle-info">
                  <h4>Group Chat Auto-Replies</h4>
                  <p>Enable automated responses in multi-participant groups</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={!!cfg.replyInGroups}
                    onChange={(e) => saveConfigPatch({ replyInGroups: e.target.checked })}
                  />
                  <span className="slider" />
                </label>
              </div>

              {/* Only When Mentioned */}
              {cfg.replyInGroups && (
                <div className="toggle-switch-row">
                  <div className="toggle-info">
                    <h4>Require Explicit Mention</h4>
                    <p>Trigger only when directly @mentioned or replied to</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={!!cfg.groupOnlyWhenMentioned}
                      onChange={(e) => saveConfigPatch({ groupOnlyWhenMentioned: e.target.checked })}
                    />
                    <span className="slider" />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
