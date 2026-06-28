import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Apply the saved theme before the first paint to avoid a flash.
if (localStorage.getItem('fyp-theme') === 'classic') {
  document.documentElement.setAttribute('data-theme', 'classic');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
