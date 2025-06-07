import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {

  const [showIntro, setShowIntro] = useState(true);


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

    const handleVideoEnd = () => {
    setShowIntro(false);
  };

  if (showIntro) {
    return (
      <div style={{ textAlign: 'center', marginTop: 50 }}>
        <video
          src="/Intro.mp4"
          autoPlay
          muted
          onEnded={handleVideoEnd}
          className='intro-video'
        />
      </div>
    );
  }


  return (
    <div className='Container'>
      <div className='Title'>
        <h1>Alluminati</h1>
        {/* Display profile image */}
        <img src={profileImage} alt="Profile Icon" className="profile-img" />
        
        {/* Upload new image */}
          
        <div>
          <input
          type="file"
          accept="image/*"
          className="Upload-img"
          style={{ display: 'none' }}
          id="profile-image-upload"
          onChange={handleImageUpload}
        />
        <button
          className="custom-upload-btn"
          onClick={() => {
            const input = document.getElementById('profile-image-upload');
            if (input) (input as HTMLInputElement).click();
          }}
        >
          Upload Image
        </button>
        <div>
                  {/* Change player name */}

        <label htmlFor="player-name" className='name-field'>Name: </label>

        <input
          type="text"
          id="player-name"
          value={playerName}
          onChange={handleNameChange}
          placeholder="Enter your name"
          className="name-field"
        />
        </div>
        </div>

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
