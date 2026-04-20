import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './features/home/HomePage';
import TranslatorPage from './features/translator/TranslatorPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="translator" element={<TranslatorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
