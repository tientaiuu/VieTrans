import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/Toast';
import { HomePage } from './features/home/HomePage';
import { StudioPage } from './features/studio/StudioPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { DocsPage } from './features/docs/DocsPage';
import { AuthPage } from './features/auth/AuthPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { AccountPage } from './features/account/AccountPage';
import { ActivityHistoryPage } from './features/account/ActivityHistoryPage';
import { SettingsPage } from './features/account/SettingsPage';
import { InformationPage } from './features/account/InformationPage';
import { PricingPage } from './features/pricing/PricingPage';
import { AboutPage } from './features/about/AboutPage';
import { ChangelogPage } from './features/changelog/ChangelogPage';
import { NotFoundPage } from './features/not-found/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      {/* Global toast notifications */}
      <ToastContainer />

      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="studio" element={<StudioPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="docs" element={<DocsPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="changelog" element={<ChangelogPage />} />
          <Route path="login" element={<AuthPage />} />
          <Route path="signup" element={<AuthPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="account/pricing" element={<PricingPage />} />
          <Route path="account/activity-history" element={<ActivityHistoryPage />} />
          <Route path="account/settings" element={<SettingsPage />} />
          <Route path="account/information" element={<InformationPage />} />
          {/* 404 catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

