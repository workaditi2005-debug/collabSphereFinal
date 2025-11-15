import React, { useState, useEffect } from 'react';

// --- MOCK DATA FOR QUIZ GENERATION ---
const MOCK_QUESTIONS = {
  "JavaScript": [
    {
      "question": "Which method is used to add an element to the end of an array?",
      "options": ["shift()", "unshift()", "push()", "pop()"],
      "correctAnswer": 2,
      "explanation": "The push() method adds one or more elements to the end of an array and returns the new length of the array."
    },
    {
      "question": "What does the 'typeof' operator return for an array in JavaScript?",
      "options": ["array", "object", "list", "arrayObject"],
      "correctAnswer": 1,
      "explanation": "In JavaScript, arrays are a type of object. The typeof operator returns 'object' for arrays, which is a common quirk."
    },
    {
      "question": "What is the result of '5' + 2 in JavaScript?",
      "options": ["7", "52", "NaN", "Error"],
      "correctAnswer": 1,
      "explanation": "Since the first operand is a string, JavaScript treats the '+' as a concatenation operator, resulting in the string '52'."
    },
    {
      "question": "Which keyword is used to declare a block-scoped variable?",
      "options": ["var", "let", "const", "both let and const"],
      "correctAnswer": 3,
      "explanation": "Both 'let' and 'const' are block-scoped. 'var' is function-scoped or globally scoped."
    },
    {
      "question": "How do you correctly call a function named 'myFunction'?",
      "options": ["call myFunction()", "myFunction", "myFunction()", "execute myFunction"],
      "correctAnswer": 2,
      "explanation": "To invoke a function in JavaScript, you must append parentheses to its name: myFunction()."
    },
  ],
  "World History": [
    {
      "question": "Who was the first Roman Emperor?",
      "options": ["Julius Caesar", "Nero", "Augustus", "Constantine"],
      "correctAnswer": 2,
      "explanation": "Octavian, later known as Augustus, was the founder of the Roman Principate and considered the first Roman Emperor."
    },
    {
      "question": "In which year did the Berlin Wall fall?",
      "options": ["1985", "1989", "1991", "1995"],
      "correctAnswer": 1,
      "explanation": "The Berlin Wall, which divided East and West Berlin, fell on November 9, 1989."
    },
    {
      "question": "The Hundred Years' War was fought primarily between which two countries?",
      "options": ["France and Spain", "England and France", "Germany and Russia", "Italy and Austria"],
      "correctAnswer": 1,
      "explanation": "The Hundred Years' War was a series of conflicts waged between the House of Plantagenet (England) and the House of Valois (France)."
    },
  ],
};

