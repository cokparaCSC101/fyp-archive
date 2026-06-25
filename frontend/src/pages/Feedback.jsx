// Feedback — any signed-in user can report an issue / send feedback to the
// administrator and track the status of what they've submitted.
import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import Spinner from '../components/Spinner';

const STATUS_LABEL = { open: 'open', seen: 'seen', in_progress: 'in progress', resolved: 'resolved' };

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

export default function Feedback() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints/mine');
      setItems(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your feedback.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in both a subject and a message.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/complaints', { subject, message });
      setNotice(res.data?.message || 'Submitted.');
      setSubject('');
      setMessage('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit your feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container page">
      <div className="page-head">
        <span className="eyebrow">Help &amp; Feedback</span>
        <h1>Report an issue or send feedback</h1>
        <p>Your message goes straight to the system administrator. You can track its progress below.</p>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-card" style={{ marginBottom: 28 }}>
        <form onSubmit={submit}>
          <div className="field">
            <label>Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. A project link is broken" maxLength={200} />
          </div>
          <div className="field">
            <label>Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe the problem or suggestion in detail…" />
          </div>
          <button type="submit" className="btn btn-gold" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send to administrator'}
          </button>
        </form>
      </div>

      <h2 className="section-title">Your previous feedback</h2>
      {loading ? (
        <Spinner label="Loading…" />
      ) : items.length === 0 ? (
        <div className="center-state">
          <div className="empty-mark">∅</div>
          <h3>Nothing yet</h3>
          <p>Anything you submit will appear here with its status.</p>
        </div>
      ) : (
        <div className="req-list">
          {items.map((c) => (
            <div className="req-card" key={c.complaint_id}>
              <div className="req-card-head">
                <h3>{c.subject}</h3>
                <span className={`pill pill-${c.status}`}>{STATUS_LABEL[c.status] || c.status}</span>
              </div>
              <div className="req-meta">Submitted {fmtDate(c.created_at)}{c.project_title ? ` · re: ${c.project_title}` : ''}</div>
              <div className="req-fields">{c.message}</div>
              {c.admin_response && (
                <div className="resp-note"><strong>Admin response:</strong> {c.admin_response}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
