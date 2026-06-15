import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer>
      <div className="ft-g">
        <div className="ft-col">
          <div className="ft-logo-row">
            <div className="ft-lm">
              <span className="ft-lv">VIE</span>
              <span className="ft-lt">TRANS</span>
            </div>
          </div>
          <p className="docs-p" style={{ maxWidth: '280px', marginTop: '14px' }}>
            A web gateway for DebackX image translation: upload, translate, review, and download Vietnamese results.
          </p>
        </div>

        <div className="ft-col">
          <h5>Platform</h5>
          <Link to="/">Overview</Link>
          <Link to="/studio">Studio</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/docs">API Documentation</Link>
        </div>

        <div className="ft-col">
          <h5>Resources</h5>
          <Link to="/docs">Gateway API</Link>
          <Link to="/account/information">Project Information</Link>
          <Link to="/dashboard">Translation History</Link>
          <Link to="/studio">Batch Studio</Link>
        </div>

        <div className="ft-col">
          <h5>Runtime</h5>
          <a href="#">FastAPI Gateway</a>
          <a href="#">DebackX Worker</a>
          <a href="#">PaddleOCR</a>
          <a href="#">NLLB 1.3B</a>
        </div>
      </div>

      <div className="ft-bot">
        <div className="ft-copy">© 2026 VieTrans Engine. All rights reserved. Made in Vietnam.</div>
        <div className="ft-links">
          <Link to="/docs">Docs</Link>
          <Link to="/studio">Studio</Link>
          <Link to="/dashboard">Dashboard</Link>
        </div>
      </div>
    </footer>
  );
};
