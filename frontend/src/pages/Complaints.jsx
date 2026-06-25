// Complaints — admin-only management of user feedback. Filter by status,
// add a response, and move each complaint through its lifecycle.
import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import Spinner from '../components/Spinner';

const FILTERS = ['all', 'open', 'seen', 'in_progress', 'resolved'];
const STATUSES = ['open', 'seen', 'in_progress', 'resolved'];
const LABEL = { all: 'All', open: 'Open', seen: 'Seen', in_progress: 'In progress', resolved: 'Resolved' };

function fmtDate(d) {
  try { return new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function Row({ c, onSaved }) {
  const [status, setStatus] = useState(c.status);
  const [response, setResponse] = useState(c.admin_response || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/complaints/${c.complaint_id}`, { status, admin_response: response });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="req-card">
      <div className="req-card-head">
        <h3>{c.subject}</h3>
        <span className={`pill pill-${c.status}`}>{LABEL[c.status] || c.status}</span>
      </div>
      <div className="req-meta">
        From {c.user_name} ({c.user_email}) · {c.user_role} · {fmtDate(c.created_at)}
        {c.project_title ? ` · re: ${c.project_title}` : ''}
      </div>
      <div className="req-fields">{c.message}</div>

      <div className="complaint-controls">
        <div className="field" style={{ margin: 0 }}>
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0, flex: 1 }}>
          <label>Response to the user</label>
          <textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Optional reply the user will see…" style={{ minHeight: 60 }} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn btn-gold btn-sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );
}

export default function Complaints() {
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/complaints', { params: { status: filter } });
      setItems(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load complaints.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="container page">
      <div className="page-head">
        <span className="eyebrow">Administrator</span>
        <h1>Complaints</h1>
        <p>Feedback submitted by users. Update the status and reply where helpful.</p>
      </div>

      <div className="filter-row">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{LABEL[f]}</button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <Spinner label="Loading complaints…" />
      ) : items.length === 0 ? (
        <div className="center-state">
          <div className="empty-mark">✓</div>
          <h3>Nothing here</h3>
          <p>There are no {filter === 'all' ? '' : LABEL[filter].toLowerCase()} complaints.</p>
        </div>
      ) : (
        <div className="req-list">
          {items.map((c) => <Row key={c.complaint_id} c={c} onSaved={load} />)}
        </div>
      )}
    </div>
  );
}
