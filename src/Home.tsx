import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  const [profileImage, setProfileImage] = useState<string>(() => {
    return localStorage.getItem("/Base_Profile_Icon.png") || "/Base_Profile_Icon.png";
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem("playerName") || "Player";
  });

  useEffect(() => {
    // Reset to Home page background
    document.documentElement.style.background = "linear-gradient(to bottom, rgb(0, 26, 255), #4facfe, #d0f5f5)";

    return () => {
      document.documentElement.style.background = ""; // Clear on unmount
    };
  }, []);

  // Function to handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgUrl = URL.createObjectURL(e.target.files[0]);
      setProfileImage(imgUrl);
      localStorage.setItem("profileImage", imgUrl); // Save to localStorage
    }
  };

  // Function to handle name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerName(e.target.value);
    localStorage.setItem("playerName", e.target.value); // Save to localStorage
  };

  return (
    <div className='Container'>
      <div className='Title'>
        <h1>Alluminati</h1>
        {/* Display profile image */}
        <img src={profileImage} alt="Profile Icon" className="profile-img" />
        
        {/* Upload new image */}
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        
        {/* Change player name */}
        <input
          type="text"
          value={playerName}
          onChange={handleNameChange}
          placeholder="Enter your name"
        />
      </div>

      <div className='Start'>
        <h2>Welcome, {playerName}!</h2>
        <p>This is a simple app to expose wannabees.</p>

        <nav>
          <Link to="/lobby">
            <button>Join Game</button>
          </Link>
        </nav>
      </div>
    </div>
  );
}

export default Home;
