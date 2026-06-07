// Navbar — shown on all authenticated pages. Links adapt to the user's role.
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  admin: 'Administrator',
  student: 'Student',
  lecturer: 'Lecturer',
  hod: 'Head of Dept.',
};

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <NavLink to="/" className="brand">
          <span className="brand-mark">A</span>
          <span className="brand-text">
            <span className="brand-title">FYP Archive</span>
            <span className="brand-sub">Pan-Atlantic University</span>
          </span>
        </NavLink>

        <div className="nav-links">
          <NavLink to="/" end className="nav-link">
            Browse
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className="nav-link">
              Manage
            </NavLink>
          )}

          <div className="nav-user">
            <span className="brand-text">
              <span className="nav-user-name">{user?.full_name}</span>
              <span className="nav-user-role">{ROLE_LABELS[user?.role] || user?.role}</span>
            </span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
