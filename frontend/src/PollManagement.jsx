
import { useCallback, useEffect, useState } from "react";
import "./PollManagement.css";

const API = `${import.meta.env.VITE_API_URL}/api`;

function PollManagement() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([
    { text: "", options: ["", ""] },
  ]);

  const loadPolls = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/admin/polls/`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "Admin session expired. Please log in again."
            : "Unable to load polls."
        );
      }

      setPolls(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  const updateQuestion = (index, field, value) => {
    setQuestions((current) =>
      current.map((question, i) =>
        i === index ? { ...question, [field]: value } : question
      )
    );
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setQuestions((current) =>
      current.map((question, i) =>
        i === questionIndex
          ? {
              ...question,
              options: question.options.map((option, j) =>
                j === optionIndex ? value : option
              ),
            }
          : question
      )
    );
  };

  const addQuestion = () => {
    setQuestions((current) => [
      ...current,
      { text: "", options: ["", ""] },
    ]);
  };

  const removeQuestion = (index) => {
    setQuestions((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const addOption = (questionIndex) => {
    setQuestions((current) =>
      current.map((question, i) =>
        i === questionIndex
          ? { ...question, options: [...question.options, ""] }
          : question
      )
    );
  };

  const removeOption = (questionIndex, optionIndex) => {
    setQuestions((current) =>
      current.map((question, i) =>
        i === questionIndex
          ? {
              ...question,
              options: question.options.filter(
                (_, j) => j !== optionIndex
              ),
            }
          : question
      )
    );
  };

  const getCsrfToken = async () => {
    const response = await fetch(`${API}/admin/me/`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Please log in again as administrator.");
    }

    const data = await response.json();
    if (!data.csrfToken) {
      throw new Error("Unable to retrieve the security token.");
    }

    return data.csrfToken;
  };

  const createPoll = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!title.trim()) {
      setError("Please enter a poll title.");
      return;
    }

    const cleanedQuestions = questions.map((question) => ({
      text: question.text.trim(),
      options: question.options
        .map((option) => option.trim())
        .filter(Boolean),
    }));

    if (
      cleanedQuestions.some(
        (question) =>
          !question.text ||
          question.options.length < 2
      )
    ) {
      setError(
        "Every question needs text and at least two options."
      );
      return;
    }

    try {
      setSaving(true);

      const csrfToken = await getCsrfToken();

      const response = await fetch(`${API}/admin/polls/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          is_active: true,
          questions: cleanedQuestions.map((question, index) => ({
            text: question.text,
            order: index + 1,
            options: question.options.map((text) => ({ text })),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            JSON.stringify(data) ||
            "Unable to create poll."
        );
      }

      setTitle("");
      setDescription("");
      setQuestions([{ text: "", options: ["", ""] }]);
      setMessage("Poll created successfully!");
      await loadPolls();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (pollId) => {
    const link = `${window.location.origin}/poll/${pollId}`;

    try {
      await navigator.clipboard.writeText(link);
      setMessage(`Share link copied: ${link}`);
      setError("");
    } catch {
      window.prompt("Copy this poll link:", link);
    }
  };

  const togglePoll = async (poll) => {
    setError("");
    setMessage("");

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(
        `${API}/admin/polls/${poll.id}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({
            is_active: !poll.is_active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to update poll status."
        );
      }

      setMessage("Poll status updated.");
      await loadPolls();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="poll-management-page">
      <header className="pm-header">
        <div>
          <p className="pm-eyebrow">POLL ADMINISTRATION</p>
          <h1>Poll Management</h1>
          <p>Create and manage independent polls from one place.</p>
        </div>
        <button className="pm-refresh" onClick={loadPolls}>
          ↻ Refresh
        </button>
      </header>

      {error && <div className="pm-alert pm-error">{error}</div>}
      {message && (
        <div className="pm-alert pm-success">{message}</div>
      )}

      <div className="pm-layout">
        <section className="pm-card">
          <h2>Create a new poll</h2>
          <p className="pm-muted">
            Add a title, description, questions and answer options.
          </p>

          <form onSubmit={createPoll}>
            <label className="pm-label">Poll title</label>
            <input
              className="pm-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. College Election 2026"
              required
            />

            <label className="pm-label">Description</label>
            <textarea
              className="pm-input pm-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this poll is about..."
            />

            <div className="pm-question-heading">
              <h3>Questions</h3>
              <span>{questions.length} total</span>
            </div>

            {questions.map((question, qi) => (
              <div className="pm-question" key={qi}>
                <div className="pm-question-title">
                  <strong>Question {qi + 1}</strong>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      className="pm-remove"
                      onClick={() => removeQuestion(qi)}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <input
                  className="pm-input"
                  value={question.text}
                  onChange={(e) =>
                    updateQuestion(qi, "text", e.target.value)
                  }
                  placeholder="Enter your question"
                  required
                />

                <div className="pm-options">
                  {question.options.map((option, oi) => (
                    <div className="pm-option-row" key={oi}>
                      <input
                        className="pm-input"
                        value={option}
                        onChange={(e) =>
                          updateOption(qi, oi, e.target.value)
                        }
                        placeholder={`Option ${oi + 1}`}
                        required
                      />
                      {question.options.length > 2 && (
                        <button
                          type="button"
                          className="pm-remove"
                          onClick={() => removeOption(qi, oi)}
                          aria-label="Remove option"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="pm-add-option"
                  onClick={() => addOption(qi)}
                >
                  + Add option
                </button>
              </div>
            ))}

            <button
              type="button"
              className="pm-secondary"
              onClick={addQuestion}
            >
              + Add question
            </button>

            <button
              className="pm-primary"
              type="submit"
              disabled={saving}
            >
              {saving ? "Creating..." : "Create poll"}
            </button>
          </form>
        </section>

        <section className="pm-card pm-list-card">
          <div className="pm-list-heading">
            <div>
              <h2>Your polls</h2>
              <p className="pm-muted">
                Each poll has its own participants and results.
              </p>
            </div>
            <span className="pm-count">{polls.length}</span>
          </div>

          {loading ? (
            <p className="pm-muted">Loading polls...</p>
          ) : polls.length === 0 ? (
            <p className="pm-muted">No polls found.</p>
          ) : (
            <div className="pm-poll-list">
              {polls.map((poll) => (
                <article className="pm-poll-item" key={poll.id}>
                  <div className="pm-poll-top">
                    <div>
                      <span className="pm-poll-id">
                        POLL #{poll.id}
                      </span>
                      <h3>{poll.title}</h3>
                    </div>
                    <span
                      className={
                        poll.is_active
                          ? "pm-status pm-open"
                          : "pm-status pm-closed"
                      }
                    >
                      {poll.is_active ? "Open" : "Closed"}
                    </span>
                  </div>

                  <p className="pm-description">
                    {poll.description || "No description provided."}
                  </p>

                  <p className="pm-question-total">
                    {poll.questions?.length || 0} questions
                  </p>

                  <div className="pm-actions">
                    <button
                      className="pm-primary pm-small"
                      onClick={() => copyLink(poll.id)}
                    >
                      Copy share link
                    </button>
                    <button
                      className="pm-secondary pm-small"
                      onClick={() => togglePoll(poll)}
                    >
                      {poll.is_active ? "Close poll" : "Open poll"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default PollManagement;
