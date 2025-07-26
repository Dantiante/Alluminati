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
  const [inputLobbyId, setInputLobbyId] = useState("");

  const playerName = localStorage.getItem("playerName") || "Player";
  const playerImage = localStorage.getItem("profileImage") || "/Base_Profile_Icon.png";

  const createLobby = async () => {
    try {
      const newLobbyRef = await addDoc(collection(db, "lobbies"), {
        players: [{ id: playerName, name: playerName, image: playerImage, lastSeen: Date.now() }],
      });
      setLobbyId(newLobbyRef.id);
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
        setLobbyId(inputLobbyId);

        const lobbyData = lobbyDoc.data();
        const existingPlayers = lobbyData.players || [];

        const isAlreadyInLobby = existingPlayers.some((p: any) => p.id === playerName);
        if (!isAlreadyInLobby) {
          const updatedPlayers = [
            ...existingPlayers,
            { id: playerName, name: playerName, image: playerImage, lastSeen: Date.now() },
          ];
          await updateDoc(lobbyRef, { players: updatedPlayers });
        }
      } else {
        console.error("Lobby not found.");
      }
    } catch (error) {
      console.error("Error joining lobby:", error);
    }
  };

  // 🔁 Listen to lobby updates and remove stale players
  useEffect(() => {
    if (!lobbyId) return;

    const unsubscribe = onSnapshot(doc(db, "lobbies", lobbyId), async (docSnap) => {
      if (!docSnap.exists()) return;

      const lobbyData = docSnap.data();
      const allPlayers = Array.isArray(lobbyData.players) ? lobbyData.players : [];

      const now = Date.now();
      const timeout = 10000; // 10 seconds timeout

      const activePlayers = allPlayers.filter(
        (p: any) => now - p.lastSeen <= timeout
      );

      // If someone is stale, update Firestore
      if (activePlayers.length !== allPlayers.length) {
        const lobbyRef = doc(db, "lobbies", lobbyId);
        await updateDoc(lobbyRef, { players: activePlayers });
        console.log("⏳ Removed stale players.");
      }

      setPlayers(activePlayers);
    });

    return () => unsubscribe();
  }, [lobbyId]);

  // ⏱ Heartbeat: update our own lastSeen every 5 seconds
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

  // 🧹 Remove player on tab close
  useEffect(() => {
    const handleUnload = async () => {
      if (!lobbyId || !playerName) return;

      const lobbyRef = doc(db, "lobbies", lobbyId);
      const lobbySnap = await getDoc(lobbyRef);
      if (!lobbySnap.exists()) return;

      const data = lobbySnap.data();
      const currentPlayers = data.players || [];

      const updatedPlayers = currentPlayers.filter((p: any) => p.id !== playerName);

      if (updatedPlayers.length === 0) {
        await deleteDoc(lobbyRef);
      } else {
        await updateDoc(lobbyRef, { players: updatedPlayers });
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [lobbyId, playerName]);

  // 🧽 Optional: Periodic cleanup of fully empty lobbies
  useEffect(() => {
    const cleanupEmptyLobbies = async () => {
      const lobbiesSnapshot = await getDocs(collection(db, "lobbies"));
      for (const lobby of lobbiesSnapshot.docs) {
        const data = lobby.data();
        const players = data.players || [];
        if (Array.isArray(players) && players.length === 0) {
          await deleteDoc(doc(db, "lobbies", lobby.id));
        }
      }
    };

    const interval = setInterval(cleanupEmptyLobbies, 15 * 60 * 1000);
    cleanupEmptyLobbies(); // Run on load
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="Container">
      <h1>Lobby</h1>

      <div className="player-list">
        {players.map((player) => (
          <div key={player.id} className="player">
            <img src={player.image} alt={player.name} className="player-image" />
            <p>{player.name}</p>
          </div>
        ))}
      </div>

      {lobbyId ? (
        <div>
          <h3>Lobby Code: <strong>{lobbyId}</strong></h3>
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
