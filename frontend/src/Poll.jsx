import { useEffect, useMemo, useState } from "react";
import "./Poll.css";

function Poll() {
  const [poll, setPoll] = useState(null);
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedName, setSubmittedName] = useState("");

  useEffect(() => {
    const loadPoll = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/poll/`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load the poll."
          );
        }

        setPoll(data);
      } catch (err) {
        console.error("Poll loading error:", err);
        setError(
          err.message ||
            "Unable to load the poll. Make sure Django is running."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPoll();
  }, []);

  const questions = useMemo(() => {
    return [...(poll?.questions || [])].sort(
      (a, b) => a.order - b.order
    );
  }, [poll]);

  const current = questions[currentQuestion];

  const selectedOptions = current
    ? answers[current.id] || []
    : [];

  const handleStart = () => {
    if (!name.trim()) {
      setError("Please enter your name before starting.");
      return;
    }

    if (!poll?.is_active) {
      setError("The poll is currently closed.");
      return;
    }

    setError("");
    setStarted(true);
    setCurrentQuestion(0);
  };

  const toggleOption = (optionId) => {
    if (!current) return;

    setAnswers((previous) => {
      const existing = previous[current.id] || [];

      const updated = existing.includes(optionId)
        ? existing.filter((id) => id !== optionId)
        : [...existing, optionId];

      return {
        ...previous,
        [current.id]: updated,
      };
    });

    setError("");
  };

  const goNext = () => {
    if (!selectedOptions.length) {
      setError("Please select at least one option.");
      return;
    }

    setError("");

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((value) => value + 1);
    }
  };

  const goBack = () => {
    setError("");

    if (currentQuestion > 0) {
      setCurrentQuestion((value) => value - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOptions.length) {
      setError("Please select at least one option.");
      return;
    }

    const responses = questions.map((question) => ({
      question_id: question.id,
      option_ids: answers[question.id] || [],
    }));

    const unanswered = responses.some(
      (response) => response.option_ids.length === 0
    );

    if (unanswered) {
      setError("Please answer all questions.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/submit/`,
        {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          responses,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to submit your prediction."
        );
      }

      setSubmittedName(name.trim());
    } catch (err) {
      console.error("Submit error:", err);
      setError(
        err.message ||
          "Unable to submit your prediction. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setName("");
    setStarted(false);
    setCurrentQuestion(0);
    setAnswers({});
    setSubmittedName("");
    setError("");
  };

  if (loading) {
    return (
      <div className="poll-page poll-loading">
        <div className="loading-card">
          <div className="loading-spinner" />
          <p>Loading IPL 2029 Prediction Poll...</p>
        </div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="poll-page poll-error-page">
        <div className="error-card">
          <div className="error-icon">!</div>
          <h1>Poll unavailable</h1>
          <p>{error}</p>
          <button
            className="primary-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!poll?.is_active) {
    return (
      <div className="poll-page closed-page">
        <header className="poll-topbar">
          <div className="brand">
            <span className="brand-main">IPL</span>
            <span className="brand-year">2029</span>
          </div>

          <div className="topbar-label">
            PREDICTION POLL
          </div>
        </header>

        <main className="closed-content">
          <div className="closed-card">
            <div className="trophy">🏆</div>
            <span className="eyebrow">IPL 2029</span>
            <h1>Prediction Poll Closed</h1>
            <p>
              The IPL 2029 prediction poll is currently
              closed. Please check back later.
            </p>
          </div>
        </main>

        <footer className="poll-footer">
          IPL 2029 • Prediction Poll
        </footer>
      </div>
    );
  }

  if (submittedName) {
    return (
      <div className="poll-page thank-you-page">
        <header className="poll-topbar">
          <div className="brand">
            <span className="brand-main">IPL</span>
            <span className="brand-year">2029</span>
          </div>

          <div className="topbar-label">
            PREDICTION POLL
          </div>
        </header>

        <main className="thank-you-content">
          <section className="thank-you-card">
            <div className="trophy">🏆</div>

            <span className="eyebrow">IPL 2029</span>

            <h1>
              Thank You,{" "}
              <span>{submittedName}!</span>
            </h1>

            <p>
              Your IPL 2029 prediction has been
              successfully submitted.
            </p>

            <div className="saved-badge">
              ✓ Your response has been saved
            </div>

            <button
              className="secondary-button"
              onClick={restart}
            >
              Submit Another Prediction
            </button>
          </section>
        </main>

        <footer className="poll-footer">
          IPL 2029 • Prediction Poll
        </footer>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="poll-page landing-page">
        <div className="landing-background" />
        <div className="landing-overlay" />
        <div className="landing-glow landing-glow-one" />
        <div className="landing-glow landing-glow-two" />

        <header className="poll-topbar landing-topbar">
          <div className="brand">
            <span className="brand-main">IPL</span>
            <span className="brand-year">2029</span>
          </div>

          <div className="topbar-label">
            PREDICTION POLL
          </div>
        </header>

        <main className="landing-content">
          <section className="landing-hero">
            <div className="hero-trophy">🏆</div>

            <div className="hero-kicker">
              IPL 2029
            </div>

            <h1>
              Who will rule
              <span>IPL 2029?</span>
            </h1>

            <p className="hero-description">
              Share your prediction and tell us what you
              think will decide IPL 2029.
            </p>

            <div className="name-form">
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                maxLength={100}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleStart();
                  }
                }}
              />

              <button
                className="start-button"
                onClick={handleStart}
              >
                START PREDICTION
                <span>→</span>
              </button>
            </div>

            {error && (
              <div className="landing-error">
                {error}
              </div>
            )}

            <div className="hero-meta">
              <span>5 QUESTIONS</span>
              <span className="meta-dot">•</span>
              <span>1–2 MINUTES</span>
              <span className="meta-dot">•</span>
              <span>IPL 2029</span>
            </div>
          </section>
        </main>

        <footer className="poll-footer landing-footer">
          IPL 2029 • Prediction Poll
        </footer>
      </div>
    );
  }

  const progress =
    questions.length > 0
      ? ((currentQuestion + 1) / questions.length) * 100
      : 0;

  const isLastQuestion =
    currentQuestion === questions.length - 1;

  return (
    <div className="poll-page question-page">
      <header className="poll-topbar">
        <div className="brand">
          <span className="brand-main">IPL</span>
          <span className="brand-year">2029</span>
        </div>

        <div className="topbar-label">
          PREDICTION POLL
        </div>
      </header>

      <main className="question-content">
        <section className="question-card">
          <div className="question-header">
            <div>
              <span className="eyebrow">
                IPL 2029 PREDICTION
              </span>

              <h1>
                Question {currentQuestion + 1}
                <span> / {questions.length}</span>
              </h1>
            </div>

            <div className="question-number">
              {String(currentQuestion + 1).padStart(2, "0")}
            </div>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="question-body">
            <p className="question-text">
              {current?.text}
            </p>

            <p className="selection-hint">
              Select one or more options
            </p>

            <div className="options-grid">
              {current?.options?.map((option) => {
                const selected =
                  selectedOptions.includes(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`option-card ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() =>
                      toggleOption(option.id)
                    }
                  >
                    <span className="option-check">
                      {selected ? "✓" : ""}
                    </span>

                    <span className="option-text">
                      {option.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="question-error">
                {error}
              </div>
            )}
          </div>

          <div className="question-actions">
            <button
              type="button"
              className="back-button"
              onClick={goBack}
              disabled={currentQuestion === 0}
            >
              ← Back
            </button>

            {!isLastQuestion ? (
              <button
                type="button"
                className="next-button"
                onClick={goNext}
              >
                Next Question →
              </button>
            ) : (
              <button
                type="button"
                className="next-button submit-button"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Prediction ✓"}
              </button>
            )}
          </div>
        </section>
      </main>

      <footer className="poll-footer">
        IPL 2029 • Prediction Poll
      </footer>
    </div>
  );
}

export default Poll;
