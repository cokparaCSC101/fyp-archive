// Manage Archive — staff page (admin, HoD, lecturer).
//   admin / HoD : add, edit, delete take effect immediately.
//   lecturer    : the same actions are submitted to the HoD as requests.
// The route guard and the backend both enforce these permissions.
import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import ProjectForm from '../components/ProjectForm';
import Spinner from '../components/Spinner';

const ROLE_EYEBROW = { admin: 'Administrator', hod: 'Head of Department', lecturer: 'Lecturer' };

export default function AdminDashboard() {
  const { role, isLecturer, canApprove } = useAuth();
  const [projects, setProjects] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [projRes, supRes] = await Promise.all([
        api.get('/projects', { params: { limit: 50, page: 1 } }),
        api.get('/supervisors'),
      ]);
      setProjects(projRes.data.data);
      setSupervisors(supRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 5000); };

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (project) => { setEditing(project); setShowForm(true); };

  const handleSubmit = async (form) => {
    setSaving(true);
    try {
      const res = editing
        ? await api.put(`/projects/${editing.project_id}`, form)
        : await api.post('/projects', form);
      setShowForm(false);
      setEditing(null);
      flash(res.data?.message || 'Saved.');
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      const res = await api.delete(`/projects/${deleting.project_id}`);
      flash(res.data?.message || 'Done.');
      setDeleting(null);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete the project.');
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="container page">
      <div className="admin-head">
        <div className="page-head" style={{ marginBottom: 0 }}>
          <span className="eyebrow">{ROLE_EYEBROW[role] || 'Staff'}</span>
          <h1>Manage Archive</h1>
          <p>
            {isLecturer
              ? 'Propose new projects or edits — your changes go to the Head of Department for approval.'
              : 'Add, edit, or remove final year project records.'}
          </p>
        </div>
        <button className="btn btn-gold" onClick={openAdd}>
          {isLecturer ? '+ Propose Project' : '+ Add Project'}
        </button>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <Spinner label="Loading…" />
      ) : projects.length === 0 ? (
        <div className="center-state">
          <div className="empty-mark">∅</div>
          <h3>No projects yet</h3>
          <p>Add the first project to start building the archive.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Title</th><th>Student</th><th>Year</th><th>Supervisor</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.project_id}>
                  <td className="td-title">{p.title}</td>
                  <td>{p.student_name}</td>
                  <td>{p.year_completed}</td>
                  <td>{p.supervisor_name}</td>
                  <td>
                    <div className="td-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleting(p)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ProjectForm
          initial={editing}
          supervisors={supervisors}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditing(null); }}
          saving={saving}
          pendingMode={isLecturer}
          allowSimilarityCheck={canApprove}
        />
      )}

      {deleting && (
        <div className="modal-overlay" onClick={() => setDeleting(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{isLecturer ? 'Request deletion?' : 'Delete project?'}</h3>
              <button className="modal-close" onClick={() => setDeleting(null)}>×</button>
            </div>
            <div className="modal-body">
              <p className="confirm-text">
                {isLecturer ? (
                  <>This will send a request to remove <strong>{deleting.title}</strong> to the Head of Department for approval.</>
                ) : (
                  <>This will permanently remove <strong>{deleting.title}</strong> from the archive. This action cannot be undone.</>
                )}
              </p>
              <div className="modal-foot">
                <button className="btn btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDelete} disabled={deletingBusy}>
                  {deletingBusy ? 'Working…' : isLecturer ? 'Submit request' : 'Delete project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
