// Email verification page. Reached after registering (or after trying to
// log in with an unverified account). The user enters the 6-digit code
// emailed to them; on success they are signed in.
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const { verifyEmail, resendCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(location.state?.email ? 'We sent a 6-digit code to your email.' : '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await verifyEmail(email.trim(), code.trim());
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setResending(true);
    try {
      const data = await resendCode(email.trim());
      setInfo(data.message || 'A new code has been sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend the code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <span className="auth-aside-mark">PAU · School of Science &amp; Technology</span>
        <div>
          <h1>Just one more step.</h1>
          <p>
            We&rsquo;ve sent a 6-digit verification code to your email. Enter it
            below to confirm your account and start exploring the archive.
          </p>
        </div>
        <span className="auth-aside-foot">
          A Cross-Platform Final Year Project Archive &amp; Retrieval System
        </span>
      </aside>

      <div className="auth-panel">
        <div className="auth-card">
          <h2>Verify your email</h2>
          <p className="sub">Enter the code we emailed you.</p>

          {error && <div className="alert alert-error">{error}</div>}
          {info && <div className="alert alert-success">{info}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@pau.edu.ng"
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <label>Verification code</label>
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                maxLength={6}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify & continue'}
            </button>
          </form>

          <p className="form-foot">
            Didn&rsquo;t get it?{' '}
            <button type="button" className="link-button" onClick={handleResend} disabled={resending}>
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          </p>
          <p className="form-foot">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
