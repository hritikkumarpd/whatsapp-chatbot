import { useState } from 'react';
import { IconTemplate, IconTrash, IconCheck } from '../components/Icons.jsx';

const DEFAULT_TEMPLATES = [
  { id: '1', title: 'Welcome Greeting', text: 'Hello! Thanks for reaching out. How can I assist you today?' },
  { id: '2', title: 'Away / Outside Business Hours', text: 'Hey! I am currently away from my phone, but I will get back to you as soon as I am back.' },
  { id: '3', title: 'Meeting Request', text: 'Got your message! Please drop your preferred time slots and agenda, and I will confirm shortly.' },
];

export default function TemplatesPage({ onShowToast }) {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;
    const newItem = { id: Date.now().toString(), title: newTitle.trim(), text: newText.trim() };
    setTemplates([...templates, newItem]);
    setNewTitle('');
    setNewText('');
    if (onShowToast) onShowToast('Template created', 'success');
  }

  function handleDelete(id) {
    setTemplates(templates.filter((t) => t.id !== id));
    if (onShowToast) onShowToast('Template deleted', 'success');
  }

  return (
    <div>
      <div className="hero-header">
        <div>
          <h1 className="hero-title">Quick Message Templates</h1>
          <p className="hero-subtitle">
            Canned responses and snippets for immediate reuse across your chats.
          </p>
        </div>
      </div>

      <div className="card-container" style={{ marginBottom: 20 }}>
        <div className="card-container-header">
          <div className="card-header-title">
            <IconTemplate size={18} />
            <span>Saved Templates ({templates.length})</span>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-light)' }}>
              <IconTemplate size={32} />
              <p style={{ marginTop: 8, fontSize: 13 }}>No templates yet. Create one below.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {templates.map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: 16,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-subtle)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 14,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-main)' }}>{t.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{t.text}</div>
                  </div>
                  <button className="btn danger btn-sm" onClick={() => handleDelete(t.id)} title="Delete template">
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card-container">
        <div className="card-container-header">
          <div className="card-header-title">
            <IconCheck size={18} />
            <span>Add New Template</span>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                className="input"
                placeholder="Template Title (e.g. Price Sheet, Office Address)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                rows={3}
                className="textarea"
                placeholder="Message template text..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary-wa" disabled={!newTitle.trim() || !newText.trim()}>
              <IconCheck size={16} />
              <span>Save Template</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
