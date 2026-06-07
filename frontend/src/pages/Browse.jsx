// Browse page — the main archive view.
// Keyword + year search, results grid, and pagination.
import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import ProjectCard from '../components/ProjectCard';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';

const LIMIT = 9;

export default function Browse() {
  const [projects, setProjects] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search inputs (controlled) and the values actually applied to the query
  const [keyword, setKeyword] = useState('');
  const [year, setYear] = useState('');
  const [applied, setApplied] = useState({ keyword: '', year: '', page: 1 });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/projects', {
        params: {
          page: applied.page,
          limit: LIMIT,
          keyword: applied.keyword,
          year: applied.year,
        },
      });
      setProjects(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load projects.');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied({ keyword: keyword.trim(), year, page: 1 });
  };

  const handleReset = () => {
    setKeyword('');
    setYear('');
    setApplied({ keyword: '', year: '', page: 1 });
  };

  const handlePage = (page) => {
    setApplied((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Year options: current year back to 2015
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2014 }, (_, i) => currentYear - i);

  return (
    <div className="container page">
      <div className="page-head">
        <span className="eyebrow">Computer Science Department</span>
        <h1>Final Year Project Archive</h1>
        <p>
          Search the complete record of past final year projects — by title,
          student, keyword in the abstract, or year of completion.
        </p>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search by title, student, or keyword…"
        />
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-gold">
            Search
          </button>
          {(applied.keyword || applied.year) && (
            <button type="button" className="btn btn-ghost" onClick={handleReset}>
              Clear
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <Spinner label="Loading projects…" />
      ) : error ? (
        <div className="center-state">
          <div className="empty-mark">!</div>
          <h3>Something went wrong</h3>
          <p>{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="center-state">
          <div className="empty-mark">∅</div>
          <h3>No projects found</h3>
          <p>Try adjusting your search terms or clearing the filters.</p>
        </div>
      ) : (
        <>
          <div className="results-meta">
            <span>
              {pagination.total} {pagination.total === 1 ? 'project' : 'projects'} found
              {applied.keyword && ` for “${applied.keyword}”`}
              {applied.year && ` in ${applied.year}`}
            </span>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
          </div>

          <div className="grid">
            {projects.map((p) => (
              <ProjectCard key={p.project_id} project={p} />
            ))}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onChange={handlePage}
          />
        </>
      )}
    </div>
  );
}
