import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainPage from './MainPage';
import DisplayOnly from './DisplayOnly';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/:stopId" element={<DisplayOnly />} />
    </Routes>
  );
}

export default App;
