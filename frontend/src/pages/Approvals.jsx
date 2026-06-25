// Approvals — the request queue for the Head of Department (and admin).
// Review lecturer submissions and approve or deny them (with a reason).
import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import Spinner from '../components/Spinner';

const FILTERS = ['pending', 'approved', 'denied', 'all'];
const ACTION_VERB = { create: 'New project', update: 'Edit to', delete: 'Remove' };

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

// Similarity flag shown on create/edit requests.
function SimNote({ score, info }) {
  let matches = [];
  try { matches = JSON.parse(info || '[]'); } catch { matches = []; }
  const tone = score >= 60 ? 'high' : score >= 30 ? 'med' : 'low';
  const label = score >= 60 ? 'High similarity' : score >= 30 ? 'Possible overlap'
              : (matches.length ? 'Low similarity' : 'No close matches found');
  return (
    <div className={`sim sim-${tone}`}>
      <strong>{label}{matches.length ? ` — ${score}% match` : ''}</strong>
      {matches.length > 0 && (
        <ul className="sim-list">
          {matches.map((m) => (<li key={m.project_id}>{m.score}% · {m.title}</li>))}
        </ul>
      )}
    </div>
  );
}

export default function Approvals() {
  const [filter, setFilter] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [denying, setDenying] = useState(null); // request being denied
  const [denyNote, setDenyNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/requests', { params: { status: filter } });
      setRequests(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load requests.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 4000); };

  const approve = async (id) => {
    setBusyId(id);
    try {
      const res = await api.post(`/requests/${id}/approve`);
      flash(res.data?.message || 'Approved.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not approve the request.');
    } finally {
      setBusyId(null);
    }
  };

  const submitDeny = async () => {
    if (!denying) return;
    setBusyId(denying.request_id);
    try {
      const res = await api.post(`/requests/${denying.request_id}/deny`, { review_note: denyNote });
      flash(res.data?.message || 'Denied.');
      setDenying(null);
      setDenyNote('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not deny the request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container page">
      <div className="page-head">
        <span className="eyebrow">Head of Department</span>
        <h1>Approvals</h1>
        <p>Review project submissions from lecturers and decide what enters the archive.</p>
      </div>

      <div className="filter-row">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <Spinner label="Loading requests…" />
      ) : requests.length === 0 ? (
        <div className="center-state">
          <div className="empty-mark">✓</div>
          <h3>Nothing here</h3>
          <p>There are no {filter === 'all' ? '' : filter} requests right now.</p>
        </div>
      ) : (
        <div className="req-list">
          {requests.map((r) => (
            <div className="req-card" key={r.request_id}>
              <div className="req-card-head">
                <span className={`pill pill-${r.action}`}>{r.action}</span>
                <h3>{ACTION_VERB[r.action]}: {r.title || r.target_title || `Project #${r.target_project_id}`}</h3>
                <span className={`pill pill-${r.status}`}>{r.status}</span>
              </div>
              <div className="req-meta">
                Requested by {r.requested_by_name} ({r.requested_by_email}) · {fmtDate(r.created_at)}
                {r.reviewed_by_name && <> · reviewed by {r.reviewed_by_name}</>}
              </div>

              {r.action !== 'delete' && (
                <div className="req-fields">
                  <div><span className="lbl">Student:</span> {r.student_name} &nbsp;·&nbsp; <span className="lbl">Year:</span> {r.year_completed} &nbsp;·&nbsp; <span className="lbl">Supervisor:</span> {r.supervisor_name || '—'}</div>
                  {r.abstract && <div style={{ marginTop: 6 }}><span className="lbl">Abstract:</span> {r.abstract.length > 280 ? r.abstract.slice(0, 280) + '…' : r.abstract}</div>}
                  {(r.project_link || r.project_webapp_link) && (
                    <div style={{ marginTop: 6 }}>
                      {r.project_link && <a href={r.project_link} target="_blank" rel="noreferrer">Document link</a>}
                      {r.project_link && r.project_webapp_link && ' · '}
                      {r.project_webapp_link && <a href={r.project_webapp_link} target="_blank" rel="noreferrer">Web app link</a>}
                    </div>
                  )}
                </div>
              )}
              {r.action === 'delete' && (
                <div className="req-fields">Requests removal of <strong>{r.target_title || `project #${r.target_project_id}`}</strong> from the archive.</div>
              )}

              {r.action !== 'delete' && r.similarity_score != null && (
                <SimNote score={Number(r.similarity_score)} info={r.similarity_info} />
              )}

              {r.status === 'denied' && r.review_note && (
                <div className="req-note"><strong>Reason:</strong> {r.review_note}</div>
              )}

              {r.status === 'pending' && (
                <div className="req-actions">
                  <button className="btn btn-gold btn-sm" disabled={busyId === r.request_id} onClick={() => approve(r.request_id)}>
                    {busyId === r.request_id ? 'Working…' : 'Approve'}
                  </button>
                  <button className="btn btn-danger btn-sm" disabled={busyId === r.request_id} onClick={() => { setDenying(r); setDenyNote(''); }}>
                    Deny
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {denying && (
        <div className="modal-overlay" onClick={() => setDenying(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Deny request</h3>
              <button className="modal-close" onClick={() => setDenying(null)}>×</button>
            </div>
            <div className="modal-body">
              <p className="confirm-text">
                Denying the {denying.action} request for <strong>{denying.title || denying.target_title}</strong>.
                Add a short reason (the lecturer will see it).
              </p>
              <div className="field">
                <label>Reason (optional)</label>
                <textarea value={denyNote} onChange={(e) => setDenyNote(e.target.value)}
                  placeholder="e.g. Too similar to an existing project; please refine the topic." />
              </div>
              <div className="modal-foot">
                <button className="btn btn-ghost" onClick={() => setDenying(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={submitDeny} disabled={busyId === denying.request_id}>
                  {busyId === denying.request_id ? 'Working…' : 'Deny request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
