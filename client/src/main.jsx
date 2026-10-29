import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { apiUrl } from './utils/apiUrls';

// The production app is mounted below /rafeeq. Keep existing API calls
// working under that prefix without changing every component individually.
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    input = apiUrl(input);
  }
  return nativeFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
