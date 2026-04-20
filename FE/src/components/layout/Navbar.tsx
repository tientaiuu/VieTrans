import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useAppStore();

  return (
    <nav>
      <Link to="/" className="logo-wrap">
        <span className="lw-vie">VIE</span>
        <span className="lw-trans">TRANS</span>
      </Link>

      <div className="nl">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'on' : ''}>Overview</NavLink>
        <NavLink to="/studio" className={({ isActive }) => isActive ? 'on' : ''}>Studio</NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'on' : ''}>Dashboard</NavLink>
        <NavLink to="/docs" className={({ isActive }) => isActive ? 'on' : ''}>API Docs</NavLink>
      </div>

      <div className="nr">
        <div className="nr-sig">System Operational</div>
        <button 
          className="thm-btn" 
          onClick={toggleTheme} 
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <Link to="/studio" className="nr-btn">Open Studio</Link>
      </div>
    </nav>
  );
};
