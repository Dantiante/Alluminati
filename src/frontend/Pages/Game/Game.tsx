import { useEffect, useState, useRef } from "react";
import { db } from "../../../backend/Firebase/FirebaseConfig";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { useParams } from "react-router-dom";
import "./Game.css";

const TOTAL_ROUNDS = 20;
const VOTING_DURATION = 30000;
const STALE_PLAYER_TIMEOUT = 60 * 1000;

function Game() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<"waiting" | "voting" | "results">("waiting");
  const [selected, setSelected] = useState<"A" | "B" | null>(null);
  const [votes, setVotes] = useState<{ A: string[]; B: string[] }>({ A: [], B: [] });
  const [hostId, setHostId] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [personA, setPersonA] = useState<string | null>(null);
  const [personB, setPersonB] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(Math.ceil(VOTING_DURATION / 1000));
  const [voteEndsAt, setVoteEndsAt] = useState<number | null>(null);

  const playerName = localStorage.getItem("playerName") || "Player";
  const currentPlayerId = playerName;
  const voteLocked = useRef(false);
  const resultsTriggered = useRef(false);
  const prevPhase = useRef<string | null>(null);

  if (!lobbyId) return <div>Invalid lobby ID.</div>;

  const lobbyRef = doc(db, "lobbies", lobbyId);

  // Find player object by name
  const findPlayerByName = (name: string | null, playersList: any[]) => {
    return playersList.find((p) => p.name === name) || null;
  };

  // Derived player objects for display and images, fallback gracefully
  const playerAObj = findPlayerByName(personA, players) || players[0] || null;
  const playerBObj = findPlayerByName(personB, players) || players[1] || null;

  useEffect(() => {
    const unsubscribe = onSnapshot(lobbyRef, (docSnap) => {
      const data = docSnap.data();
      if (data) {
        setQuestions(data.questions || []);
        setCurrentRound(data.round ?? 0);
        setPhase(data.phase ?? "waiting");
        setVotes({
          A: Array.isArray(data.votes?.A) ? data.votes.A : [],
          B: Array.isArray(data.votes?.B) ? data.votes.B : [],
        });
        setHostId(data.hostId || null);
        setPlayers(data.players || []);
        setPersonA(data.personA || null);
        setPersonB(data.personB || null);
        setVoteEndsAt(typeof data.voteEndsAt === "number" ? data.voteEndsAt : null);

        console.log("[onSnapshot] Lobby data:", data);

        if (data.phase === "voting" && prevPhase.current !== "voting") {
          voteLocked.current = false;
          resultsTriggered.current = false;
          setSelected(null);
          const allPlayers = data.players || [];
          console.log("[Round Start] Players in lobby:", allPlayers.map((p: { name: any }) => p.name));
        }

        prevPhase.current = data.phase;
      }
    });

    return () => unsubscribe();
  }, [lobbyId]);

  useEffect(() => {
    const updatePresence = async () => {
      try {
        await runTransaction(db, async (transaction) => {
          const lobbySnap = await transaction.get(lobbyRef);
          if (!lobbySnap.exists()) return;

          const playersInLobby = lobbySnap.data().players || [];
          const updatedPlayers = playersInLobby.map((player: { id: string; lastSeen?: number }) =>
            player.id === currentPlayerId ? { ...player, lastSeen: Date.now() } : player
          );

          transaction.update(lobbyRef, { players: updatedPlayers });
        });
      } catch (error) {
        console.error("[Game Presence] Failed to update last seen:", error);
      }
    };

    updatePresence();
    const interval = window.setInterval(updatePresence, 5000);
    return () => window.clearInterval(interval);
  }, [lobbyId, currentPlayerId]);

  useEffect(() => {
    const removePlayerFromLobby = async () => {
      try {
        await runTransaction(db, async (transaction) => {
          const lobbySnap = await transaction.get(lobbyRef);
          if (!lobbySnap.exists()) return;

          const data = lobbySnap.data();
          const remainingPlayers = (data.players || []).filter(
            (player: { id: string }) => player.id !== currentPlayerId
          );

          if (remainingPlayers.length === 0) {
            transaction.delete(lobbyRef);
          } else {
            transaction.update(lobbyRef, { players: remainingPlayers });
          }
        });
      } catch (error) {
        console.error("[Game Exit] Failed to remove player:", error);
      }
    };

    window.addEventListener("pagehide", removePlayerFromLobby);
    return () => {
      window.removeEventListener("pagehide", removePlayerFromLobby);
    };
  }, [lobbyId, currentPlayerId]);

  useEffect(() => {
    if (playerName !== hostId) return;

    const cleanupEmptyLobbies = async () => {
      try {
        const lobbiesSnapshot = await getDocs(collection(db, "lobbies"));
        console.log(`[Host Cleanup] Read ${lobbiesSnapshot.size} lobbies.`);

        for (const lobby of lobbiesSnapshot.docs) {
          const lobbyRef = doc(db, "lobbies", lobby.id);
          await runTransaction(db, async (transaction) => {
            const currentLobby = await transaction.get(lobbyRef);
            if (!currentLobby.exists()) return;

            const playersInLobby = currentLobby.data().players || [];
            const now = Date.now();
            const activePlayers = playersInLobby.filter(
              (player: { lastSeen?: number }) =>
                typeof player.lastSeen === "number" && now - player.lastSeen <= STALE_PLAYER_TIMEOUT
            );

            if (activePlayers.length === 0) {
              transaction.delete(lobbyRef);
              console.log(`[Host Cleanup] Deleted stale lobby: ${lobby.id}`);
            } else if (activePlayers.length !== playersInLobby.length) {
              transaction.update(lobbyRef, { players: activePlayers });
              console.log(`[Host Cleanup] Removed stale players: ${lobby.id}`);
            }
          });
        }
      } catch (error) {
        console.error("[Host Cleanup] Failed to clean empty lobbies:", error);
      }
    };

    cleanupEmptyLobbies();
    const interval = window.setInterval(cleanupEmptyLobbies, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [playerName, hostId]);

  useEffect(() => {
    if (phase !== "voting") {
      setTimeLeft(Math.ceil(VOTING_DURATION / 1000));
      return;
    }

    if (!voteEndsAt) {
      setTimeLeft(0);
      return;
    }

    const updateCountdown = () => {
      const remainingMs = voteEndsAt - Date.now();
      const nextValue = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(nextValue);

      if (nextValue <= 0 && playerName === hostId) {
        console.log("[Voting Timer] Time's up. Moving to results.");
        updateDoc(lobbyRef, { phase: "results" }).catch(console.error);
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(timer);
  }, [phase, voteEndsAt, playerName, hostId]);

  useEffect(() => {
    if (phase !== "voting" || playerName !== hostId || players.length === 0) {
      return;
    }

    const uniqueVoters = new Set([...votes.A, ...votes.B]);
    if (uniqueVoters.size < players.length || resultsTriggered.current) {
      return;
    }

    resultsTriggered.current = true;
    updateDoc(lobbyRef, { phase: "results" }).catch((error) => {
      resultsTriggered.current = false;
      console.error("[Voting] Failed to move to results:", error);
    });
  }, [phase, playerName, hostId, players, votes]);

  const handleVote = (choice: "A" | "B") => {
    if (voteLocked.current || selected !== null) {
      console.log("[handleVote] Vote already submitted. Ignoring.");
      return;
    }

    const hasVotedAlready = votes.A.includes(currentPlayerId) || votes.B.includes(currentPlayerId);
    if (hasVotedAlready) {
      voteLocked.current = true;
      setSelected(choice === "A" ? "A" : "B");
      console.log("[handleVote] Player has already voted this round.");
      return;
    }

    voteLocked.current = true;
    setSelected(choice);

    updateDoc(lobbyRef, {
      [`votes.${choice}`]: arrayUnion(currentPlayerId),
    })
      .then(() => {
        const votedFor = choice === "A" ? playerAObj?.name : playerBObj?.name;
        console.log(`[handleVote] Vote recorded for: ${votedFor}`);
      })
      .catch((error) => console.error("[handleVote] Failed to vote:", error));
  };

  const pickTwoDistinctPlayers = (playerList: any[]) => {
    const shuffled = [...playerList].sort(() => 0.5 - Math.random());
    console.log("[pickTwoDistinctPlayers] Pool:", shuffled.map(p => p.name));
    if (shuffled.length < 2) {
      return {
        personA: shuffled[0]?.name || "Player A",
        personB: shuffled[0]?.name || "Player B",
      };
    }
    return {
      personA: shuffled[0].name,
      personB: shuffled[1].name,
    };
  };

  const handleNextRound = async () => {
    if (playerName !== hostId) {
      console.log("[handleNextRound] Ignored — not host.");
      return;
    }

    const docSnap = await getDoc(lobbyRef);
    const data = docSnap.data();
    const currentPlayers = data?.players || [];

    if (currentRound + 1 >= TOTAL_ROUNDS) {
      alert("Game over!");
      return;
    }

    const { personA: nextPersonA, personB: nextPersonB } = pickTwoDistinctPlayers(currentPlayers);

    await updateDoc(lobbyRef, {
      round: currentRound + 1,
      phase: "voting",
      votes: { A: [], B: [] },
      voteEndsAt: Date.now() + VOTING_DURATION,
      personA: nextPersonA,
      personB: nextPersonB,
    });

    console.log("[handleNextRound] New round started with:", nextPersonA, "vs", nextPersonB);
    setSelected(null);
    voteLocked.current = false;
  };

  const handleStartGame = async () => {
    if (playerName !== hostId) return;

    const docSnap = await getDoc(lobbyRef);
    const lobbyData = docSnap.data();
    const currentPlayers = lobbyData?.players || [];

    if (currentPlayers.length < 2) {
      console.warn("[handleStartGame] Not enough players to start.");
      return;
    }

    const personA = currentPlayers[0].name;
    const personB = currentPlayers[1].name;

    const shuffledQuestions = [...questions].sort(() => 0.5 - Math.random()).slice(0, TOTAL_ROUNDS);

    console.log("[handleStartGame] First round players:", personA, "vs", personB);

    await updateDoc(lobbyRef, {
      questions: shuffledQuestions,
      round: 0,
      phase: "voting",
      votes: { A: [], B: [] },
      voteEndsAt: Date.now() + VOTING_DURATION,
      personA,
      personB,
    });

    console.log("[handleStartGame] Game started.");
  };

  if (questions.length === 0 && phase !== "waiting") {
    return <div>Loading questions...</div>;
  }

  return (
    <div className="game-container">
      {phase === "waiting" && playerName === hostId && (
        <button onClick={handleStartGame}>Start Game</button>
      )}

      {phase !== "waiting" && (
        <>
          <h1>Round {currentRound + 1} / {TOTAL_ROUNDS}</h1>
          <h2>{questions[currentRound]}</h2>

          {phase === "voting" && (
            <div className="choices">
              <div className="vote-timer">Time left: {timeLeft}s</div>
              <button onClick={() => handleVote("A")} disabled={selected !== null} className="choice-button">
                {playerAObj ? (
                  <>
                    <img src={playerAObj.image} alt={playerAObj.name} className="player-image" />
                    <span>{playerAObj.name}</span>
                  </>
                ) : (
                  "Person A"
                )}
              </button>

              <button onClick={() => handleVote("B")} disabled={selected !== null} className="choice-button">
                {playerBObj ? (
                  <>
                    <img src={playerBObj.image} alt={playerBObj.name} className="player-image" />
                    <span>{playerBObj.name}</span>
                  </>
                ) : (
                  "Person B"
                )}
              </button>

              {selected && (
                <p>You voted for: {selected === "A" ? playerAObj?.name || "Person A" : playerBObj?.name || "Person B"}</p>
              )}
            </div>
          )}

          {phase === "results" && (
            <div>
              <h3>Results:</h3>
              <p>{playerAObj?.name || "Person A"}: {votes.A.length} vote(s)</p>
              <p>{playerBObj?.name || "Person B"}: {votes.B.length} vote(s)</p>
              {playerName === hostId && (
                <button onClick={handleNextRound}>Next Round</button>
              )}
            </div>
          )}
        </>
      )}

      {phase === "waiting" && playerName !== hostId && (
        <p>Waiting for the host to start the game...</p>
      )}
    </div>
  );
}

export default Game;
