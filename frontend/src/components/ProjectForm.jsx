// Add / edit project form, shown inside a modal on the manage page.
// When pendingMode is true (lecturers), the labels reflect that the
// change is submitted to the HoD for approval rather than applied directly.
import { useState, useEffect } from 'react';
import api from '../api/client';

const emptyForm = {
  title: '',
  student_name: '',
  year_completed: new Date().getFullYear(),
  abstract: '',
  project_link: '',
  project_webapp_link: '',
  supervisor_id: '',
};

export default function ProjectForm({ initial, supervisors, onSubmit, onClose, saving, pendingMode = false, allowSimilarityCheck = false }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [sim, setSim] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title || '',
        student_name: initial.student_name || '',
        year_completed: initial.year_completed || new Date().getFullYear(),
        abstract: initial.abstract || '',
        project_link: initial.project_link || '',
        project_webapp_link: initial.project_webapp_link || '',
        supervisor_id: initial.supervisor_id || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'title' || name === 'abstract') setSim(null);
    setForm((f) => ({ ...f, [name]: value }));
  };

  const runSimCheck = async () => {
    setSimError('');
    setSim(null);
    if (!form.title || !form.abstract) {
      setSimError('Add a title and abstract first.');
      return;
    }
    setSimLoading(true);
    try {
      const res = await api.post('/projects/check-similarity', {
        title: form.title, abstract: form.abstract, project_id: initial?.project_id,
      });
      setSim(res.data);
    } catch (err) {
      setSimError(err.response?.data?.message || 'Could not run the similarity check.');
    } finally {
      setSimLoading(false);
    }
  };

  const simTone = (score) => (score >= 60 ? 'high' : score >= 30 ? 'med' : 'low');
  const simLabel = (score, n) => (!n ? 'No close matches found' : score >= 60 ? 'High similarity' : score >= 30 ? 'Possible overlap' : 'Low similarity');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.student_name || !form.abstract || !form.supervisor_id) {
      setError('Please fill in all required fields.');
      return;
    }
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  const saveLabel = pendingMode
    ? (saving ? 'Submitting…' : 'Submit for approval')
    : (saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Project');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{initial ? 'Edit Project' : 'Add New Project'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          {pendingMode && (
            <div className="form-hint">
              Your submission will be sent to the Head of Department for approval before it appears in the archive.
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Project Title *</label>
              <input name="title" value={form.title} onChange={handleChange}
                placeholder="e.g. A Cross-Platform Final Year Project Archive…" />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Student Name *</label>
                <input name="student_name" value={form.student_name} onChange={handleChange} placeholder="Full name" />
              </div>
              <div className="field">
                <label>Year Completed *</label>
                <input type="number" name="year_completed" value={form.year_completed} onChange={handleChange}
                  min="1990" max={new Date().getFullYear() + 1} />
              </div>
            </div>

            <div className="field">
              <label>Supervisor *</label>
              <select name="supervisor_id" value={form.supervisor_id} onChange={handleChange}>
                <option value="">Select a supervisor…</option>
                {supervisors.map((s) => (
                  <option key={s.supervisor_id} value={s.supervisor_id}>
                    {s.full_name} — {s.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Abstract *</label>
              <textarea name="abstract" value={form.abstract} onChange={handleChange}
                placeholder="A concise summary of the project…" />
            </div>

            {allowSimilarityCheck && (
              <div className="field">
                <button type="button" className="btn btn-ghost btn-sm" onClick={runSimCheck} disabled={simLoading}>
                  {simLoading ? 'Checking…' : 'Check similarity against the archive'}
                </button>
                {simError && <div className="alert alert-error" style={{ marginTop: 10, marginBottom: 0 }}>{simError}</div>}
                {sim && (
                  <div className={`sim sim-${simTone(sim.score)}`}>
                    <strong>{simLabel(sim.score, sim.matches.length)}{sim.matches.length ? ` — ${sim.score}% match` : ''}</strong>
                    {sim.matches.length > 0 && (
                      <ul className="sim-list">
                        {sim.matches.map((m) => (<li key={m.project_id}>{m.score}% · {m.title}</li>))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="field">
              <label>Document Link (optional)</label>
              <input name="project_link" value={form.project_link} onChange={handleChange}
                placeholder="https://… link to the full document" />
            </div>

            <div className="field">
              <label>Project Web App Link (optional)</label>
              <input name="project_webapp_link" value={form.project_webapp_link} onChange={handleChange}
                placeholder="https://… live demo / deployed project, if any" />
            </div>

            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-gold" disabled={saving}>{saveLabel}</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginTop: 14, marginBottom: 0 }}>{error}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}
