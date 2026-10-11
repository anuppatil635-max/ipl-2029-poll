import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  Link,
} from "react-router-dom";

import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import Analytics from "./Analytics";
import PollManagement from "./PollManagement";
import "./App.css";
import "./PollSelection.css";



const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://127.0.0.1:8081"
    : "https://ipl-2029-backend.onrender.com");


/* =========================================
   PUBLIC POLL SELECTION PAGE
========================================= */

function PollSelection() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPolls() {
      try {
        const response = await fetch(`${API_BASE}/api/public/polls/`);

        if (!response.ok) {
          throw new Error("Unable to load available polls.");
        }

        const data = await response.json();

        if (active) {
          setPolls(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load polls.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPolls();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="poll-selection-page">
      <header className="selection-header">
        <Link to="/" className="selection-logo">
          POLL<span>SPACE</span>
        </Link>

        <span className="selection-header-label">
          PUBLIC POLLS
        </span>
      </header>

      <main className="selection-main">
        <div className="selection-hero">
          <span className="selection-eyebrow">
            YOUR VOICE MATTERS
          </span>

          <h1>
            Choose your <span>poll.</span>
          </h1>

          <p>
            Explore the available polls, share your opinion,
            and make your response count.
          </p>
        </div>

        {loading && (
          <div className="selection-message">
            Loading available polls...
          </div>
        )}

        {error && (
          <div className="selection-error">
            {error}
            <p>
              Check that your Django backend is running and
              that the public poll-list endpoint is configured.
            </p>
          </div>
        )}

        {!loading && !error && polls.length === 0 && (
          <div className="selection-message">
            No active polls are available right now.
          </div>
        )}

        {!loading && !error && polls.length > 0 && (
          <section className="selection-grid">
            {polls.map((poll) => {
              const isIPL = poll.title
                ?.toLowerCase()
                .includes("ipl");

              return (
                <article
                  className="selection-poll-card"
                  key={poll.id}
                >
                  <div className="selection-card-top">
                    <span className="selection-card-icon">
                      {isIPL ? "🏏" : "📊"}
                    </span>

                    <span className="selection-status">
                      AVAILABLE
                    </span>
                  </div>

                  <div className="selection-card-content">
                    <span className="selection-card-category">
                      {isIPL ? "SPORTS & PREDICTION" : "SURVEY"}
                    </span>

                    <h2>{poll.title}</h2>

                    <p>
                      {poll.description ||
                        "Share your opinion by participating in this poll."}
                    </p>
                  </div>

                  <div className="selection-card-bottom">
                    <span>
                      {poll.questions_count ?? 0} questions
                    </span>

                    <Link
                      to={`/poll/${poll.id}`}
                      className="selection-participate-button"
                    >
                      Participate Now
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <footer className="selection-footer">
        PollSpace · Your opinion, your choice.
      </footer>
    </div>
  );
}

/* =========================================
   PUBLIC POLL PAGE
========================================= */

function PublicPoll() {
  const { pollId } = useParams();

  const [poll, setPoll] = useState(null);
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isIPL = poll?.title?.toLowerCase().includes("ipl");

  useEffect(() => {
    let active = true;

    async function loadPoll() {
      setLoading(true);
      setPoll(null);
      setAnswers({});
      setStarted(false);
      setSubmitted(false);
      setName("");
      setError("");

      try {
        const endpoint = pollId
          ? `${API_BASE}/api/poll/${pollId}/`
          : `${API_BASE}/api/poll/`;

        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error("This poll could not be found.");
        }

        const data = await response.json();

        if (active) setPoll(data);
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load this poll.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPoll();

    return () => {
      active = false;
    };
  }, [pollId]);

  const startPoll = () => {
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setStarted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOptionChange = (questionId, optionId) => {
    setAnswers((current) => {
      const selected = current[questionId] || [];
      const exists = selected.includes(optionId);

      return {
        ...current,
        [questionId]: exists
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId],
      };
    });

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!poll?.questions?.length) {
      setError("This poll has no questions to answer.");
      return;
    }

    for (let index = 0; index < poll.questions.length; index++) {
      const question = poll.questions[index];

      if (!(answers[question.id] || []).length) {
        setError(
          `Please answer Question ${question.order || index + 1}.`
        );
        return;
      }
    }

    const responses = poll.questions.map((question) => ({
      question_id: question.id,
      option_ids: answers[question.id] || [],
    }));

    try {
      setSubmitting(true);

      const endpoint = pollId
        ? `${API_BASE}/api/submit/${pollId}/`
        : `${API_BASE}/api/submit/`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          responses,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to submit your response."
        );
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="generic-poll-page">
        <div className="generic-poll-message">Loading poll...</div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="generic-poll-page">
        <div className="generic-poll-message">
          <h2>Poll unavailable</h2>
          <p>{error}</p>
          <Link to="/" className="generic-primary-button">
            Back to available polls
          </Link>
        </div>
      </div>
    );
  }

  if (!poll) return null;

  /* =========================================
     THANK-YOU SCREEN
     Shared success design for every poll
  ========================================= */

  if (submitted) {
    return (
      <div className="generic-poll-page">
        <main className="generic-poll-panel generic-success-panel">
          <div className="generic-success-icon">✓</div>

          <span className="generic-poll-kicker">
            RESPONSE RECORDED
          </span>

          <h1>Thank you, {name.trim()}!</h1>

          <p>
            Your response to{" "}
            <strong>
              {isIPL ? "IPL 2029 prediction" : poll.title}
            </strong>{" "}
            has been submitted successfully.
          </p>

          <Link to="/" className="generic-primary-button">
            Explore other polls
          </Link>
        </main>
      </div>
    );
  }

  /* =========================================
     NAME / START SCREEN
  ========================================= */

  if (!started) {
    if (isIPL) {
      return (
        <div className="public-page">
          <header className="public-topbar">
            <div className="brand">
              IPL <span>2029</span>
            </div>
            <div className="poll-label">PREDICTION POLL</div>
          </header>

          <main className="public-card">
            <div className="start-card">
              <div className="trophy">🏆</div>
              <div className="small-title">IPL 2029</div>

              <h1>
                Who will rule
                <br />
                <span>IPL 2029?</span>
              </h1>

              <p>
                Share your prediction and tell us what you think
                will decide IPL 2029.
              </p>

              <div className="name-section">
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") startPoll();
                  }}
                />

                <button type="button" onClick={startPoll}>
                  START PREDICTION →
                </button>
              </div>

              {error && (
                <div className="public-error">{error}</div>
              )}

              <p className="generic-back-link">
                <Link to="/">View other polls</Link>
              </p>
            </div>
          </main>

          <footer className="public-footer">
            IPL 2029 • Prediction Poll
          </footer>
        </div>
      );
    }

    return (
      <div className="generic-poll-page">
        <header className="generic-poll-topbar">
          <Link to="/" className="selection-logo">
            POLL<span>SPACE</span>
          </Link>
          <Link to="/" className="generic-back-link">
            All polls
          </Link>
        </header>

        <main className="generic-poll-panel">
          <span className="generic-poll-kicker">
            PARTICIPANT SURVEY
          </span>

          <h1>{poll.title}</h1>

          <p className="generic-poll-description">
            {poll.description ||
              "Please participate and share your opinion."}
          </p>

          <div className="generic-poll-info">
            <span>📋 {poll.questions?.length || 0} questions</span>
            <span>⏱ A few minutes to complete</span>
          </div>

          <label
            className="generic-name-label"
            htmlFor="participant-name"
          >
            Your name
          </label>

          <input
            id="participant-name"
            className="generic-name-input"
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") startPoll();
            }}
          />

          {error && (
            <div className="generic-poll-error">{error}</div>
          )}

          <button
            className="generic-primary-button"
            type="button"
            onClick={startPoll}
          >
            Start survey →
          </button>
        </main>
      </div>
    );
  }

  /* =========================================
     QUESTION SCREEN
  ========================================= */

  return (
    <div className={isIPL ? "question-page" : "generic-poll-page"}>
      {isIPL ? (
        <>
          <header className="question-header">
            <div>
              <div className="question-brand">
                IPL <span>2029</span>
              </div>
              <h1>Prediction Poll</h1>
              <p>
                Welcome, <strong>{name.trim()}</strong>.
                Select your answers below.
              </p>
            </div>

            <div className="question-count">
              {poll.questions.length} Questions
            </div>
          </header>

          <main className="questions-container">
            <form onSubmit={handleSubmit}>
              {poll.questions.map((question, index) => (
                <div className="question-card" key={question.id}>
                  <div className="question-number">
                    QUESTION {String(index + 1).padStart(2, "0")}
                  </div>

                  <h2>{question.text}</h2>

                  <div className="multiple-hint">
                    Select one or more options
                  </div>

                  <div className="options-grid">
                    {question.options.map((option) => {
                      const selected = (
                        answers[question.id] || []
                      ).includes(option.id);

                      return (
                        <label
                          key={option.id}
                          className={
                            selected
                              ? "option-card selected"
                              : "option-card"
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              handleOptionChange(
                                question.id,
                                option.id
                              )
                            }
                          />

                          <span className="custom-checkbox">
                            {selected ? "✓" : ""}
                          </span>

                          <span className="option-text">
                            {option.text}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {error && (
                <div className="submit-error">{error}</div>
              )}

              <button
                className="submit-poll-button"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? "SUBMITTING..."
                  : "SUBMIT PREDICTION →"}
              </button>
            </form>
          </main>
        </>
      ) : (
        <>
          <header className="generic-poll-topbar">
            <Link to="/" className="selection-logo">
              POLL<span>SPACE</span>
            </Link>

            <span className="generic-question-count">
              {poll.questions.length} questions
            </span>
          </header>

          <main className="generic-questions-wrap">
            <div className="generic-questions-heading">
              <span className="generic-poll-kicker">
                YOUR PARTICIPATION
              </span>

              <h1>{poll.title}</h1>

              <p>
                Welcome, <strong>{name.trim()}</strong>. Please answer
                each question below.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {poll.questions.map((question, index) => (
                <section
                  className="generic-question-card"
                  key={question.id}
                >
                  <span className="generic-question-number">
                    QUESTION {String(index + 1).padStart(2, "0")}
                  </span>

                  <h2>{question.text}</h2>

                  <p className="generic-select-hint">
                    Select one or more options
                  </p>

                  <div className="generic-options-list">
                    {question.options.map((option) => {
                      const selected = (
                        answers[question.id] || []
                      ).includes(option.id);

                      return (
                        <label
                          className={
                            selected
                              ? "generic-option selected"
                              : "generic-option"
                          }
                          key={option.id}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              handleOptionChange(
                                question.id,
                                option.id
                              )
                            }
                          />

                          <span className="generic-option-check">
                            {selected ? "✓" : ""}
                          </span>

                          <span>{option.text}</span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}

              {error && (
                <div className="generic-poll-error">{error}</div>
              )}

              <button
                type="submit"
                className="generic-primary-button generic-submit-button"
                disabled={submitting}
              >
                {submitting
                  ? "Submitting..."
                  : "Submit response →"}
              </button>
            </form>
          </main>
        </>
      )}
    </div>
  );
}

/* =========================================
   ADMIN HELPERS AND ROUTES
========================================= */

const getCsrfToken = () => {
  const cookies = document.cookie.split(";");

  for (let cookie of cookies) {
    cookie = cookie.trim();

    if (cookie.startsWith("csrftoken=")) {
      return decodeURIComponent(
        cookie.substring("csrftoken=".length)
      );
    }
  }

  return null;
};

function App() {
  const [adminUser, setAdminUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkAdminSession() {
      try {
        const response = await fetch(
          `${API_BASE}/api/admin/me/`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (active) setAdminUser(data.username);
        } else if (active) {
          setAdminUser(null);
        }
      } catch (error) {
        console.error("Session check error:", error);
        if (active) setAdminUser(null);
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    checkAdminSession();

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = (username) => {
    setAdminUser(username);
    window.location.replace("/admin/dashboard");
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/admin/logout/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": getCsrfToken() || "",
        },
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    setAdminUser(null);
    window.location.replace("/admin?logout=1");
  };

  if (checkingSession) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07102f",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Checking...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PollSelection />} />
        <Route path="/poll/:pollId" element={<PublicPoll />} />

        <Route
          path="/admin"
          element={<AdminLogin onLogin={handleLogin} />}
        />

        <Route
          path="/admin/dashboard"
          element={
            adminUser ? (
              <AdminDashboard
                username={adminUser}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        <Route
          path="/admin/polls"
          element={
            adminUser ? (
              <PollManagement />
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        <Route
          path="/admin/analytics"
          element={
            adminUser ? (
              <Analytics
                username={adminUser}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;