// App — routing and shared layout.
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Browse from './pages/Browse';
import ProjectDetail from './pages/ProjectDetail';
import AdminDashboard from './pages/AdminDashboard';
import Approvals from './pages/Approvals';
import MyRequests from './pages/MyRequests';
import NotFound from './pages/NotFound';

const STAFF = ['admin', 'hod', 'lecturer'];
const APPROVERS = ['admin', 'hod'];

function Layout({ children }) {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/verify'].includes(location.pathname);
  return (
    <>
      {!isAuthPage && <Navbar />}
      {children}
      {!isAuthPage && (
        <footer className="footer">
          <div className="container">
            FYP Archive System · Computer Science Department, Pan-Atlantic University
          </div>
        </footer>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<VerifyEmail />} />

            <Route path="/" element={<ProtectedRoute><Browse /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />

            {/* Staff: manage the archive (lecturer actions become requests) */}
            <Route path="/admin" element={<ProtectedRoute roles={STAFF}><AdminDashboard /></ProtectedRoute>} />
            {/* Approvers: review the request queue */}
            <Route path="/approvals" element={<ProtectedRoute roles={APPROVERS}><Approvals /></ProtectedRoute>} />
            {/* Staff: track your own submitted requests */}
            <Route path="/my-requests" element={<ProtectedRoute roles={STAFF}><MyRequests /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
