// Registration page. New accounts default to read-only roles
// (student / lecturer / hod). Admin accounts are provisioned separately.
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <span className="auth-aside-mark">PAU · School of Science & Technology</span>
        <div>
          <h1>Join the Computer Science project archive.</h1>
          <p>
            Create an account to explore the full history of final year projects
            from the department — abstracts, supervisors, and documents in one place.
          </p>
        </div>
        <span className="auth-aside-foot">
          A Cross-Platform Final Year Project Archive &amp; Retrieval System
        </span>
      </aside>

      <div className="auth-panel">
        <div className="auth-card">
          <h2>Create account</h2>
          <p className="sub">Register to start browsing the archive.</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Full name</label>
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="field">
              <label>Email address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@pau.edu.ng"
                autoComplete="email"
                required
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="field">
                <label>Role</label>
                <select name="role" value={form.role} onChange={handleChange}>
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                  <option value="hod">Head of Department</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="form-foot">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
