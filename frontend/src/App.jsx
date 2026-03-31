import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MapView from './components/MapView';
import AdminPanel from './components/AdminPanel';
import PhotoDetailPage from './components/PhotoDetailPage';
import Impressum from './components/Impressum';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapView />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/photo/:id" element={<PhotoDetailPage />} />
        <Route path="/impressum" element={<Impressum />} />
      </Routes>
    </BrowserRouter>
  );
}
