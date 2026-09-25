import { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  IconKey,
  IconSparkles,
  IconSliders,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconExternalLink,
} from '../components/Icons.jsx';

const PROMPT_PRESETS = [
  {
    id: 'helpful',
    name: 'Helpful Assistant',
    tag: 'Default',
    desc: 'Polite, concise, natural and helpful on your behalf.',
    prompt:
      'You are a friendly, natural WhatsApp assistant replying on my behalf. Keep replies short, warm and human. Match the language and tone of the sender (Hindi, English, Hinglish, etc.). Never sound like a robot.',
  },
  {
    id: 'hinglish',
    name: 'Casual Hinglish',
    tag: 'Conversational',
    desc: 'Casual friend tone with fluent everyday Hinglish/Hindi.',
    prompt:
      'Reply on WhatsApp on my behalf like a relaxed, friendly buddy. Use casual, natural Hinglish and everyday Hindi, with emojis where they feel natural. Keep it short, crisp and friendly. Match the same vibe and dialect as the sender.',
  },
  {
    id: 'professional',
    name: 'Executive & Formal',
    tag: 'Professional',
    desc: 'Formal, courteous, business-oriented replies.',
    prompt:
      'You are representing me professionally on WhatsApp. Respond with courteous, professional, and crisp communication. If someone inquires about meetings or business, acknowledge gracefully and state that I will revert back shortly.',
  },
  {
    id: 'sales',
    name: 'Support & Inquiries',
    tag: 'Business',
    desc: 'Answers questions, qualifies leads and collects details.',
    prompt:
      'You are a customer support and sales assistant for my business on WhatsApp. Be helpful, clear, and reassuring. Help with inquiries, ask qualifying questions politely, and collect their contact/requirement details so our team can follow up.',
  },
  {
    id: 'minimalist',
    name: 'Ultra Concise',
    tag: 'Minimal',
    desc: 'Maximum 1-2 short sentences, zero filler or boilerplate.',
    prompt:
      'Reply in 1 or 2 short sentences maximum. Be completely direct, natural, and helpful. Absolutely no boilerplate, apologies, or unnecessary pleasantries.',
  },
];

