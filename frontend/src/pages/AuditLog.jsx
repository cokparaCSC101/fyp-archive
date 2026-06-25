// Audit Log — admin/HoD view of who did what across the archive:
// uploads, edits, deletions, approvals, denials and project views.
import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import Spinner from '../components/Spinner';

const FILTERS = [
  { key: '', label: 'All activity' },
  { key: 'view_project', label: 'Views' },
  { key: 'create_project', label: 'Uploads' },
  { key: 'update_project', label: 'Edits' },
  { key: 'delete_project', label: 'Deletions' },
  { key: 'approve_create', label: 'Approvals' },
];

// Human-friendly description per action.
const ACTION_TEXT = {
  view_project: 'viewed',
  create_project: 'uploaded',
  update_project: 'edited',
  delete_project: 'deleted',
  request_create: 'submitted a new-project request',
  request_update: 'submitted an edit request',
  request_delete: 'submitted a delete request',
  approve_create: 'approved a new project',
  approve_update: 'approved an edit',
  approve_delete: 'approved a deletion',
  deny_create: 'denied a new-project request',
  deny_update: 'denied an edit request',
  deny_delete: 'denied a delete request',
};

function fmtDate(d) {
  try { return new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

export default function AuditLog() {
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/audit', { params: { action: filter, limit: 150 } });
      setItems(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the audit log.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="container page">
      <div className="page-head">
        <span className="eyebrow">Head of Department</span>
        <h1>Audit Log</h1>
        <p>A record of who uploaded, edited, viewed, and approved projects in the archive.</p>
      </div>

      <div className="filter-row">
        {FILTERS.map((f) => (
          <button key={f.key} className={`filter-chip ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <Spinner label="Loading activity…" />
      ) : items.length === 0 ? (
        <div className="center-state">
          <div className="empty-mark">∅</div>
          <h3>No activity</h3>
          <p>Nothing has been recorded for this filter yet.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>When</th><th>User</th><th>Action</th><th>Project</th></tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.log_id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(a.created_at)}</td>
                  <td>{a.user_name || 'system'}{a.user_role ? <span className="muted"> · {a.user_role}</span> : null}</td>
                  <td>{ACTION_TEXT[a.action] || a.action.replace(/_/g, ' ')}</td>
                  <td className="td-title">{a.project_title || (a.details || '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
