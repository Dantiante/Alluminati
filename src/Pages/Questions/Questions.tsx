import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Questions.css';

interface QuestionsProps {
  changeBackground: () => void;
}



function Questions({ changeBackground }: QuestionsProps) {
  const NaughtyQuestions = [
    "Who is more likely to make the first move?",
    "Which one is the better kisser?",
    "Who is more adventurous in the bedroom?",
    "Which one is more likely to send a risky text?",
    "Who is more dominant?",
    "Which one has a wilder imagination?",
    "Who is more likely to get caught in the act?",
    "Which one is the bigger tease?",
    "Who is more likely to have a secret fantasy?",
    "Which one would last longer in a spicy challenge?",
    "Who is more likely to try something completely unexpected?",
    "Which one is more into roleplay?",
    "Who is more likely to initiate in an unexpected place?",
    "Which one is better at setting the mood?",
    "Who is more likely to take control?",
    "Which one enjoys being teased more?",
    "Who is more likely to suggest something new?",
    "Which one gets flustered more easily?",
    "Who is more likely to sneak away for a quick moment?",
    "Which one is more experimental?",
    "Who is more likely to have a hidden wild side?",
    "Which one enjoys the anticipation more?",
    "Who is more likely to make the first move in public?",
    "Which one enjoys being in charge?",
    "Who is more likely to lose control?",
    "Which one is more confident in their skills?",
    "Who is more likely to turn a normal situation into something spicy?",
    "Which one is harder to resist?",
    "Who is more likely to plan a surprise?",
    "Which one has a more mischievous side?",
    "Who is more likely to make the other blush?",
    "Which one has a more seductive voice?",
    "Who is more likely to leave a lasting impression?",
    "Which one is more spontaneous?",
    "Who is more likely to push the limits?",
    "Which one is more easily tempted?",
    "Who is more likely to turn up the heat with just a look?",
    "Which one enjoys a little bit of mystery more?",
    "Who is more likely to take things slow and build anticipation?",
    "Which one is more into late-night conversations that turn into something more?",
    "Who is more confident in making someone weak in the knees?",
    "Which one is more likely to leave a mark?",
    "Who is more into eye contact that says everything?",
    "Which one is better at keeping secrets?",
    "Who is more likely to whisper something dangerous in the ear?",
    "Which one is more irresistible after a few drinks?",
    "Who is more likely to have a secret trick up their sleeve?",
    "Which one enjoys a little challenge more?",
    "Who is more likely to say something shocking in the heat of the moment?",
    "Which one is more unforgettable?"
  ];

  // Shuffle and pick 20 unique questions
  const shuffledQuestions = [...NaughtyQuestions].sort(() => 0.5 - Math.random()).slice(0, 20);
  const [questions, _setQuestions] = useState(shuffledQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null); // Stores who got the answer
  const [personACount, setPersonACount] = useState(0); // Track number of Person A choices
  const [personBCount, setPersonBCount] = useState(0); // Track number of Person B choices
  const [totalPlayers, setTotalPlayers] = useState<number>(0); // Store total players dynamically
  const [isGameStarted, setIsGameStarted] = useState(false); // Track if game has started

  // Effect to change background color
  useEffect(() => {
    document.documentElement.style.background = "linear-gradient(to bottom, #ff5f6d, #ffc371)"; // Set background
    return () => {
      document.documentElement.style.background = ""; // Reset on leave
    };
  }, []);

  const handleStartGame = (players: number) => {
    setTotalPlayers(players); // Set dynamic player count
    setIsGameStarted(true); // Start the game
  };

  // Calculate percentages for each person's progress
  const personAPercentage = totalPlayers ? (personACount / totalPlayers) * 100 : 0;
  const personBPercentage = totalPlayers ? (personBCount / totalPlayers) * 100 : 0;

  function handleNextQuestion(person: string) {
    if (person === "Person A") {
      setPersonACount(prev => prev + 1); // Increment Person A's count
    } else if (person === "Person B") {
      setPersonBCount(prev => prev + 1); // Increment Person B's count
    }

    setSelectedPerson(person); // Show who got the answer
  }

  function goToNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedPerson(null);
      setPersonACount(0);
      setPersonBCount(0);
      changeBackground(); // 🎨 Change background on every next question
    } else {
      alert("Game Over! You've answered all the questions.");
    }
  }

  

  

  return (
    <div className="Container">
      {!isGameStarted ? (
        <div>
          <h1>Start the Game</h1>
          <button onClick={() => handleStartGame(totalPlayers)}>Start Game</button>
        </div>
      ) : (
        <>
          <h1>Questions</h1>

          {/* Show question or who got the answer */}
          {selectedPerson ? (
            <p className="result-text">{selectedPerson} got the answer!</p>
          ) : (
            <p>{questions[currentIndex]}</p>
          )}

          {!selectedPerson && (
            <div className="choices">
              <button onClick={() => handleNextQuestion("Person A")}>Person A</button>
              <button onClick={() => handleNextQuestion("Person B")}>Person B</button>
            </div>
          )}

          {/* Display progress bars for Person A and Person B */}
          {selectedPerson && (
            <div className="progress-bar-container">
              {/* Person A Progress */}
              <div className="progress-bar-wrapper">
                <div className="progress-bar-label">Person A</div>
                <div className="progress-bar" style={{ height: `${personAPercentage}%` }}>
                  <p>{personAPercentage.toFixed(0)}%</p>
                </div>
              </div>

              {/* Person B Progress */}
              <div className="progress-bar-wrapper">
                <div className="progress-bar-label">Person B</div>
                <div className="progress-bar" style={{ height: `${personBPercentage}%` }}>
                  <p>{personBPercentage.toFixed(0)}%</p>
                </div>
              </div>
              <div className='progress-bar-wrapper'>
                <div className='progress-bar-label'>Test Bar</div>
                  <div className='progress-bar' style={{ height: `100%` }}>
                    <p>Test bar</p>
                  </div>
                </div>
              </div>
            
          )}

          {/* Show "Next Question" button only when an answer has been selected */}
          {selectedPerson && (
            <button onClick={goToNext} className="next-button">
              Next Question
            </button>
          )}

          <nav>
            <Link to="/">
              <button>Go Back to Home</button>
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}

export default Questions;
