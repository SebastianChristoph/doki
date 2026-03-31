import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MapView from './components/MapView';
import AdminPanel from './components/AdminPanel';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapView />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}
