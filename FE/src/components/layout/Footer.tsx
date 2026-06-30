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
            The only in-image translation engine designed for complex visual context and background reconstruction.
          </p>
        </div>

        <div className="ft-col">
          <h5>Platform</h5>
          <Link to="/">Overview</Link>
          <Link to="/studio">Studio</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/docs">API Documentation</Link>
          <Link to="/pricing">Pricing</Link>
        </div>

        <div className="ft-col">
          <h5>Company</h5>
          <Link to="/about">About</Link>
          <Link to="/changelog">Changelog</Link>
          <a href="mailto:hello@vietrans.app">Contact</a>
          <a href="https://status.vietrans.app" target="_blank" rel="noopener noreferrer">Status</a>
        </div>

        <div className="ft-col">
          <h5>Connect</h5>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter / X</a>
          <a href="https://discord.gg" target="_blank" rel="noopener noreferrer">Discord</a>
          <a href="mailto:hello@vietrans.app">Email</a>
        </div>
      </div>

      <div className="ft-bot">
        <div className="ft-copy">© 2026 VieTrans Engine. All rights reserved. Made in Vietnam.</div>
        <div className="ft-links">
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://discord.gg" target="_blank" rel="noopener noreferrer">Discord</a>
        </div>
      </div>
    </footer>
  );
};
