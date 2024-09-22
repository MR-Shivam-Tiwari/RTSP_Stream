import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Home from './Component/Home';
import LiveStream from './Component/LiveStream';


function App() {
  
  return (
    <Router>
      <div className='lexend-bold'>
        {/* Navbar */}
        

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Home  />} />
          <Route path="/livestream/:videoUrl" element={<LiveStream />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
