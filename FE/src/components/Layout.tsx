import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../stores/useAppStore';
import { Navbar } from './layout/Navbar';
import { Footer } from './layout/Footer';
import { CustomCursor } from './layout/CustomCursor';

export const Layout: React.FC = () => {
  const { theme } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const isStudio = location.pathname === '/studio';

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
      <CustomCursor />
      <Navbar />
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      {!isStudio && <Footer />}
    </div>
  );
};
