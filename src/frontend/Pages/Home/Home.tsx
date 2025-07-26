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

  const [isUploading] = useState(false);


  useEffect(() => {
    // Reset to Home page background
    document.documentElement.style.background = "linear-gradient(to bottom, rgb(0, 26, 255), #4facfe, #d0f5f5)";

    return () => {
      document.documentElement.style.background = ""; // Clear on unmount
    };
  }, []);
// 2b53a3358800057b5470efaaef387be4
const uploadToImgBB = async (file: File) => {
  const apiKey = "2b53a3358800057b5470efaaef387be4"; // replace this with your actual key

  // Convert file to base64 string
  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Remove the data:image/*;base64, prefix
          resolve(reader.result.split(",")[1]);
        } else {
          reject("Failed to convert file to base64.");
        }
      };
      reader.onerror = error => reject(error);
    });

  try {
    const base64Image = await toBase64(file);

    const formData = new FormData();
    formData.append("key", apiKey);
    formData.append("image", base64Image);

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      console.log("ImgBB upload success:", data.data.url);
      return data.data.url; // This is your uploaded image URL
    } else {
      console.error("ImgBB upload failed:", data);
      return null;
    }
  } catch (error) {
    console.error("Error uploading to ImgBB:", error);
    return null;
  }
};




  // Function to handle image upload
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];

    const uploadedImageUrl = await uploadToImgBB(file);

    if (uploadedImageUrl) {
      setProfileImage(uploadedImageUrl);
      localStorage.setItem("profileImage", uploadedImageUrl);
    }
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

  useEffect(() => {
  const timeout = setTimeout(() => {
    setShowIntro(false); // skip intro if video doesn't start after 5 seconds
  }, 5000);

  return () => clearTimeout(timeout);
}, []);

  if (showIntro) {
    return (
      <div style={{ textAlign: 'center', marginTop: 50 }}>
        <video
          src="/Intro.mp4"
          autoPlay
          muted
          playsInline
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
            <button disabled={isUploading}>
              {isUploading ? "Uploading..." : "Join Game"}
            </button>
          </Link>

        </nav>
      </div>
    </div>
  );
}

export default Home;