export default function BotConfig({ onShowToast }) {
  const [cfg, setCfg] = useState(null);
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyTesting, setKeyTesting] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getConfig().then((data) => {
      setCfg(data);
    });
  }, []);

  async function handleSave(e) {
    if (e) e.preventDefault();
    setBusy(true);
    try {
      const patch = { ...cfg };
      if (keyInput.trim()) {
        patch.geminiKey = keyInput.trim();
      }
      const res = await api.saveConfig(patch);
      setKeyInput('');
      setCfg((prev) => ({ ...prev, geminiKeySet: res.geminiKeySet }));
      if (onShowToast) onShowToast('Configuration saved successfully', 'success');
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to save configuration', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleTestKey() {
    setKeyTesting(true);
    setKeyTestResult(null);
    try {
      const keyToTest = keyInput.trim() || undefined;
      const res = await api.testApiKey({ key: keyToTest, model: cfg.model });
      setKeyTestResult(res);
    } catch (err) {
      setKeyTestResult({ ok: false, message: err.message });
    } finally {
      setKeyTesting(false);
    }
  }

  function applyPreset(preset) {
    setCfg((prev) => ({ ...prev, systemPrompt: preset.prompt }));
    if (onShowToast) onShowToast(`Applied preset: ${preset.name}`, 'success');
  }

  if (!cfg) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading configuration...</p>
      </div>
    );
  }

  const set = (key, val) => setCfg((prev) => ({ ...prev, [key]: val }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Model & Intelligence Settings</h2>
          <p>Configure Google Gemini credentials, behavioral prompts, and response parameters</p>
        </div>
        <button className="btn primary" onClick={handleSave} disabled={busy}>
          <IconCheck size={15} />
          <span>{busy ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 20 }}>
        {/* Left Column: API Key & System Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* API Key Box */}
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div className="card-title">
                <IconKey size={16} />
                <span>Google Gemini API Key</span>
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>Google AI Studio</span>
                <IconExternalLink size={12} />
              </a>
            </div>
            <div className="card-body">
              <div className="form-group" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type={showKey ? 'text' : 'password'}
                      className="input"
                      style={{ paddingRight: 40, fontFamily: 'var(--font-mono)', fontSize: 13 }}
                      placeholder={
                        cfg.geminiKeySet
                          ? '•••••••••••••••••••• (Key active. Enter a new key to update)'
                          : 'Paste your Gemini API key (AIzaSy...)'
                      }
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={showKey ? 'Hide key' : 'Show key'}
                    >
                      {showKey ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleTestKey}
                    disabled={keyTesting || (!keyInput.trim() && !cfg.geminiKeySet)}
                  >
                    <span>{keyTesting ? 'Testing...' : 'Verify'}</span>
                  </button>
                </div>
              </div>

              {keyTestResult && (
                <div
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12.5,
                    fontFamily: 'var(--font-mono)',
                    background: keyTestResult.ok ? 'var(--accent-muted)' : 'var(--danger-muted)',
                    color: keyTestResult.ok ? 'var(--accent)' : '#fca5a5',
                    border: `1px solid ${keyTestResult.ok ? 'var(--accent-border)' : 'var(--danger-border)'}`,
                  }}
                >
                  {keyTestResult.ok
                    ? `✓ Key verified with ${cfg.model}. Sample: "${keyTestResult.sample}"`
                    : `✕ Verification failed: ${keyTestResult.message}`}
                </div>
              )}
            </div>
          </div>

          {/* Personality Presets & Custom Prompt */}
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div className="card-title">
                <IconSparkles size={16} />
                <span>Persona & System Instructions</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {cfg.systemPrompt?.length || 0} chars
              </span>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: 18 }}>
                <label className="form-label" style={{ marginBottom: 8 }}>
                  <span>Quick Presets</span>
                </label>
                <div className="preset-grid">
                  {PROMPT_PRESETS.map((p) => {
                    const isCurrent = cfg.systemPrompt === p.prompt;
                    return (
                      <div
                        key={p.id}
                        className={`preset-card ${isCurrent ? 'active' : ''}`}
                        onClick={() => applyPreset(p)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span className="title">{p.name}</span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 10,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-tertiary)',
                            }}
                          >
                            {p.tag}
                          </span>
                        </div>
                        <div className="desc">{p.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <span>Custom System Instructions</span>
                </label>
                <textarea
                  rows={7}
                  value={cfg.systemPrompt || ''}
                  onChange={(e) => set('systemPrompt', e.target.value)}
                  placeholder="Define your custom persona, preferred language, tone and answering rules..."
                  style={{ fontSize: 13, lineHeight: 1.55 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Model Settings & Intelligence Control */}
        <div>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div className="card-title">
                <IconSliders size={16} />
                <span>Inference Parameters</span>
              </div>
            </div>
            <div className="card-body">
              {/* Gemini Model Selector */}
              <div className="form-group">
                <label className="form-label">
                  <span>Gemini Model</span>
                </label>
                <select
                  value={cfg.model || 'gemini-3.6-flash'}
                  onChange={(e) => set('model', e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Latest & most capable)</option>
                  <option value="gemini-3.7-flash">gemini-3.7-flash</option>
                  <option value="gemini-3.6-flash">gemini-3.6-flash (Advanced)</option>
                  <option value="gemini-3.5-flash">gemini-3.5-flash (Standard)</option>
                  <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Fast &amp; High Quota - Recommended)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Lightweight)</option>
                  <option value="gemini-flash-latest">gemini-flash-latest (Latest stable)</option>
                  <option value="gemini-flash-lite-latest">gemini-flash-lite-latest (Latest Lite)</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Standard 2.5)</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash (Fast &amp; versatile)</option>
                </select>
              </div>

              {/* Creativity / Temperature Slider */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>Temperature</label>
                  <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                    {cfg.temperature ?? 0.7}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={cfg.temperature ?? 0.7}
                  onChange={(e) => set('temperature', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  <span>Deterministic (0.1)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>

              {/* Memory Turns */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>Context Memory Turns</label>
                  <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--blue)' }}>
                    {cfg.maxHistoryTurns ?? 14}
                  </span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="24"
                  step="2"
                  value={cfg.maxHistoryTurns ?? 14}
                  onChange={(e) => set('maxHistoryTurns', parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--blue)' }}
                />
                <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Number of prior messages retained per chat session
                </p>
              </div>

              {/* Inactivity Reset */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">
                  <span>Session Inactivity Reset</span>
                </label>
                <select
                  value={cfg.sessionResetMinutes ?? 60}
                  onChange={(e) => set('sessionResetMinutes', parseInt(e.target.value))}
                  style={{ fontSize: 13 }}
                >
                  <option value={15}>15 minutes of inactivity</option>
                  <option value={30}>30 minutes of inactivity</option>
                  <option value={60}>1 hour (Recommended)</option>
                  <option value={180}>3 hours</option>
                  <option value={1440}>24 hours</option>
                  <option value={0}>Never expire (Preserve)</option>
                </select>
              </div>

              <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button className="btn primary block" onClick={handleSave} disabled={busy}>
                  <IconCheck size={15} />
                  <span>{busy ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
