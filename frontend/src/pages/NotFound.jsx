// 404 page
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container page">
      <div className="center-state">
        <div className="empty-mark">404</div>
        <h3>Page not found</h3>
        <p>The page you’re looking for doesn’t exist.</p>
        <Link to="/" className="btn btn-primary">
          Back to archive
        </Link>
      </div>
    </div>
  );
}
