// My Requests — lets a lecturer (or any staff member) track the status of
// the changes they've submitted: pending, approved, or denied (with reason).
import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import Spinner from '../components/Spinner';

const ACTION_VERB = { create: 'New project', update: 'Edit to', delete: 'Remove' };

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/requests/mine');
      setRequests(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="container page">
      <div className="page-head">
        <span className="eyebrow">My Submissions</span>
        <h1>My Requests</h1>
        <p>Track the projects and edits you've submitted for the Head of Department's approval.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <Spinner label="Loading your requests…" />
      ) : requests.length === 0 ? (
        <div className="center-state">
          <div className="empty-mark">∅</div>
          <h3>No requests yet</h3>
          <p>When you add, edit, or remove a project, it will appear here with its approval status.</p>
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
                Submitted {fmtDate(r.created_at)}
                {r.reviewed_at && <> · reviewed {fmtDate(r.reviewed_at)}{r.reviewed_by_name ? ` by ${r.reviewed_by_name}` : ''}</>}
              </div>
              {r.status === 'denied' && r.review_note && (
                <div className="req-note"><strong>Reason for denial:</strong> {r.review_note}</div>
              )}
              {r.status === 'pending' && (
                <div className="req-fields">Waiting for the Head of Department to review.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
