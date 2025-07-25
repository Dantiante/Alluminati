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
  deleteDoc,
  getDocs
} from "firebase/firestore";
import "./Lobby.css";

function Lobby() {
  const [players, setPlayers] = useState<{ id: string; name: string; image: string }[]>([]);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [inputLobbyId, setInputLobbyId] = useState(""); // For joining a lobby

  const playerName = localStorage.getItem("playerName") || "Player";
  const playerImage = localStorage.getItem("profileImage") || "/Base_Profile_Icon.png";

  const createLobby = async () => {
    try {
      // Create a new lobby document with auto-generated ID
      const newLobbyRef = await addDoc(collection(db, "lobbies"), {
        players: [{ id: playerName, name: playerName, image: playerImage, lastSeen: Date.now() }],
      });

      const newLobbyId = newLobbyRef.id; // Use the Firestore document ID as the lobby ID
      console.log("Lobby created:", newLobbyId);

      setLobbyId(newLobbyId); // Set lobbyId so the component listens to updates
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
        setLobbyId(inputLobbyId); // Set lobbyId before updating Firestore

        const lobbyData = lobbyDoc.data();
        const existingPlayers = lobbyData.players || [];

        // Check if player already exists
        const isAlreadyInLobby = existingPlayers.some((p: any) => p.id === playerName);
        if (!isAlreadyInLobby) {
          const updatedPlayers = [...existingPlayers, { id: playerName, name: playerName, image: playerImage, lastSeen: Date.now() }];

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

  // Listen to lobby document updates to get the current player list
  useEffect(() => {
    if (!lobbyId) return;

    console.log("Listening for changes in lobby:", lobbyId);

    const unsubscribe = onSnapshot(doc(db, "lobbies", lobbyId), (docSnap) => {
      if (docSnap.exists()) {
        const lobbyData = docSnap.data();
        console.log("Lobby updated:", lobbyData);

        setPlayers(Array.isArray(lobbyData.players) ? lobbyData.players : []);
      }
    });

    return () => unsubscribe();
  }, [lobbyId]);

  // Heartbeat: update this player's lastSeen every 5 seconds
  useEffect(() => {
    if (!lobbyId || !playerName) return;

    const interval = setInterval(async () => {
      const lobbyRef = doc(db, "lobbies", lobbyId);
      const lobbySnap = await getDoc(lobbyRef);
      if (!lobbySnap.exists()) return;

      const data = lobbySnap.data();
      const currentPlayers = data.players || [];

      const updatedPlayers = currentPlayers.map((player: any) =>
        player.id === playerName ? { ...player, lastSeen: Date.now() } : player
      );

      await updateDoc(lobbyRef, { players: updatedPlayers });
    }, 5000);

    return () => clearInterval(interval);
  }, [lobbyId, playerName]);

  // Remove stale players who haven't updated lastSeen in 15 seconds
  const removeStalePlayers = async () => {
    if (!lobbyId) return;

    const lobbyRef = doc(db, "lobbies", lobbyId);
    const lobbySnap = await getDoc(lobbyRef);
    if (!lobbySnap.exists()) return;

    const data = lobbySnap.data();
    const currentPlayers = data.players || [];

    const now = Date.now();
    const timeout = 15 * 1000; // 15 seconds

    const activePlayers = currentPlayers.filter((player: any) => now - player.lastSeen <= timeout);

    if (activePlayers.length !== currentPlayers.length) {
      if (activePlayers.length === 0) {
        // Delete lobby if no players remain
        await deleteDoc(lobbyRef);
        console.log("Lobby deleted because no active players remain.");
      } else {
        // Update lobby with active players only
        await updateDoc(lobbyRef, { players: activePlayers });
        console.log("Removed stale players from lobby.");
      }
    }
  };

  // Run the stale player cleanup every 10 seconds
  useEffect(() => {
    if (!lobbyId) return;

    const interval = setInterval(() => {
      removeStalePlayers().catch(console.error);
    }, 10000);

    return () => clearInterval(interval);
  }, [lobbyId]);

  // Cleanup on tab/window close: remove this player from lobby
  useEffect(() => {
    const handleUnload = async () => {
      if (!lobbyId || !playerName) return;

      const lobbyRef = doc(db, "lobbies", lobbyId);
      const lobbySnap = await getDoc(lobbyRef);
      if (!lobbySnap.exists()) return;

      const data = lobbySnap.data();
      const currentPlayers = data.players || [];

      const updatedPlayers = currentPlayers.filter((player: any) => player.id !== playerName);

      if (updatedPlayers.length === 0) {
        await deleteDoc(lobbyRef);
        console.log("Lobby deleted because it was empty.");
      } else {
        await updateDoc(lobbyRef, { players: updatedPlayers });
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [lobbyId, playerName]);

  // Periodic cleanup of empty lobbies every 15 minutes
  const cleanupEmptyLobbies = async () => {
    try {
      const lobbiesSnapshot = await getDocs(collection(db, "lobbies"));

      for (const lobby of lobbiesSnapshot.docs) {
        const data = lobby.data();
        const players = data.players || [];

        if (Array.isArray(players) && players.length === 0) {
          await deleteDoc(doc(db, "lobbies", lobby.id));
          console.log(`🧹 Deleted empty lobby: ${lobby.id}`);
        }
      }
    } catch (error) {
      console.error("❌ Error cleaning empty lobbies:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      cleanupEmptyLobbies();
    }, 15 * 60 * 1000);

    cleanupEmptyLobbies();

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="Container">
      <h1>Lobby</h1>

      {/* Display all joined players */}
      <div className="player-list">
        {Array.isArray(players) &&
          players.map((player) => (
            <div key={player.id} className="player">
              <img src={player.image} alt={player.name} className="player-image" />
              <p>{player.name}</p>
            </div>
          ))}
      </div>

      {/* Show Lobby ID if created */}
      {lobbyId ? (
        <div>
          <h3>
            Lobby Code: <strong>{lobbyId}</strong>
          </h3>
          <button onClick={() => navigator.clipboard.writeText(lobbyId)}>Copy Code</button>
          <Link to="/game">
            <button>Start Game</button>
          </Link>
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
