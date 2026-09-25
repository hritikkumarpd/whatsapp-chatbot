import { useState, useRef, useEffect } from 'react';
import { api } from '../api.js';
import {
  IconTrash,
  IconSend,
  IconClock,
  IconBot,
  IconSliders,
  IconCpu,
} from '../components/Icons.jsx';

export default function Playground({ onShowToast }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text: 'WaBot sandbox session initialized. Send a test message to evaluate model latency and tone.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [latency, setLatency] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    api.getConfig().then(setCfg);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function handleSend(e) {
    if (e) e.preventDefault();
    if (!input.trim() || busy) return;

    const userText = input.trim();
    setInput('');

    const newMsg = {
      id: Date.now(),
      role: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setBusy(true);

    const startTime = performance.now();

    try {
      const history = messages
        .filter((m) => m.id !== 1)
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }));

      const res = await api.testAi({
        message: userText,
        history,
        systemPrompt: cfg?.systemPrompt,
        model: cfg?.model,
      });

      const tookMs = Math.round(performance.now() - startTime);
      setLatency(tookMs);

      const botReply = {
        id: Date.now() + 1,
        role: 'bot',
        text: res.reply || 'No response returned.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latency: tookMs,
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'AI request failed', 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'bot',
          text: `Error: ${err.message || 'The AI request failed. Verify your Gemini API key in Bot Config.'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setMessages([
      {
        id: Date.now(),
        role: 'bot',
        text: 'Session reset. Ready for new test input.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setLatency(null);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Interactive Sandbox</h2>
          <p>Direct browser evaluation of Gemini inference, response latency, and system prompt compliance</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {latency && (
            <div className="status-pill" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              <IconClock size={13} />
              <span>{latency}ms latency</span>
            </div>
          )}
          <button className="btn btn-sm" onClick={clearChat} title="Clear simulator history">
            <IconTrash size={14} />
            <span>Clear Session</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20 }}>
        {/* Chat Simulator */}
        <div className="sandbox-chat">
          <div className="sandbox-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                }}
              >
                <IconBot size={17} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>
                  Gemini Test Simulator
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {busy ? 'generating response...' : `${cfg?.model || 'gemini-3.6-flash'} ready`}
                </div>
              </div>
            </div>

            <div className="status-pill" style={{ padding: '2px 8px', fontSize: 11 }}>
              <span className={`status-dot ${busy ? 'connecting' : 'connected'}`} />
              <span>{busy ? 'Inference' : 'Idle'}</span>
            </div>
          </div>

          <div className="sandbox-messages">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble ${m.role}`}
                style={
                  m.isError
                    ? {
                        background: 'var(--danger-muted)',
                        border: '1px solid var(--danger-border)',
                        color: '#fca5a5',
                      }
                    : {}
                }
              >
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                <div className="chat-bubble-meta">
                  <span>{m.time}</span>
                  {m.latency && <span> · {m.latency}ms</span>}
                </div>
              </div>
            ))}

            {busy && (
              <div className="chat-bubble bot" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Model is generating response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="sandbox-input-bar" onSubmit={handleSend}>
            <input
              type="text"
              className="input"
              style={{ flex: 1 }}
              placeholder="Send a test message (e.g. 'Can we reschedule tomorrow at 3 PM?')..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button
              type="submit"
              className="btn primary"
              disabled={busy || !input.trim()}
              title="Send message"
            >
              <IconSend size={15} />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* Runtime Parameters Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div className="card-title">
                <IconCpu size={16} />
                <span>Active Parameters</span>
              </div>
            </div>
            <div className="card-body" style={{ fontSize: 13 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4 }}>
                  Active Model
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-muted)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                    display: 'inline-block',
                  }}
                >
                  {cfg?.model || 'gemini-3.6-flash'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4 }}>
                    Temperature
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {cfg?.temperature ?? 0.7}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4 }}>
                    Max Turns
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {cfg?.maxHistoryTurns ?? 14}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 6 }}>
                  System Instructions
                </div>
                <div
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    maxHeight: 180,
                    overflowY: 'auto',
                    lineHeight: 1.5,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {cfg?.systemPrompt || 'No custom prompt configured'}
                </div>
              </div>

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  To alter prompts or parameters, visit the <b>Model & Intelligence</b> settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
