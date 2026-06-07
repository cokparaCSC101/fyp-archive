// Project detail page — full record for a single project.
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import Spinner from '../components/Spinner';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/projects/${id}`);
        if (active) setProject(data);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Could not load this project.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container page">
        <Spinner label="Loading project…" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container page">
        <Link to="/" className="back-link">
          ‹ Back to archive
        </Link>
        <div className="center-state">
          <div className="empty-mark">!</div>
          <h3>Project not found</h3>
          <p>{error || 'This project may have been removed.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <Link to="/" className="back-link">
        ‹ Back to archive
      </Link>

      <article className="detail">
        <span className="year-chip">{project.year_completed}</span>
        <h1>{project.title}</h1>

        <div className="detail-meta-grid">
          <div className="detail-meta-item">
            <div className="label">Student</div>
            <div className="value">{project.student_name}</div>
          </div>
          <div className="detail-meta-item">
            <div className="label">Supervisor</div>
            <div className="value">{project.supervisor_name}</div>
          </div>
          <div className="detail-meta-item">
            <div className="label">Department</div>
            <div className="value">{project.supervisor_department}</div>
          </div>
          <div className="detail-meta-item">
            <div className="label">Year Completed</div>
            <div className="value">{project.year_completed}</div>
          </div>
        </div>

        <div className="detail-section-label">Abstract</div>
        <p className="detail-abstract">{project.abstract}</p>

        {project.project_link && (
          <a
            href={project.project_link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-gold"
          >
            View full document ↗
          </a>
        )}
      </article>
    </div>
  );
}
