import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./frontend/Pages/Home/Home";
import Lobby from "./frontend/Pages/Lobby/Lobby";
import Game from "./frontend/Pages/Game/Game";

// 🎨 Function to generate random gradient colors
function getRandomGradient() {
  const colors = [
    ["#ff5f6d", "#ffc371"], // Pink to Orange
    ["#4facfe", "#d0f5f5"], // Blue to Light Blue
    ["#00c6ff", "#0072ff"], // Light Blue to Dark Blue
    ["#ffafbd", "#ffc3a0"], // Pink to Peach
    ["#00d2ff", "#3a7bd5"], // Light Blue to Darker Blue
    ["#ff758c", "#ff7eb3"], // Pink to Light Pink
    ["#f12711", "#f5af19"], // Red to Yellow
    ["#00c6ff", "#f0e130"], // Light Blue to Yellow
    ["#a8caba", "#3ad59f"], // Greenish Gradient
    ["#dce35b", "#45a247"], // Green to Dark Green
  ];
  
  const randomIndex = Math.floor(Math.random() * colors.length);
  return `linear-gradient(to bottom, ${colors[randomIndex][0]}, ${colors[randomIndex][1]})`;
}

function AppRouter() {
  const location = useLocation();
  const [background, setBackground] = useState(getRandomGradient()); // Store background color in state

  useEffect(() => {
    setBackground(getRandomGradient()); // Change background when the route changes
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.background = background;
  }, [background]); // Apply background whenever it updates

  return (
    <div id="page-content" className="visible">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="*" element={<Home />} /> {/* Redirect to Home for any unknown routes */}
        <Route path="/game/:lobbyId" element={<Game/>} />
      </Routes>
    </div>
  );
}

export default AppRouter;
