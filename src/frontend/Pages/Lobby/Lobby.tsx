import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../../../backend/Firebase/FirebaseConfig";
import {
  collection,
  setDoc,
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { NaughtyQuestions } from "../../../backend/data/Questions/Questions";
import "./Lobby.css";

function Lobby() {
  const [players, setPlayers] = useState<
    { id: string; name: string; image: string; isHost: boolean }[]
  >([]);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [inputLobbyId, setInputLobbyId] = useState("");
  const navigate = useNavigate();

  const playerName = localStorage.getItem("playerName") || "Player";
  const playerImage = localStorage.getItem("profileImage") || "/Base_Profile_Icon.png";

  function generateLobbyCode(length = 6) {
    const digits = "0123456789";
    let code = "";
    for (let i = 0; i < length; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  }

  function generateRandomQuestions(count = 20) {
    return [...NaughtyQuestions]
      .sort(() => 0.5 - Math.random())
      .slice(0, count);
  }

  const createLobby = async () => {
    try {
      let newLobbyId = "";
      let exists = true;

      while (exists) {
        newLobbyId = generateLobbyCode();
        const docRef = doc(db, "lobbies", newLobbyId);
        const docSnap = await getDoc(docRef);
        exists = docSnap.exists();
      }

      const lobbyRef = doc(db, "lobbies", newLobbyId);

      await setDoc(lobbyRef, {
        players: [
          {
            id: playerName,
            name: playerName,
            image: playerImage,
            lastSeen: Date.now(),
            isHost: true,
          },
        ],
        hostId: playerName,
        phase: "waiting",
        round: 0,
        questions: generateRandomQuestions(),
        votes: { A: 0, B: 0 },
      });

      setLobbyId(newLobbyId);
      console.log("Lobby created:", newLobbyId);
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

        const isAlreadyInLobby = existingPlayers.some(
          (p: any) => p.id === playerName
        );

        if (!isAlreadyInLobby) {
          const updatedPlayers = [
            ...existingPlayers,
            {
              id: playerName,
              name: playerName,
              image: playerImage,
              lastSeen: Date.now(),
              isHost: false,
            },
          ];

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

  useEffect(() => {
    if (!lobbyId) return;

    const unsubscribe = onSnapshot(doc(db, "lobbies", lobbyId), (docSnap) => {
      if (docSnap.exists()) {
        const lobbyData = docSnap.data();
        setPlayers(Array.isArray(lobbyData.players) ? lobbyData.players : []);
        if (lobbyData.phase === "voting") {
          navigate(`/game/${lobbyId}`);
        }
      }
    });

    return () => unsubscribe();
  }, [lobbyId, navigate]);

  useEffect(() => {
    if (!lobbyId || !playerName) return;

    const interval = setInterval(async () => {
      const lobbyRef = doc(db, "lobbies", lobbyId);
      const lobbySnap = await getDoc(lobbyRef);
      if (!lobbySnap.exists()) return;

      const data = lobbySnap.data();
      const currentPlayers = data.players || [];

      const updatedPlayers = currentPlayers.map((player: any) =>
        player.id === playerName
          ? { ...player, lastSeen: Date.now() }
          : player
      );

      await updateDoc(lobbyRef, { players: updatedPlayers });
    }, 5000);

    return () => clearInterval(interval);
  }, [lobbyId, playerName]);

  useEffect(() => {
    const handleUnload = async () => {
      if (!lobbyId || !playerName) return;

      const lobbyRef = doc(db, "lobbies", lobbyId);
      const lobbySnap = await getDoc(lobbyRef);
      if (!lobbySnap.exists()) return;

      const data = lobbySnap.data();
      const currentPlayers = data.players || [];

      const updatedPlayers = currentPlayers.filter(
        (player: any) => player.id !== playerName
      );

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

  const currentPlayer = players.find((p) => p.id === playerName);
  const isHost = currentPlayer?.isHost === true;

  const handleStartGame = async () => {
    if (!lobbyId || !isHost) return;
    const lobbyRef = doc(db, "lobbies", lobbyId);
    await updateDoc(lobbyRef, {
      phase: "voting",
      round: 0,
      votes: { A: 0, B: 0 },
    });
  };

  return (
    <div className="Container">
      <h1>Lobby</h1>

      <div className="player-list">
        {Array.isArray(players) &&
          players.map((player) => (
            <div key={player.id} className="player">
              <img src={player.image} alt={player.name} className="player-image" />
              <p>
                {player.name} {player.isHost ? "(Host)" : ""}
              </p>
            </div>
          ))}
      </div>

      {lobbyId ? (
        <div>
          <h3>
            Lobby Code: <strong>{lobbyId}</strong>
          </h3>
          <button onClick={() => navigator.clipboard.writeText(lobbyId)}>
            Copy Code
          </button>

          {isHost ? (
            <button onClick={handleStartGame}>Start Game</button>
          ) : (
            <p>Waiting for the host to start the game...</p>
          )}
        </div>
      ) : (
        <>
          <button onClick={createLobby}>Create Lobby</button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              joinLobby();
            }}
          >
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter Lobby Code"
              value={inputLobbyId}
              onChange={(e) => setInputLobbyId(e.target.value)}
            />
            <button type="submit">Join Lobby</button>
          </form>
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
