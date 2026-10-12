import { useCallback, useEffect, useMemo, useState } from "react";
import "./Analytics.css";


const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:8082"
    : "https://ipl-2029-backend.onrender.com");


function Analytics({ username, onLogout }) {
  const [polls, setPolls] = useState([]);
  const [selectedPollId, setSelectedPollId] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [pollsLoading, setPollsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [participantsCountFromList, setParticipantsCountFromList] =
    useState(null);

  const selectedPoll = useMemo(
    () =>
      polls.find(
        (poll) => String(poll.id) === String(selectedPollId)
      ) || null,
    [polls, selectedPollId]
  );

  const fetchPolls = useCallback(async () => {
    setPollsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/public/polls/`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Unable to load the available polls.");
      }

      const data = await response.json();
      const pollList = Array.isArray(data) ? data : [];

      setPolls(pollList);

      setSelectedPollId((currentId) => {
        if (
          currentId &&
          pollList.some(
            (poll) => String(poll.id) === String(currentId)
          )
        ) {
          return currentId;
        }

        return pollList.length ? String(pollList[0].id) : "";
      });
    } catch (err) {
      setError(err.message || "Unable to load polls.");
    } finally {
      setPollsLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(
    async (pollId, isRefresh = false) => {
      if (!pollId) {
        setAnalytics(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setRefreshing(isRefresh);
      setError("");

      try {
        const url = new URL(`${API_BASE}/api/admin/analytics/`);
        url.searchParams.set("poll_id", pollId);

        const response = await fetch(url.toString(), {
          method: "GET",
          credentials: "include",
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "You are not authorized to view analytics. Please log in again."
          );
        }

        if (!response.ok) {
          throw new Error(
            "Failed to load analytics for the selected poll."
          );
        }

        const data = await response.json();
        setAnalytics(data);

        // Fallback: count distinct participants linked to this poll's questions.
        try {
          const participantsResponse = await fetch(
            `${API_BASE}/api/admin/participants/`,
            {
              method: "GET",
              credentials: "include",
            }
          );

          if (participantsResponse.ok) {
            const participantsData =
              await participantsResponse.json();

            const participantList = Array.isArray(participantsData)
              ? participantsData
              : Array.isArray(participantsData?.results)
                ? participantsData.results
                : [];

            const questionNames = new Set(
              (data?.questions || [])
                .map((question) =>
                  String(
                    question?.question ||
                      question?.text ||
                      question?.title ||
                      ""
                  )
                    .trim()
                    .toLowerCase()
                )
                .filter(Boolean)
            );

            const matchingParticipantIds = new Set();

            participantList.forEach((participant, index) => {
              const participantResponses = Array.isArray(
                participant?.responses
              )
                ? participant.responses
                : [];

              const matchesPoll = participantResponses.some((item) =>
                questionNames.has(
                  String(
                    item?.question || item?.question_text || ""
                  )
                    .trim()
                    .toLowerCase()
                )
              );

              if (matchesPoll) {
                matchingParticipantIds.add(
                  participant?.id ??
                    participant?.participant_id ??
                    `participant-${index}`
                );
              }
            });

            setParticipantsCountFromList(
              matchingParticipantIds.size
            );
          } else {
            setParticipantsCountFromList(null);
          }
        } catch {
          setParticipantsCountFromList(null);
        }
      } catch (err) {
        setAnalytics(null);
        setError(err.message || "Unable to load analytics.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  useEffect(() => {
    if (selectedPollId) {
      fetchAnalytics(selectedPollId);
    } else if (!pollsLoading) {
      setAnalytics(null);
      setLoading(false);
    }
  }, [selectedPollId, fetchAnalytics, pollsLoading]);

  const handlePollChange = (event) => {
    setSelectedPollId(event.target.value);
  };

  const handleRefresh = () => {
    if (selectedPollId) {
      fetchAnalytics(selectedPollId, true);
    } else {
      fetchPolls();
    }
  };

  const getInitial = () =>
    username?.trim()?.charAt(0)?.toUpperCase() || "A";

  const getQuestionText = (question) =>
    question?.question ||
    question?.text ||
    question?.title ||
    "Question";

  const getOptionName = (option) =>
    option?.option ||
    option?.text ||
    option?.name ||
    "Unknown option";

  const getPercentage = (question, option) => {
    const backendPercentage = Number(option?.percentage);

    if (
      option?.percentage !== undefined &&
      option?.percentage !== null &&
      option?.percentage !== "" &&
      Number.isFinite(backendPercentage)
    ) {
      return Math.max(0, Math.min(100, backendPercentage));
    }

    const total = Number(question?.total_responses || 0);
    const count = Number(option?.count || 0);

    return total > 0
      ? Math.max(0, Math.min(100, (count / total) * 100))
      : 0;
  };

  const questions = analytics?.questions || [];
  const firstQuestion = questions[0] || null;

  const apiParticipantsCount = Number(
    analytics?.summary?.participants ??
      analytics?.summary?.total_participants ??
      0
  );

  const totalParticipants =
    apiParticipantsCount > 0
      ? apiParticipantsCount
      : Number(participantsCountFromList ?? 0);

  const totalResponses = Number(
    analytics?.summary?.total_responses ??
      questions.reduce(
        (sum, question) =>
          sum + Number(question?.total_responses || 0),
        0
      )
  );

  const totalQuestions = questions.length;

  const topOption = useMemo(() => {
    if (!firstQuestion?.options?.length) {
      return null;
    }

    return firstQuestion.options.reduce((best, current) => {
      if (!best) return current;

      return Number(current?.count || 0) >
        Number(best?.count || 0)
        ? current
        : best;
    }, null);
  }, [firstQuestion]);

  const createDonutGradient = (question) => {
    const options = (question?.options || []).filter(
      (option) => Number(option?.count || 0) > 0
    );

    const total = options.reduce(
      (sum, option) => sum + Number(option.count || 0),
      0
    );

    if (!total) {
      return "conic-gradient(#24334d 0deg 360deg)";
    }

    const colors = [
      "#ff4d6d",
      "#4da3ff",
      "#8b5cf6",
      "#00d4ff",
      "#22c55e",
      "#f59e0b",
      "#ec4899",
      "#14b8a6",
      "#a78bfa",
      "#fb7185",
    ];

    let currentDegree = 0;

    const parts = options.map((option, index) => {
      const degrees =
        (Number(option.count || 0) / total) * 360;

      const start = currentDegree;
      const end = start + degrees;
      currentDegree = end;

      return `${colors[index % colors.length]} ${start}deg ${end}deg`;
    });

    return `conic-gradient(${parts.join(", ")})`;
  };

  return (
    <div className="analytics-page">
      <aside className="analytics-sidebar">
        <div>
          <div className="analytics-brand">
            <div className="analytics-brand-icon">🏏</div>
            <div>
              <h2>PollSpace</h2>
              <span>ADMIN PANEL</span>
            </div>
          </div>

          <nav className="analytics-nav">
            <a
              href="/admin/dashboard"
              className="analytics-nav-link"
            >
              <span className="analytics-nav-icon">▦</span>
              <span>Dashboard</span>
            </a>

            <a
              href="/admin/analytics"
              className="analytics-nav-link active"
            >
              <span className="analytics-nav-icon">◈</span>
              <span>Analytics</span>
            </a>
          </nav>
        </div>

        <div className="analytics-sidebar-bottom">
          <div className="analytics-user">
            <div className="analytics-avatar">{getInitial()}</div>
            <div className="analytics-user-info">
              <strong>{username || "Admin"}</strong>
              <span>Administrator</span>
            </div>
          </div>

          <button
            className="analytics-logout"
            onClick={onLogout}
            type="button"
          >
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="analytics-main">
        <header className="analytics-header">
          <div>
            <span className="analytics-eyebrow">
              POLL PERFORMANCE
            </span>
            <h1>Analytics Overview</h1>
            <p>
              Explore participation, response totals, and
              question-wise results for each poll.
            </p>
          </div>

          <div className="analytics-header-actions">
            <button
              className="analytics-refresh"
              type="button"
              onClick={handleRefresh}
              disabled={loading || pollsLoading}
            >
              {refreshing ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </header>

        <section className="analytics-poll-selector">
          <div>
            <label htmlFor="analytics-poll-select">
              SELECT POLL
            </label>
            <h2>{selectedPoll?.title || "Choose a poll"}</h2>
            <p>Analytics below are for the selected poll.</p>
          </div>

          <select
            id="analytics-poll-select"
            className="analytics-select"
            value={selectedPollId}
            onChange={handlePollChange}
            disabled={pollsLoading || polls.length === 0}
          >
            {pollsLoading && (
              <option value="">Loading polls...</option>
            )}

            {!pollsLoading && polls.length === 0 && (
              <option value="">No polls available</option>
            )}

            {polls.map((poll) => (
              <option key={poll.id} value={String(poll.id)}>
                {poll.title || `Poll ${poll.id}`}
              </option>
            ))}
          </select>
        </section>

        {error && (
          <div className="analytics-error">
            <h2>Unable to load analytics</h2>
            <p>{error}</p>
            <button
              className="analytics-refresh"
              type="button"
              onClick={handleRefresh}
            >
              Try again
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="analytics-loading-screen">
            <div className="analytics-spinner" />
            <h2>Loading Analytics</h2>
            <p>
              Please wait while we load results for{" "}
              {selectedPoll?.title || "the selected poll"}.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          !pollsLoading &&
          polls.length === 0 && (
            <div className="analytics-empty">
              <h2>No polls available</h2>
              <p>
                There are no polls available from the poll-list
                endpoint.
              </p>
            </div>
          )}

        {!loading && !error && analytics && (
          <>
            <section className="analytics-summary-grid">
              <article
                className="analytics-stat-card"
                style={{ "--stat-color": "#4da3ff" }}
              >
                <div className="analytics-stat-top">
                  <span className="analytics-stat-label">
                    Total Participants
                  </span>
                  <span className="analytics-stat-icon">👥</span>
                </div>
                <div className="analytics-stat-value">
                  {totalParticipants.toLocaleString()}
                </div>
                <div className="analytics-stat-foot">
                  Participants in this poll
                </div>
              </article>

              <article
                className="analytics-stat-card"
                style={{ "--stat-color": "#22c55e" }}
              >
                <div className="analytics-stat-top">
                  <span className="analytics-stat-label">
                    Total Responses
                  </span>
                  <span className="analytics-stat-icon">📊</span>
                </div>
                <div className="analytics-stat-value">
                  {totalResponses.toLocaleString()}
                </div>
                <div className="analytics-stat-foot">
                  Responses across all questions
                </div>
              </article>

              <article
                className="analytics-stat-card"
                style={{ "--stat-color": "#a78bfa" }}
              >
                <div className="analytics-stat-top">
                  <span className="analytics-stat-label">
                    Total Questions
                  </span>
                  <span className="analytics-stat-icon">❔</span>
                </div>
                <div className="analytics-stat-value">
                  {totalQuestions.toLocaleString()}
                </div>
                <div className="analytics-stat-foot">
                  Questions in this poll
                </div>
              </article>
            </section>

            <section className="analytics-content-grid">
              <article className="analytics-panel">
                <div className="analytics-panel-heading">
                  <div>
                    <h2>Selected Poll Overview</h2>
                    <p>Details for the current poll.</p>
                  </div>
                  <span className="analytics-pill">OVERVIEW</span>
                </div>

                <div className="analytics-poll-details">
                  <div className="analytics-detail-row">
                    <span>Poll title</span>
                    <strong>
                      {analytics?.poll?.title ||
                        selectedPoll?.title ||
                        "Selected poll"}
                    </strong>
                  </div>

                  <div className="analytics-detail-row">
                    <span>Poll ID</span>
                    <strong>
                      {analytics?.poll?.id ?? selectedPollId}
                    </strong>
                  </div>

                  <div className="analytics-detail-row">
                    <span>Questions</span>
                    <strong>{totalQuestions}</strong>
                  </div>

                  <div className="analytics-detail-row">
                    <span>Participants</span>
                    <strong>{totalParticipants}</strong>
                  </div>

                  <div className="analytics-detail-row">
                    <span>Total responses</span>
                    <strong>{totalResponses}</strong>
                  </div>
                </div>
              </article>

              <article className="analytics-panel">
                <div className="analytics-panel-heading">
                  <div>
                    <h2>Top Option</h2>
                    <p>Leading option for the first question.</p>
                  </div>
                  <span className="analytics-pill">RESULTS</span>
                </div>

                {firstQuestion && topOption ? (
                  <div className="analytics-top-option">
                    <div
                      className="analytics-donut"
                      style={{
                        background: createDonutGradient(firstQuestion),
                      }}
                    >
                      <div className="analytics-donut-center">
                        <strong>
                          {Math.round(
                            getPercentage(firstQuestion, topOption)
                          )}
                          %
                        </strong>
                        <span>TOP OPTION</span>
                      </div>
                    </div>

                    <div className="analytics-top-copy">
                      <small>{getQuestionText(firstQuestion)}</small>
                      <h3>{getOptionName(topOption)}</h3>
                      <p>
                        {Number(topOption.count || 0)} responses
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="analytics-empty">
                    <p>
                      No option results are available for this poll yet.
                    </p>
                  </div>
                )}
              </article>
            </section>

            <section className="analytics-results-section">
              <div className="analytics-panel-heading">
                <div>
                  <h2>Question-wise Results</h2>
                  <p>
                    Response counts and percentages for every option.
                  </p>
                </div>
                <span className="analytics-pill">
                  {totalQuestions} QUESTIONS
                </span>
              </div>

              {questions.length === 0 ? (
                <div className="analytics-empty">
                  <h2>No question results yet</h2>
                  <p>
                    This poll does not currently have question results
                    to display.
                  </p>
                </div>
              ) : (
                <div className="analytics-question-list">
                  {questions.map((question, index) => {
                    const options = question?.options || [];

                    const questionTotal = Number(
                      question?.total_responses ||
                        options.reduce(
                          (sum, option) =>
                            sum + Number(option?.count || 0),
                          0
                        )
                    );

                    return (
                      <article
                        className="analytics-question-card"
                        key={question.id ?? index}
                      >
                        <div className="analytics-question-heading">
                          <div className="analytics-question-number">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <div>
                            <h3>{getQuestionText(question)}</h3>
                            <p>
                              {questionTotal.toLocaleString()} total
                              responses
                            </p>
                          </div>
                        </div>

                        {options.length === 0 ? (
                          <div className="analytics-empty">
                            <p>
                              No options or results are available for
                              this question.
                            </p>
                          </div>
                        ) : (
                          <div className="analytics-option-list">
                            {options.map((option, optionIndex) => {
                              const percentage = getPercentage(
                                question,
                                option
                              );

                              const colors = [
                                "#4da3ff",
                                "#22c55e",
                                "#a78bfa",
                                "#f59e0b",
                                "#ff4d6d",
                                "#00d4ff",
                              ];

                              return (
                                <div
                                  className="analytics-option"
                                  key={option.id ?? optionIndex}
                                >
                                  <div className="analytics-option-top">
                                    <span className="analytics-option-name">
                                      {getOptionName(option)}
                                    </span>
                                    <span className="analytics-option-count">
                                      {Number(
                                        option?.count || 0
                                      ).toLocaleString()}{" "}
                                      votes
                                    </span>
                                  </div>

                                  <div className="analytics-progress-track">
                                    <div
                                      className="analytics-progress-fill"
                                      style={{
                                        width: `${percentage}%`,
                                        background: `linear-gradient(90deg, ${colors[optionIndex % colors.length]}, #55c7ff)`,
                                      }}
                                    />
                                  </div>

                                  <div className="analytics-option-bottom">
                                    <span>
                                      {Number(
                                        option?.count || 0
                                      ).toLocaleString()}{" "}
                                      responses
                                    </span>
                                    <strong>
                                      {percentage.toFixed(1)}%
                                    </strong>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <footer className="analytics-footer">
              PollSpace Analytics · Showing results for{" "}
              {analytics?.poll?.title ||
                selectedPoll?.title ||
                "the selected poll"}
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

export default Analytics;