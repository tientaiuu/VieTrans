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
        </div>

        <div className="ft-col">
          <h5>Resources</h5>
          <a href="#">Status Page</a>
          <a href="#">Changelog</a>
          <a href="#">Community</a>
          <a href="#">Support</a>
        </div>

        <div className="ft-col">
          <h5>Legal</h5>
          <a href="#">Terms of Service</a>
          <a href="#">Privacy Policy</a>
          <a href="#">SOC 2 Compliance</a>
          <a href="#">ISO 27001</a>
        </div>
      </div>

      <div className="ft-bot">
        <div className="ft-copy">© 2026 VieTrans Engine. All rights reserved. Made in Vietnam.</div>
        <div className="ft-links">
          <a href="#">Twitter</a>
          <a href="#">GitHub</a>
          <a href="#">Discord</a>
        </div>
      </div>
    </footer>
  );
};
