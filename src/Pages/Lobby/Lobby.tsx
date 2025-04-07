import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../../Firebase/FirebaseConfig";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import "./Lobby.css";

function Lobby() {
  const [players, setPlayers] = useState<{ id: string; name: string; image: string }[]>([]);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [inputLobbyId, setInputLobbyId] = useState(""); // For joining a lobby

  const playerName = localStorage.getItem("playerName") || "Player";
  const playerImage = localStorage.getItem("profileImage") || "/Base_Profile_Icon.png";

  // Generate a random unique lobby ID
  const generateLobbyId = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let newLobbyId = "";
    for (let i = 0; i < 8; i++) {
      newLobbyId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return newLobbyId;
  };

  const createLobby = async () => {
    try {
      const newLobbyId = generateLobbyId();
      const newLobby = {
        lobbyId: newLobbyId,
        players: [{ id: playerName, name: playerName, image: playerImage }],
      };

      await addDoc(collection(db, "lobbies"), newLobby);
      console.log("Lobby created:", newLobbyId);

      setLobbyId(newLobbyId); // ✅ Set lobbyId first, so onSnapshot will listen
    } catch (error) {
      console.error("Error creating lobby:", error);
    }
  };

  const joinLobby = async () => {
    if (!inputLobbyId) return;

    try {
      const lobbyRef = doc(db, "lobbies", inputLobbyId);
      const lobbyDoc = await getDoc(lobbyRef);

      if (lobbyDoc.exists()) {
        setLobbyId(inputLobbyId); // ✅ Set lobbyId before updating Firestore

        const lobbyData = lobbyDoc.data();
        const existingPlayers = lobbyData.players || [];

        // Check if player already exists
        const isAlreadyInLobby = existingPlayers.some((p: any) => p.id === playerName);
        if (!isAlreadyInLobby) {
          const updatedPlayers = [...existingPlayers, { id: playerName, name: playerName, image: playerImage }];

          await updateDoc(lobbyRef, { players: updatedPlayers });
          console.log("Joined lobby:", inputLobbyId);
        } else {
          console.log("Player already in the lobby.");
        }
      } else {
        console.error("Lobby not found.");
      }
    } catch (error) {
      console.error("Error joining lobby:", error);
    }
  };

  // Listen for lobby updates (Real-time)
  useEffect(() => {
    if (!lobbyId) return;

    console.log("Listening for changes in lobby:", lobbyId);

    const unsubscribe = onSnapshot(doc(db, "lobbies", lobbyId), (docSnap) => {
      if (docSnap.exists()) {
        const lobbyData = docSnap.data();
        console.log("Lobby updated:", lobbyData);
        setPlayers(lobbyData.players || []);
      }
    });

    return () => unsubscribe();
  }, [lobbyId]);

  useEffect(() => {
    if (!lobbyId || !playerName) return;
  
    const interval = setInterval(async () => {
      const playerRef = doc(db, "lobbies", lobbyId);
      await updateDoc(playerRef, {
        [`players.${playerName}.lastSeen`]: Date.now()
      });
    }, 5000);
  
    return () => clearInterval(interval);
  }, [lobbyId, playerName]);

  useEffect(() => {
    if (!lobbyId) return;
  
    const unsubscribe = onSnapshot(doc(db, "lobbies", lobbyId), (docSnap) => {
      if (docSnap.exists()) {
        const lobbyData = docSnap.data();
        const allPlayers = lobbyData.players || {};
  
        const now = Date.now();
        const activePlayers = Object.entries(allPlayers)
          .filter(([_, p]: any) => now - p.lastSeen < 15000) // 15 sec timeout
          .map(([id, p]: any) => ({
            id,
            name: p.playerName,
            image: p.playerImage,
          }));
  
        setPlayers(activePlayers);
      }
    });
  
    return () => unsubscribe();
  }, [lobbyId]);  
  

  return (
    <div className="Container">
      <h1>Lobby</h1>

      {/* Display all joined players */}
      <div className="player-list">
        {players.map((player) => (
          <div key={player.id} className="player">
            <img src={player.image} alt={player.name} className="player-image" />
            <p>{player.name}</p>
          </div>
        ))}
      </div>

      {/* Show Lobby ID if created */}
      {lobbyId ? (
        <div>
          <h3>Lobby Code: <strong>{lobbyId}</strong></h3>
          <button onClick={() => navigator.clipboard.writeText(lobbyId)}>Copy Code</button>
        </div>
      ) : (
        <>
          <button onClick={createLobby}>Create Lobby</button>
          <input
            type="text"
            placeholder="Enter Lobby Code"
            value={inputLobbyId}
            onChange={(e) => setInputLobbyId(e.target.value)}
          />
          <button onClick={joinLobby}>Join Lobby</button>
        </>
      )}

      <nav>
        <Link to="/">
          <button>Go Back to Home</button>
        </Link>
      </nav>
    </div>
  );
}

export default Lobby;
