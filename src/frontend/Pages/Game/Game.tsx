import { useEffect, useState, useRef } from "react";
import { db } from "../../../backend/Firebase/FirebaseConfig";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";
import "./Game.css";

const TOTAL_ROUNDS = 20;
const VOTING_DURATION = 15000;

function Game() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<"waiting" | "voting" | "results">("waiting");
  const [selected, setSelected] = useState<string | null>(null);
  const [votes, setVotes] = useState<{ A: number; B: number }>({ A: 0, B: 0 });
  const [hostId, setHostId] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);  // <-- keep players in state so we can use it!
  const [personA, setPersonA] = useState<string | null>(null);
  const [personB, setPersonB] = useState<string | null>(null);

  const playerName = localStorage.getItem("playerName") || "Player";
  const voteLocked = useRef(false);
  const prevPhase = useRef<string | null>(null);

  if (!lobbyId) return <div>Invalid lobby ID.</div>;

  const lobbyRef = doc(db, "lobbies", lobbyId);

  useEffect(() => {
    const unsubscribe = onSnapshot(lobbyRef, (docSnap) => {
      const data = docSnap.data();
      if (data) {
        setQuestions(data.questions || []);
        setCurrentRound(data.round ?? 0);
        setPhase(data.phase ?? "waiting");
        setVotes(data.votes || { A: 0, B: 0 });
        setHostId(data.hostId || null);
        setPlayers(data.players || []);
        setPersonA(data.personA || null);
        setPersonB(data.personB || null);

        console.log("[onSnapshot] Lobby data:", data);

        if (data.phase === "voting" && prevPhase.current !== "voting") {
          voteLocked.current = false;
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
    if (phase === "voting" && playerName === hostId) {
      console.log("[Voting Timer] Starting for 15 seconds.");
      const timer = setTimeout(() => {
        console.log("[Voting Timer] Time's up. Moving to results.");
        updateDoc(lobbyRef, { phase: "results" }).catch(console.error);
      }, VOTING_DURATION);
      return () => clearTimeout(timer);
    }
  }, [phase, playerName, hostId]);

  const handleVote = (choice: "A" | "B") => {
    if (voteLocked.current || selected !== null) {
      console.log("[handleVote] Vote already submitted. Ignoring.");
      return;
    }

    voteLocked.current = true;
    setSelected(choice);

    const field = `votes.${choice}`;
    updateDoc(lobbyRef, {
      [field]: votes[choice] + 1,
    })
      .then(() => {
        const votedFor = choice === "A" ? (personA || players[0]?.name) : (personB || players[1]?.name);
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

    const { personA, personB } = pickTwoDistinctPlayers(currentPlayers);

    await updateDoc(lobbyRef, {
      round: currentRound + 1,
      phase: "voting",
      votes: { A: 0, B: 0 },
      personA,
      personB,
    });

    console.log("[handleNextRound] New round started with:", personA, "vs", personB);
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
      votes: { A: 0, B: 0 },
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
              <button onClick={() => handleVote("A")} disabled={selected !== null}>
                {personA || players[0]?.name || "Person A"}
              </button>
              <button onClick={() => handleVote("B")} disabled={selected !== null}>
                {personB || players[1]?.name || "Person B"}
              </button>
              {selected && (
                <p>You voted for: {selected === "A" ? (personA || players[0]?.name) : (personB || players[1]?.name)}</p>
              )}
            </div>
          )}

          {phase === "results" && (
            <div>
              <h3>Results:</h3>
              <p>{personA || players[0]?.name || "Person A"}: {votes.A} vote(s)</p>
              <p>{personB || players[1]?.name || "Person B"}: {votes.B} vote(s)</p>
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
