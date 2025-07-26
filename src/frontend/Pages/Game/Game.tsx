import { useEffect, useState, useRef } from "react";
import { db } from "../../../backend/Firebase/FirebaseConfig";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";
import "./Game.css";

const TOTAL_ROUNDS = 20;
const VOTING_DURATION = 15000; // 15 seconds

function Game() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<"waiting" | "voting" | "results">("waiting");
  const [selected, setSelected] = useState<string | null>(null);
  const [votes, setVotes] = useState<{ A: number; B: number }>({ A: 0, B: 0 });
  const [hostId, setHostId] = useState<string | null>(null);

  const playerName = localStorage.getItem("playerName") || "Player";

  // Ref to block multiple votes instantly on click
  const voteLocked = useRef(false);

  if (!lobbyId) {
    return <div>Invalid lobby ID.</div>;
  }

  const lobbyRef = doc(db, "lobbies", lobbyId);

  // Listen to lobby data and update state
const prevPhase = useRef<string | null>(null);

useEffect(() => {
  const unsubscribe = onSnapshot(lobbyRef, (docSnap) => {
    const data = docSnap.data();
    if (data) {
      setQuestions(data.questions || []);
      setCurrentRound(data.round ?? 0);
      setPhase(data.phase ?? "waiting");
      setVotes(data.votes || { A: 0, B: 0 });
      setHostId(data.hostId || null);

      // Only reset when phase changes from something else to 'voting'
      if (data.phase === "voting" && prevPhase.current !== "voting") {
        setSelected(null);
        voteLocked.current = false;
        console.log("[onSnapshot] Phase changed to voting, resetting selection and vote lock.");
      }
      prevPhase.current = data.phase;
    }
  });
  return () => unsubscribe();
}, [lobbyId]);


  // Auto-transition from voting to results phase (host only)
  useEffect(() => {
    if (phase === "voting" && playerName === hostId) {
      console.log("[useEffect] Starting voting timer for 15 seconds.");
      const timer = setTimeout(() => {
        console.log("[Timer] Voting duration ended, moving to results phase.");
        updateDoc(lobbyRef, { phase: "results" }).catch(console.error);
      }, VOTING_DURATION);
      return () => {
        console.log("[useEffect] Clearing voting timer.");
        clearTimeout(timer);
      };
    }
  }, [phase, playerName, hostId]);

  // Vote handler
  const handleVote = (choice: "A" | "B") => {
    console.log("[handleVote] Vote attempt for choice:", choice);
    if (voteLocked.current) {
      console.log("[handleVote] Vote blocked: already voted.");
      return; // Block if already voted
    }
    if (selected !== null) {
      console.log("[handleVote] Vote blocked: selected state already set.");
      return;
    }

    voteLocked.current = true; // Lock immediately
    setSelected(choice);

    const field = `votes.${choice}`;
    updateDoc(lobbyRef, {
      [field]: votes[choice] + 1,
    })
      .then(() => console.log(`[handleVote] Vote recorded for Person ${choice}`))
      .catch((error) => console.error("[handleVote] Failed to record vote:", error));
  };

  // Host advances to next round
  const handleNextRound = () => {
    if (playerName !== hostId) {
      console.log("[handleNextRound] Ignored: not host");
      return;
    }

    if (currentRound + 1 >= TOTAL_ROUNDS) {
      alert("Game over! Returning to lobby.");
      // TODO: Navigate back or reset game here
      return;
    }

    console.log("[handleNextRound] Advancing to next round:", currentRound + 1);
    updateDoc(lobbyRef, {
      round: currentRound + 1,
      phase: "voting",
      votes: { A: 0, B: 0 },
    }).catch(console.error);

    setSelected(null);
    voteLocked.current = false;
  };

  // Host starts the game by setting questions, round, and phase
  const handleStartGame = async () => {
    if (!hostId || playerName !== hostId) {
      console.log("[handleStartGame] Not host, cannot start game.");
      return;
    }

    const selectedQuestions = [...questions]
      .sort(() => 0.5 - Math.random())
      .slice(0, TOTAL_ROUNDS);

    try {
      await updateDoc(lobbyRef, {
        questions: selectedQuestions,
        round: 0,
        phase: "voting",
        votes: { A: 0, B: 0 },
      });
      console.log("[handleStartGame] Game started with questions:", selectedQuestions.length);
    } catch (error) {
      console.error("[handleStartGame] Failed to start game:", error);
    }
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
          <h1>
            Round {currentRound + 1} / {TOTAL_ROUNDS}
          </h1>
          <h2>{questions[currentRound]}</h2>

          {phase === "voting" && (
            <div className="choices">
              <button
                onClick={() => handleVote("A")}
                disabled={selected !== null}
              >
                Person A
              </button>
              <button
                onClick={() => handleVote("B")}
                disabled={selected !== null}
              >
                Person B
              </button>

              {selected && <p>You voted: Person {selected}</p>}
            </div>
          )}

          {phase === "results" && (
            <div>
              <h3>Results:</h3>
              <p>Person A: {votes.A} vote(s)</p>
              <p>Person B: {votes.B} vote(s)</p>

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