const AIQuiz = ({ userData, kanbanData }) => {
  const [quizState, setQuizState] = useState('home'); // home, setup, taking, results, leaderboard
  const [quizConfig, setQuizConfig] = useState({
    topic: 'JavaScript', // Defaulting topic for easy testing
    difficulty: 'medium',
    questionCount: 5,
    timeLimit: 60 // seconds per question
  });
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizHistory, setQuizHistory] = useState(() => {
    const saved = localStorage.getItem('quizHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [feedback, setFeedback] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [timeTaken, setTimeTaken] = useState([]);
  
  // Leaderboard state - using localStorage for shared data
  const [leaderboard, setLeaderboard] = useState(() => {
    const saved = localStorage.getItem('quizLeaderboard');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('quizHistory', JSON.stringify(quizHistory));
  }, [quizHistory]);

  useEffect(() => {
    localStorage.setItem('quizLeaderboard', JSON.stringify(leaderboard));
  }, [leaderboard]);

  // Timer effect
  useEffect(() => {
    if (quizState === 'taking' && timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quizState, timeRemaining]);

  const handleTimeUp = () => {
    // Auto-submit with no answer
    const newAnswers = [...userAnswers, null];
    // Mock time taken to avoid null/undefined issues if questionStartTime is missing
    const questionTime = questionStartTime ? Date.now() - questionStartTime : 1000 * (quizConfig.timeLimit - 1);
    setTimeTaken([...timeTaken, questionTime]);
    setUserAnswers(newAnswers);

    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setTimeRemaining(quizConfig.timeLimit);
      setQuestionStartTime(Date.now());
    } else {
      finishQuiz(newAnswers, [...timeTaken, questionTime]);
    }
  };

  /**
   * MOCK IMPLEMENTATION of generateQuiz
   * Replaces the API call with mock data and a delay.
   */
  const generateQuiz = async () => {
    if (!quizConfig.topic) return;

    setIsGenerating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    try {
      // Find mock questions for the topic, or default to JavaScript if not found
      const rawQuestions = MOCK_QUESTIONS[quizConfig.topic] || MOCK_QUESTIONS["JavaScript"];
      
      // Ensure we have at least the requested number of questions (or all if less are available)
      const numQuestions = Math.min(quizConfig.questionCount, rawQuestions.length);
      const questions = rawQuestions.slice(0, numQuestions);

      if (questions.length === 0) {
        throw new Error(`No mock questions found for topic: ${quizConfig.topic}`);
      }

      const quizData = { questions };
      
      setCurrentQuiz({
        ...quizData,
        topic: quizConfig.topic,
        difficulty: quizConfig.difficulty,
        timeLimit: quizConfig.timeLimit,
        timestamp: Date.now()
      });
      setQuizState('taking');
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setSelectedAnswer(null);
      setTimeRemaining(quizConfig.timeLimit);
      setQuestionStartTime(Date.now());
      setTimeTaken([]);
    } catch (err) {
      console.error('Error generating mock quiz:', err);
      alert('Failed to generate quiz. Check console for error details.');
    } finally {
      setIsGenerating(false);
    }
  };
  // END MOCK IMPLEMENTATION

  const handleAnswerSelect = (optionIndex) => {
    setSelectedAnswer(optionIndex);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;

    const questionTime = Date.now() - questionStartTime;
    const newAnswers = [...userAnswers, selectedAnswer];
    const newTimeTaken = [...timeTaken, questionTime];
    
    setUserAnswers(newAnswers);
    setTimeTaken(newTimeTaken);

    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setTimeRemaining(quizConfig.timeLimit);
      setQuestionStartTime(Date.now());
    } else {
      finishQuiz(newAnswers, newTimeTaken);
    }
  };

  /**
   * MOCK IMPLEMENTATION of finishQuiz's AI Feedback
   * Replaces the AI feedback API call with a simple mock.
   */
  const finishQuiz = async (answers, times) => {
    setTimeRemaining(null);
    
    const score = answers.reduce((acc, answer, idx) => {
      // Handle null answer (time up)
      if (answer === null) return acc;
      return acc + (answer === currentQuiz.questions[idx].correctAnswer ? 1 : 0);
    }, 0);

    const percentage = (score / currentQuiz.questions.length) * 100;
    const totalTime = times.reduce((sum, t) => sum + t, 0);
    const avgTimePerQuestion = totalTime / times.length;

    setIsGenerating(true);
    
    // Simulate AI feedback generation delay
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    // Generate simple mock feedback based on score
    let mockFeedback;
    if (percentage >= 80) {
      mockFeedback = {
        overallFeedback: `An excellent performance! You scored ${score} out of ${currentQuiz.questions.length} which is outstanding.`,
        strengths: `Your foundational knowledge of ${quizConfig.topic} is very strong. You answered quickly and accurately.`,
        improvements: `Only minor areas for improvement. Review the one or two questions you missed for perfect mastery.`,
        recommendations: 'Challenge yourself with the "hard" difficulty setting next time!'
      };
    } else if (percentage >= 50) {
      mockFeedback = {
        overallFeedback: `A solid effort! You scored ${score} out of ${currentQuiz.questions.length}. You have a good grasp on the basics.`,
        strengths: 'You demonstrated competence in core concepts and generally managed your time well.',
        improvements: `Focus on the specific concepts behind the questions you missed. Look for patterns in your incorrect answers.`,
        recommendations: `Try another quiz on ${quizConfig.topic} and review the explanations of incorrect answers carefully.`
      };
    } else {
      mockFeedback = {
        overallFeedback: `A respectable first attempt! You scored ${score} out of ${currentQuiz.questions.length}. Every quiz is a chance to learn.`,
        strengths: 'You completed the quiz and attempted most of the questions, showing good engagement.',
        improvements: `It seems you need to build a stronger foundation in ${quizConfig.topic}. Start with the core definitions and principles.`,
        recommendations: 'Spend some dedicated study time on this topic before retaking the quiz, and focus on one concept at a time.'
      };
    }
    
    setFeedback(mockFeedback);
    setIsGenerating(false);
    // END MOCK IMPLEMENTATION

    const quizResult = {
      id: Date.now(),
      topic: currentQuiz.topic,
      difficulty: currentQuiz.difficulty,
      score,
      total: currentQuiz.questions.length,
      percentage,
      date: new Date().toISOString(),
      answers,
      totalTime,
      avgTimePerQuestion,
      userName: userData?.fullName || userData?.name || 'Anonymous',
      userEmail: userData?.email || ''
    };

    setQuizHistory([quizResult, ...quizHistory].slice(0, 10));
    
    // Update leaderboard
    updateLeaderboard(quizResult);
    
    setQuizState('results');
  };

  const updateLeaderboard = (quizResult) => {
    const newEntry = {
      id: quizResult.id,
      userName: quizResult.userName,
      userEmail: quizResult.userEmail,
      topic: quizResult.topic,
      difficulty: quizResult.difficulty,
      score: quizResult.score,
      total: quizResult.total,
      percentage: quizResult.percentage,
      totalTime: quizResult.totalTime,
      date: quizResult.date
    };

    const updated = [...leaderboard, newEntry]
      .sort((a, b) => {
        // Sort by percentage first, then by time (faster is better)
        if (b.percentage !== a.percentage) {
          return b.percentage - a.percentage;
        }
        return a.totalTime - b.totalTime;
      })
      .slice(0, 50); // Keep top 50

    setLeaderboard(updated);
  };

  const resetQuiz = () => {
    setQuizState('home');
    setCurrentQuiz(null);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setSelectedAnswer(null);
    setFeedback(null);
    setTimeRemaining(null);
    setQuestionStartTime(null);
    setTimeTaken([]);
    setQuizConfig({ topic: 'JavaScript', difficulty: 'medium', questionCount: 5, timeLimit: 60 });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMilliseconds = (ms) => {
    const seconds = Math.floor(ms / 1000);
    return formatTime(seconds);
  };

  const currentQuestion = currentQuiz?.questions[currentQuestionIndex];

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Home/Setup State */}
      {quizState === 'home' && (
        <div>
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            padding: '40px', 
            borderRadius: '16px', 
            color: 'white',
            marginBottom: '30px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '2.5rem' }}>🧠</span>
              <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>AI-Powered Quiz</h2>
            </div>
            <p style={{ fontSize: '1.1rem', opacity: 0.95, margin: 0 }}>
              Test your knowledge with AI-generated questions tailored to any topic
            </p>
          </div>

          {/* Quick Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px',
            marginBottom: '30px'
          }}>
            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#667eea' }}>
                {quizHistory.length}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Quizzes Taken</div>
            </div>
            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏆</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
                {quizHistory.length > 0 ? 
                  (quizHistory.reduce((sum, q) => sum + q.percentage, 0) / quizHistory.length).toFixed(0) 
                  : 0}%
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Average Score</div>
            </div>
            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚡</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>
                #{leaderboard.findIndex(e => e.userEmail === userData?.email) + 1 || '--'}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Leaderboard Rank</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '30px' }}>
            <button
              onClick={() => setQuizState('setup')}
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🚀</span>
              Start New Quiz
            </button>
            <button
              onClick={() => setQuizState('leaderboard')}
              style={{
                padding: '20px',
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🏆</span>
              View Leaderboard
            </button>
          </div>

          {/* Quiz History */}
          {quizHistory.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>Recent Quizzes</h3>
              <div style={{ display: 'grid', gap: '16px' }}>
                {quizHistory.slice(0, 5).map((quiz) => (
                  <div
                    key={quiz.id}
                    style={{
                      background: 'white',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#1f2937' }}>
                        {quiz.topic}
                      </h4>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        {new Date(quiz.date).toLocaleDateString()} • {quiz.difficulty} • ⏱️ {formatMilliseconds(quiz.totalTime)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: '700',
                        color: quiz.percentage >= 70 ? '#10b981' : quiz.percentage >= 50 ? '#f59e0b' : '#ef4444'
                      }}>
                        {quiz.percentage.toFixed(0)}%
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        {quiz.score}/{quiz.total}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Setup State */}
      {quizState === 'setup' && (
        <div>
          <button
            onClick={() => setQuizState('home')}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#6b7280',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '20px',
              fontWeight: '500'
            }}
          >
            ← Back
          </button>

          <div style={{ 
            background: 'white', 
            padding: '30px', 
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            marginBottom: '30px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '1.5rem' }}>Create Your Quiz</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                Quiz Topic *
              </label>
              <input
                type="text"
                placeholder="e.g., JavaScript, World History, Physics..."
                value={quizConfig.topic}
                onChange={(e) => setQuizConfig({ ...quizConfig, topic: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  outline: 'none'
                }}
              />

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                  Difficulty Level
                </label>
                <select
                  value={quizConfig.difficulty}
                  onChange={(e) => setQuizConfig({ ...quizConfig, difficulty: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    outline: 'none',
                    background: 'white'
                  }}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                  Number of Questions
                </label>
                <select
                  value={quizConfig.questionCount}
                  onChange={(e) => setQuizConfig({ ...quizConfig, questionCount: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    outline: 'none',
                    background: 'white'
                  }}
                >
                  <option value="3">3 Questions</option>
                  <option value="5">5 Questions</option>
                  <option value="10">10 Questions</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                ⏱️ Time Limit (per question)
              </label>
              <select
                value={quizConfig.timeLimit}
                onChange={(e) => setQuizConfig({ ...quizConfig, timeLimit: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  outline: 'none',
                  background: 'white'
                }}
              >
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
                <option value="90">90 seconds</option>
                <option value="120">2 minutes</option>
              </select>
            </div>

            <button
              onClick={generateQuiz}
              disabled={!quizConfig.topic || isGenerating}
              style={{
                width: '100%',
                padding: '14px',
                background: quizConfig.topic ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: quizConfig.topic ? 'pointer' : 'not-allowed',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => {
                if (quizConfig.topic) e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
              }}
            >
              {isGenerating ? '🤖 Generating Quiz...' : '✨ Generate Quiz'}
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard State */}
      {quizState === 'leaderboard' && (
        <div>
          <button
            onClick={() => setQuizState('home')}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#6b7280',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '20px',
              fontWeight: '500'
            }}
          >
            ← Back
          </button>

          <div style={{ 
            background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', 
            padding: '40px', 
            borderRadius: '16px', 
            color: 'white',
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏆</div>
            <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>Global Leaderboard</h2>
            <p style={{ fontSize: '1rem', opacity: 0.95, margin: '8px 0 0 0' }}>
              Top performers across all quizzes
            </p>
          </div>

          {leaderboard.length === 0 ? (
            <div style={{ 
              background: 'white', 
              padding: '60px', 
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>📊</div>
              <h3 style={{ color: '#6b7280' }}>No quiz results yet</h3>
              <p style={{ color: '#9ca3af' }}>Be the first to take a quiz and claim the top spot!</p>
            </div>
          ) : (
            <div style={{ 
              background: 'white', 
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              {leaderboard.map((entry, index) => {
                const isCurrentUser = entry.userEmail === userData?.email;
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                
                return (
                  <div
                    key={entry.id}
                    style={{
                      padding: '20px 24px',
                      borderBottom: index < leaderboard.length - 1 ? '1px solid #f3f4f6' : 'none',
                      background: isCurrentUser ? '#f0fdf4' : 'white',
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr 150px 120px 100px',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: '700',
                      color: index < 3 ? '#f59e0b' : '#6b7280',
                      textAlign: 'center'
                    }}>
                      {medal || `#${index + 1}`}
                    </div>
                    
                    <div>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#1f2937',
                        marginBottom: '4px'
                      }}>
                        {entry.userName} {isCurrentUser && '(You)'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        {entry.topic} • {entry.difficulty}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                      {new Date(entry.date).toLocaleDateString()}
                    </div>

                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                      ⏱️ {formatMilliseconds(entry.totalTime)}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: '1.3rem', 
                        fontWeight: '700',
                        color: entry.percentage >= 70 ? '#10b981' : entry.percentage >= 50 ? '#f59e0b' : '#ef4444'
                      }}>
                        {entry.percentage.toFixed(0)}%
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {entry.score}/{entry.total}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Taking Quiz State */}
      {quizState === 'taking' && currentQuestion && (
        <div>
          {/* Timer and Progress Bar */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>
                Question {currentQuestionIndex + 1} of {currentQuiz.questions.length}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>
                  {currentQuiz.topic} • {currentQuiz.difficulty}
                </span>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '6px 12px',
                  background: timeRemaining <= 10 ? '#fee2e2' : '#dbeafe',
                  borderRadius: '8px',
                  fontWeight: '600',
                  color: timeRemaining <= 10 ? '#dc2626' : '#2563eb'
                }}>
                  <span>⏱️</span>
                  <span>{formatTime(timeRemaining)}</span>
                </div>
              </div>
            </div>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              background: '#e5e7eb', 
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>

          {/* Question Card */}
          <div style={{ 
            background: 'white', 
            padding: '40px', 
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '30px',
              color: '#1f2937',
              lineHeight: '1.6'
            }}>
              {currentQuestion.question}
            </h2>

            <div style={{ display: 'grid', gap: '12px' }}>
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(idx)}
                  style={{
                    padding: '16px 20px',
                    background: selectedAnswer === idx ? '#ede9fe' : 'white',
                    border: selectedAnswer === idx ? '2px solid #667eea' : '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: '#1f2937'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAnswer !== idx) {
                      e.target.style.background = '#f9fafb';
                      e.target.style.borderColor = '#d1d5db';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAnswer !== idx) {
                      e.target.style.background = 'white';
                      e.target.style.borderColor = '#e5e7eb';
                    }
                  }}
                >
                  <span style={{ 
                    fontWeight: '600', 
                    marginRight: '12px',
                    color: selectedAnswer === idx ? '#667eea' : '#9ca3af'
                  }}>
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={resetQuiz}
              style={{
                padding: '12px 24px',
                background: 'white',
                color: '#6b7280',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Exit Quiz
            </button>
            <button
              onClick={handleNextQuestion}
              disabled={selectedAnswer === null}
              style={{
                padding: '12px 32px',
                background: selectedAnswer !== null ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: selectedAnswer !== null ? 'pointer' : 'not-allowed'
              }}
            >
              {currentQuestionIndex < currentQuiz.questions.length - 1 ? 'Next Question →' : 'Finish Quiz'}
            </button>
          </div>
        </div>
      )}

      {/* Results State */}
      {quizState === 'results' && (
        <div>
          {/* Score Card */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '50px',
            borderRadius: '16px',
            color: 'white',
            textAlign: 'center',
            marginBottom: '30px'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>
              {quizHistory[0]?.percentage >= 70 ? '🎉' : quizHistory[0]?.percentage >= 50 ? '👍' : '💪'}
            </div>
            <h2 style={{ fontSize: '2.5rem', margin: '0 0 16px 0' }}>
              {quizHistory[0]?.score}/{quizHistory[0]?.total}
            </h2>
            <div style={{ fontSize: '1.5rem', opacity: 0.95, marginBottom: '12px' }}>
              {quizHistory[0]?.percentage.toFixed(0)}% Correct
            </div>
            <div style={{ fontSize: '1rem', opacity: 0.85 }}>
              ⏱️ Total Time: {formatMilliseconds(quizHistory[0]?.totalTime)}
            </div>
          </div>

          {/* AI Feedback */}
          {isGenerating ? (
            <div style={{ 
              background: 'white', 
              padding: '40px', 
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🤖</div>
              <div style={{ color: '#6b7280' }}>Generating personalized feedback...</div>
            </div>
          ) : feedback && (
            <div style={{ 
              background: 'white', 
              padding: '30px', 
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              marginBottom: '24px'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🤖</span> AI Feedback
              </h3>
              
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#667eea', marginBottom: '8px' }}>Overall Performance</h4>
                <p style={{ color: '#4b5563', lineHeight: '1.6' }}>{feedback.overallFeedback}</p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#10b981', marginBottom: '8px' }}>Strengths</h4>
                <p style={{ color: '#4b5563', lineHeight: '1.6' }}>{feedback.strengths}</p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>Areas to Improve</h4>
                <p style={{ color: '#4b5563', lineHeight: '1.6' }}>{feedback.improvements}</p>
              </div>

              <div>
                <h4 style={{ color: '#8b5cf6', marginBottom: '8px' }}>Recommendations</h4>
                <p style={{ color: '#4b5563', lineHeight: '1.6' }}>{feedback.recommendations}</p>
              </div>
            </div>
          )}

          {/* Review Answers */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>Review Your Answers</h3>
            {currentQuiz.questions.map((q, idx) => {
              const userAnswer = userAnswers[idx];
              const isCorrect = userAnswer === q.correctAnswer;
              const questionTime = timeTaken[idx];
              
              return (
                <div
                  key={idx}
                  style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    border: `2px solid ${isCorrect ? '#10b981' : userAnswer === null ? '#f59e0b' : '#ef4444'}`,
                    marginBottom: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                    <span style={{ 
                      fontSize: '1.5rem',
                      flexShrink: 0
                    }}>
                      {isCorrect ? '✅' : userAnswer === null ? '⏱️' : '❌'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1f2937', flex: 1 }}>
                          {q.question}
                        </h4>
                        <span style={{ 
                          fontSize: '0.85rem', 
                          color: '#6b7280',
                          background: '#f3f4f6',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                          marginLeft: '12px'
                        }}>
                          ⏱️ {(questionTime / 1000).toFixed(1)}s
                        </span>
                      </div>
                      {userAnswer === null ? (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ fontWeight: '600', color: '#f59e0b' }}>Time expired - No answer given</span>
                        </div>
                      ) : (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ fontWeight: '600', color: '#6b7280' }}>Your answer: </span>
                          <span style={{ color: isCorrect ? '#10b981' : '#ef4444' }}>
                            {q.options[userAnswer]}
                          </span>
                        </div>
                      )}
                      {!isCorrect && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ fontWeight: '600', color: '#6b7280' }}>Correct answer: </span>
                          <span style={{ color: '#10b981' }}>
                            {q.options[q.correctAnswer]}
                          </span>
                        </div>
                      )}
                      <div style={{ 
                        marginTop: '12px',
                        padding: '12px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        color: '#4b5563'
                      }}>
                        💡 {q.explanation}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button
              onClick={() => setQuizState('leaderboard')}
              style={{
                padding: '14px',
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '10px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🏆 View Leaderboard
            </button>
            <button
              onClick={resetQuiz}
              style={{
                padding: '14px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Take Another Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIQuiz;