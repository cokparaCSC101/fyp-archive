// Project card shown in the browse grid. Links to the full detail page.
import { Link } from 'react-router-dom';

export default function ProjectCard({ project }) {
  return (
    <Link to={`/projects/${project.project_id}`} className="card">
      <div className="card-top">
        <span className="year-chip">{project.year_completed}</span>
      </div>

      <h3 className="card-title">{project.title}</h3>
      <p className="card-abstract">{project.abstract}</p>

      <div className="card-meta">
        <div className="row">
          <span className="label">Student</span>
          <span className="value">{project.student_name}</span>
        </div>
        <div className="row">
          <span className="label">Supervisor</span>
          <span className="value">{project.supervisor_name}</span>
        </div>
      </div>
    </Link>
  );
}
