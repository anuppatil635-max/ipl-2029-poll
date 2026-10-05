import { useEffect, useMemo, useState } from "react";

function Analytics({ username, onLogout }) {

  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // =========================================================

  // FETCH ANALYTICS

  // =========================================================

  const fetchAnalytics = async () => {

    try {

      setLoading(true);

      setError("");

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/analytics/`, 
        {

        method: "GET",

        credentials: "include",

      });

      if (!response.ok) {

        if (response.status === 401 || response.status === 403) {

          throw new Error(

            "You are not authorized to view analytics."

          );

        }

        throw new Error("Failed to load analytics.");

      }

      const data = await response.json();

      console.log("Analytics API response:", data);

      setAnalytics(data);

    } catch (error) {

      console.error("Analytics error:", error);

      setError(error.message);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    fetchAnalytics();

  }, []);

  // =========================================================

  // ADMIN INITIAL

  // =========================================================

  const getInitial = () => {

    if (!username) {

      return "A";

    }

    return username.charAt(0).toUpperCase();

  };

  // =========================================================

  // SAFE QUESTION TEXT

  // =========================================================

  const getQuestionText = (question) => {

    return (

      question?.question ||

      question?.text ||

      "Question"

    );

  };

  // =========================================================

  // SAFE OPTION NAME

  // =========================================================

  const getOptionName = (option) => {

    return (

      option?.option ||

      option?.text ||

      "Unknown option"

    );

  };

  // =========================================================

  // GET OPTION PERCENTAGE

  // =========================================================

  const getPercentage = (question, option) => {

    const backendPercentage = Number(option?.percentage);

    if (!Number.isNaN(backendPercentage)) {

      return backendPercentage;

    }

    const total = Number(

      question?.total_responses || 0

    );

    const count = Number(

      option?.count || 0

    );

    if (!total) {

      return 0;

    }

    return (count / total) * 100;

  };

  // =========================================================

  // FIRST QUESTION

  // =========================================================

  const firstQuestion =
    analytics?.questions?.[0] || null;

  // =========================================================
  // ROBUST SUMMARY VALUES
  // =========================================================
  // Use question-level data as a fallback if the backend summary
  // contains zero values even though responses are available.
  const totalParticipants =
    Number(analytics?.summary?.participants || 0) ||
    Number(firstQuestion?.total_responses || 0);

  const totalResponses =
    Number(analytics?.summary?.total_responses || 0) ||
    (analytics?.questions || []).reduce(
      (sum, question) =>
        sum + Number(question?.total_responses || 0),
      0
    );

  const totalQuestions =
    analytics?.questions?.length || 0;

  // =========================================================

  // TOP OPTION

  // =========================================================

  const topOption = useMemo(() => {

    if (!firstQuestion?.options?.length) {

      return null;

    }

    return firstQuestion.options.reduce(

      (best, current) => {

        if (!best) {

          return current;

        }

        return Number(current.count || 0) >

          Number(best.count || 0)

          ? current

          : best;

      },

      null

    );

  }, [firstQuestion]);

  // =========================================================

  // DONUT CHART

  // =========================================================

  const createDonutGradient = (question) => {

    if (!question?.options?.length) {

      return "conic-gradient(#1e3a5f 0deg 360deg)";

    }

    const validOptions = question.options.filter(

      (option) => Number(option.count || 0) > 0

    );

    if (!validOptions.length) {

      return "conic-gradient(#1e3a5f 0deg 360deg)";

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

    const total = validOptions.reduce(

      (sum, option) =>

        sum + Number(option.count || 0),

      0

    );

    if (!total) {

      return "conic-gradient(#1e3a5f 0deg 360deg)";

    }

    let currentDegree = 0;

    const parts = validOptions.map(

      (option, index) => {

        const percentage =

          (Number(option.count || 0) / total) *

          100;

        const degrees = percentage * 3.6;

        const start = currentDegree;

        const end = currentDegree + degrees;

        currentDegree = end;

        return `${

          colors[index % colors.length]

        } ${start}deg ${end}deg`;

      }

    );

    return `conic-gradient(${parts.join(", ")})`;

  };

  // =========================================================

  // LOADING

  // =========================================================

  if (loading) {

    return (

      <div className="analytics-page">

        <style>{analyticsStyles}</style>

        <div className="analytics-loading-screen">

          <div className="analytics-spinner"></div>

          <h2>Loading Analytics</h2>

          <p>

            Please wait while we load the poll results...

          </p>

        </div>

      </div>

    );

  }

  // =========================================================

  // MAIN UI

  // =========================================================

  return (

    <div className="analytics-page">

      <style>{analyticsStyles}</style>

      {/* =====================================================

          SIDEBAR

      \====================================================== */}

      <aside className="analytics-sidebar">

        <div>

          {/* BRAND */}

          <div className="analytics-brand">

            <div className="analytics-brand-icon">

              🏏

            </div>

            <div>

              <h2>IPL 2029</h2>

              <span>ADMIN PANEL</span>

            </div>

          </div>

          {/* NAVIGATION */}

          <nav className="analytics-nav">

            <a

              href="/admin/dashboard"

              className="analytics-nav-link"

            >

              <span className="analytics-nav-icon">

                ▦

              </span>

              <span>Dashboard</span>

            </a>

            <a

              href="/admin/analytics"

              className="analytics-nav-link active"

            >

              <span className="analytics-nav-icon">

                ◈

              </span>

              <span>Analytics</span>

            </a>

          </nav>

        </div>

        {/* SIDEBAR BOTTOM */}

        <div className="analytics-sidebar-bottom">

          <div className="analytics-user">

            <div className="analytics-avatar">

              {getInitial()}

            </div>

            <div className="analytics-user-info">

              <strong>

                {username || "Admin"}

              </strong>

              <span>Administrator</span>

            </div>

          </div>

          <button

            className="analytics-logout"

            onClick={onLogout}

          >

            ↪   Logout

          </button>

        </div>

      </aside>

      {/* =====================================================

          MAIN

      \====================================================== */}

      <main className="analytics-main">

        <div className="analytics-container">

          {/* =================================================

              HEADER

          \================================================== */}

          <header className="analytics-header">

            <div>

              <div className="analytics-eyebrow">

                IPL 2029

              </div>

              <h1>Analytics</h1>

              <p>

                Detailed insights from your IPL 2029

                prediction poll

              </p>

            </div>

            <div className="analytics-header-actions">

              <div className="analytics-logged-user">

                Logged in as{" "}

                <strong>

                  {username}

                </strong>

              </div>

              <button

                className="analytics-refresh"

                onClick={fetchAnalytics}

              >

                ↻   Refresh

              </button>

            </div>

          </header>

          {/* =================================================

              ERROR

          \================================================== */}

          {error && (

            <div className="analytics-error">

              <div className="analytics-error-icon">

                !

              </div>

              <div>

                <strong>

                  Unable to load analytics

                </strong>

                <p>{error}</p>

              </div>

              <button onClick={fetchAnalytics}>

                Try Again

              </button>

            </div>

          )}

          {/* =================================================

              CONTENT

          \================================================== */}

          {!error && analytics && (

            <>

              {/* =================================================

                  SUMMARY CARDS

              \================================================== */}

              <section className="analytics-summary">

                <div className="summary-card">

                  <div className="summary-icon blue">

                    👥

                  </div>

                  <div>

                    <span>

                      Total Participants

                    </span>

                    <strong>

                      {totalParticipants}

                    </strong>

                    <small>

                      People submitted the poll

                    </small>

                  </div>

                </div>

                <div className="summary-card">

                  <div className="summary-icon purple">

                    ✓

                  </div>

                  <div>

                    <span>

                      Total Responses

                    </span>

                    <strong>

                      {totalResponses}

                    </strong>

                    <small>

                      Answers recorded

                    </small>

                  </div>

                </div>

                <div className="summary-card">

                  <div className="summary-icon cyan">

                    ?

                  </div>

                  <div>

                    <span>

                      Total Questions

                    </span>

                    <strong>

                      {totalQuestions}

                    </strong>

                    <small>

                      Questions in this poll

                    </small>

                  </div>

                </div>

                <div className="summary-card">

                  <div className="summary-icon green">

                    ●

                  </div>

                  <div>

                    <span>

                      Poll Status

                    </span>

                    <strong

                      className={

                        analytics.poll?.is_active

                          ? "status-active"

                          : "status-closed"

                      }

                    >

                      {analytics.poll?.is_active

                        ? "Active"

                        : "Closed"}

                    </strong>

                    <small>

                      Current voting status

                    </small>

                  </div>

                </div>

              </section>

              {/* =================================================

                  POLL OVERVIEW

              \================================================== */}

              <section className="poll-overview">

                <div>

                  <div className="overview-label">

                    POLL OVERVIEW

                  </div>

                  <h2>

                    {analytics.poll?.title ||

                      "IPL 2029 Prediction Poll"}

                  </h2>

                  <p>

                    Complete response breakdown

                    for your prediction poll.

                  </p>

                </div>

                <div

                  className={

                    analytics.poll?.is_active

                      ? "poll-status active"

                      : "poll-status closed"

                  }

                >

                  <span className="status-dot"></span>

                  {analytics.poll?.is_active

                    ? "POLL OPEN"

                    : "POLL CLOSED"}

                </div>

              </section>

              {/* =================================================

                  TOP PREDICTION

              \================================================== */}

              {firstQuestion && (

                <section className="top-prediction">

                  <div className="top-prediction-info">

                    <div className="section-label">

                      TOP PREDICTION

                    </div>

                    <h2>

                      {getQuestionText(

                        firstQuestion

                      )}

                    </h2>

                    <p>

                      Team prediction breakdown

                      submitted by participants.

                    </p>

                    {topOption && (

                      <div className="leading-option">

                        Leading prediction:{" "}

                        <strong>

                          {getOptionName(topOption)}

                        </strong>

                      </div>

                    )}

                  </div>

                  <div className="donut-area">

                    <div

                      className="donut-chart"

                      style={{

                        background:

                          createDonutGradient(

                            firstQuestion

                          ),

                      }}

                    >

                      <div className="donut-inner">

                        <strong>

                          {topOption

                            ? topOption.count

                            : 0}

                        </strong>

                        <span>

                          TOP VOTES

                        </span>

                      </div>

                    </div>

                    <div className="donut-legend">

                      {firstQuestion.options

                        ?.filter(

                          (option) =>

                            Number(

                              option.count || 0

                            ) > 0

                        )

                        .map(

                          (option, index) => {

                            const colors = [

                              "#ff4d6d",

                              "#4da3ff",

                              "#8b5cf6",

                              "#00d4ff",

                              "#22c55e",

                              "#f59e0b",

                            ];

                            return (

                              <div

                                className="legend-item"

                                key={

                                  option.option_id

                                }

                              >

                                <div className="legend-name">

                                  <span

                                    className="legend-dot"

                                    style={{

                                      background:

                                        colors[

                                          index %

                                            colors.length

                                        ],

                                    }}

                                  ></span>

                                  <span>

                                    {getOptionName(

                                      option

                                    )}

                                  </span>

                                </div>

                                <strong>

                                  {option.count}

                                </strong>

                              </div>

                            );

                          }

                        )}

                    </div>

                  </div>

                </section>

              )}

              {/* =================================================

                  ALL QUESTIONS

              \================================================== */}

              <section className="questions-section">

                <div className="section-heading">

                  <div>

                    <div className="section-label">

                      RESPONSE BREAKDOWN

                    </div>

                    <h2>

                      Question Results

                    </h2>

                    <p>

                      See every option, vote count

                      and percentage for all

                      questions.

                    </p>

                  </div>

                  <div className="question-count">

                    {analytics.questions

                      ?.length || 0}{" "}

                    Questions

                  </div>

                </div>

                {/* IMPORTANT:

                    This maps ALL questions.

                    Q1, Q2, Q3, Q4, Q5

                */}

                <div className="question-grid">

                  {analytics.questions?.map(

                    (question, questionIndex) => {

                      return (

                        <article

                          className="question-card"

                          key={

                            question.question_id ||

                            questionIndex

                          }

                        >

                          {/* QUESTION HEADER */}

                          <div className="question-header">

                            <div className="question-number">

                              {String(

                                questionIndex + 1

                              ).padStart(2, "0")}

                            </div>

                            <div className="question-title">

                              <span>

                                QUESTION{" "}

                                {questionIndex + 1}

                              </span>

                              <h3>

                                {getQuestionText(

                                  question

                                )}

                              </h3>

                            </div>

                            <div className="question-total">

                              <strong>

                                {question.total_responses ??

                                  0}

                              </strong>

                              <span>

                                RESPONSES

                              </span>

                            </div>

                          </div>

                          {/* ALL OPTIONS */}

                          <div className="options-list">

                            {question.options?.map(

                              (option) => {

                                const count =

                                  Number(

                                    option.count || 0

                                  );

                                const percentage =

                                  getPercentage(

                                    question,

                                    option

                                  );

                                return (

                                  <div

                                    className="option-row"

                                    key={

                                      option.option_id

                                    }

                                  >

                                    {/* OPTION NAME + STATS */}

                                    <div className="option-top">

                                      <span className="option-name">

                                        {getOptionName(

                                          option

                                        )}

                                      </span>

                                      <div className="option-stats">

                                        <strong>

                                          {count}

                                        </strong>

                                        <span>

                                          {percentage.toFixed(

                                            1

                                          )}

                                          %

                                        </span>

                                      </div>

                                    </div>

                                    {/* PROGRESS BAR */}

                                    <div className="progress-track">

                                      <div

                                        className="progress-fill"

                                        style={{

                                          width: `${Math.min(

                                            percentage,

                                            100

                                          )}%`,

                                        }}

                                      ></div>

                                    </div>

                                  </div>

                                );

                              }

                            )}

                          </div>

                        </article>

                      );

                    }

                  )}

                </div>

              </section>

            </>

          )}

        </div>

      </main>

    </div>

  );

}

const analyticsStyles = `

/* =========================================================

   GLOBAL

\========================================================= */

* {

  box-sizing: border-box;

}

.analytics-page {

  min-height: 100vh;

  width: 100%;

  display: flex;

  background:

    radial-gradient(

      circle at 80% 10%,

      rgba(37, 99, 235, 0.16),

      transparent 30%

    ),

    radial-gradient(

      circle at 20% 80%,

      rgba(59, 130, 246, 0.10),

      transparent 30%

    ),

    #07111f;

  color: #f8fafc;

  font-family:

    Inter,

    ui-sans-serif,

    system-ui,

    -apple-system,

    BlinkMacSystemFont,

    "Segoe UI",

    sans-serif;

}

/* =========================================================

   SIDEBAR

\========================================================= */

.analytics-sidebar {

  width: 250px;

  min-width: 250px;

  min-height: 100vh;

  position: sticky;

  top: 0;

  display: flex;

  flex-direction: column;

  padding: 28px 18px 20px;

  background:

    linear-gradient(

      180deg,

      #0b1729 0%,

      #081221 55%,

      #060e1a 100%

    );

  border-right:

    1px solid rgba(148, 163, 184, 0.14);

  box-shadow:

    12px 0 40px rgba(0, 0, 0, 0.20);

  z-index: 10;

}

.analytics-brand {

  display: flex;

  align-items: center;

  gap: 12px;

  padding:

    4px 8px 28px;

}

.analytics-brand-icon {

  width: 44px;

  height: 44px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 13px;

  background:

    linear-gradient(

      135deg,

      #ff405f,

      #dc143c

    );

  font-size: 22px;

  box-shadow:

    0 10px 25px rgba(220, 20, 60, 0.25);

}

.analytics-brand h2 {

  margin: 0;

  color: #ffffff;

  font-size: 18px;

  font-weight: 800;

}

.analytics-brand span {

  display: block;

  margin-top: 3px;

  color: #64748b;

  font-size: 10px;

  font-weight: 700;

  letter-spacing: 1.4px;

}

.analytics-nav {

  display: flex;

  flex-direction: column;

  gap: 8px;

}

.analytics-nav-link {

  min-height: 46px;

  display: flex;

  align-items: center;

  gap: 12px;

  padding: 0 14px;

  border-radius: 11px;

  color: #8da2bf;

  text-decoration: none;

  font-size: 14px;

  font-weight: 650;

  transition: 0.2s ease;

}

.analytics-nav-link:hover {

  color: #ffffff;

  background:

    rgba(59, 130, 246, 0.10);

}

.analytics-nav-link.active {

  color: #ffffff;

  background:

    linear-gradient(

      135deg,

      #ef3340,

      #d91e36

    );

  box-shadow:

    0 8px 22px rgba(239, 51, 64, 0.24);

}

.analytics-nav-icon {

  width: 22px;

  text-align: center;

  font-size: 17px;

}

.analytics-sidebar-bottom {

  margin-top: auto;

  padding-top: 22px;

  border-top:

    1px solid rgba(148, 163, 184, 0.12);

}

.analytics-user {

  display: flex;

  align-items: center;

  gap: 11px;

  padding:

    5px 7px 16px;

}

.analytics-avatar {

  width: 38px;

  height: 38px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 50%;

  background:

    linear-gradient(

      135deg,

      #1d4ed8,

      #2563eb

    );

  color: white;

  font-size: 14px;

  font-weight: 800;

}

.analytics-user-info {

  min-width: 0;

}

.analytics-user-info strong {

  display: block;

  color: white;

  font-size: 13px;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}

.analytics-user-info span {

  display: block;

  margin-top: 3px;

  color: #64748b;

  font-size: 11px;

}

.analytics-logout {

  width: 100%;

  height: 42px;

  border:

    1px solid rgba(96, 165, 250, 0.14);

  border-radius: 10px;

  background:

    rgba(30, 64, 175, 0.16);

  color: #b9cdf0;

  font-size: 13px;

  font-weight: 700;

  cursor: pointer;

  transition: 0.2s ease;

}

.analytics-logout:hover {

  background:

    rgba(239, 68, 68, 0.12);

  color: #fda4af;

}

/* =========================================================

   MAIN

\========================================================= */

.analytics-main {

  flex: 1;

  min-width: 0;

  padding: 34px 42px 60px;

}

.analytics-container {

  width: 100%;

  max-width: 1500px;

  margin: 0 auto;

}

/* =========================================================

   HEADER

\========================================================= */

.analytics-header {

  display: flex;

  align-items: flex-end;

  justify-content: space-between;

  gap: 30px;

  padding-bottom: 26px;

  margin-bottom: 8px;

}

.analytics-eyebrow {

  display: inline-flex;

  align-items: center;

  color: #fb7185;

  font-size: 11px;

  font-weight: 800;

  letter-spacing: 2px;

  margin-bottom: 8px;

}

.analytics-eyebrow::before {

  content: "";

  width: 22px;

  height: 2px;

  margin-right: 7px;

  border-radius: 5px;

  background: #fb7185;

}

.analytics-header h1 {

  margin: 0;

  color: #ffffff;

  font-size: clamp(30px, 3vw, 42px);

  line-height: 1.05;

  font-weight: 850;

  letter-spacing: -1.4px;

}

.analytics-header p {

  margin: 9px 0 0;

  color: #7890b2;

  font-size: 14px;

}

.analytics-header-actions {

  display: flex;

  flex-direction: column;

  align-items: flex-end;

  gap: 10px;

}

.analytics-logged-user {

  color: #7f95b5;

  font-size: 12px;

}

.analytics-logged-user strong {

  color: #e2e8f0;

}

.analytics-refresh {

  height: 38px;

  padding: 0 15px;

  border:

    1px solid rgba(96, 165, 250, 0.20);

  border-radius: 9px;

  background:

    rgba(15, 39, 73, 0.70);

  color: #c8dcfa;

  font-size: 12px;

  font-weight: 700;

  cursor: pointer;

}

.analytics-refresh:hover {

  background:

    rgba(37, 99, 235, 0.20);

  color: white;

}

/* =========================================================

   SUMMARY

\========================================================= */

.analytics-summary {

  display: grid;

  grid-template-columns:

    repeat(4, minmax(0, 1fr));

  gap: 16px;

  margin-top: 8px;

  margin-bottom: 26px;

}

.summary-card {

  min-height: 116px;

  display: flex;

  align-items: center;

  gap: 15px;

  padding: 20px;

  border:

    1px solid rgba(96, 165, 250, 0.14);

  border-radius: 16px;

  background:

    linear-gradient(

      145deg,

      rgba(15, 34, 61, 0.96),

      rgba(8, 23, 41, 0.96)

    );

  box-shadow:

    0 12px 30px rgba(0, 0, 0, 0.16);

}

.summary-icon {

  width: 48px;

  height: 48px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 13px;

  font-size: 20px;

  flex-shrink: 0;

}

.summary-icon.blue {

  background:

    rgba(37, 99, 235, 0.17);

  color: #60a5fa;

}

.summary-icon.purple {

  background:

    rgba(139, 92, 246, 0.17);

  color: #a78bfa;

}

.summary-icon.cyan {

  background:

    rgba(6, 182, 212, 0.15);

  color: #22d3ee;

}

.summary-icon.green {

  background:

    rgba(34, 197, 94, 0.14);

  color: #4ade80;

}

.summary-card span {

  display: block;

  color: #8095b4;

  font-size: 11px;

  font-weight: 700;

  text-transform: uppercase;

  letter-spacing: 0.6px;

}

.summary-card strong {

  display: block;

  margin-top: 4px;

  color: #ffffff;

  font-size: 27px;

  line-height: 1;

  font-weight: 850;

}

.summary-card small {

  display: block;

  margin-top: 6px;

  color: #5f7595;

  font-size: 10px;

}

.status-active {

  color: #4ade80 !important;

}

.status-closed {

  color: #fb7185 !important;

}

/* =========================================================

   POLL OVERVIEW

\========================================================= */

.poll-overview {

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 25px;

  min-height: 145px;

  padding: 28px 30px;

  margin-bottom: 36px;

  border:

    1px solid rgba(96, 165, 250, 0.18);

  border-radius: 18px;

  background:

    linear-gradient(

      135deg,

      rgba(14, 42, 78, 0.95),

      rgba(8, 25, 46, 0.97)

    );

}

.overview-label {

  color: #fb7185;

  font-size: 10px;

  font-weight: 800;

  letter-spacing: 1.8px;

}

.poll-overview h2 {

  margin: 7px 0 6px;

  color: white;

  font-size: 23px;

  font-weight: 800;

}

.poll-overview p {

  margin: 0;

  color: #7890b0;

  font-size: 12px;

}

.poll-status {

  display: inline-flex;

  align-items: center;

  gap: 8px;

  padding: 10px 15px;

  border-radius: 999px;

  font-size: 11px;

  font-weight: 800;

  white-space: nowrap;

}

.poll-status.active {

  color: #4ade80;

  background:

    rgba(34, 197, 94, 0.11);

  border:

    1px solid rgba(34, 197, 94, 0.20);

}

.poll-status.closed {

  color: #fb7185;

  background:

    rgba(239, 68, 68, 0.10);

  border:

    1px solid rgba(239, 68, 68, 0.20);

}

.status-dot {

  width: 7px;

  height: 7px;

  border-radius: 50%;

  background: currentColor;

  box-shadow:

    0 0 12px currentColor;

}

/* =========================================================

   TOP PREDICTION

\========================================================= */

.top-prediction {

  display: grid;

  grid-template-columns: 280px 1fr;

  gap: 30px;

  padding: 28px;

  margin-bottom: 40px;

  border-radius: 18px;

  border:

    1px solid rgba(96, 165, 250, 0.15);

  background:

    linear-gradient(

      145deg,

      rgba(10, 28, 52, 0.95),

      rgba(7, 20, 37, 0.95)

    );

}

.section-label {

  color: #fb7185;

  font-size: 10px;

  font-weight: 800;

  letter-spacing: 1.7px;

}

.top-prediction h2 {

  margin: 7px 0;

  color: white;

  font-size: 20px;

  font-weight: 800;

  line-height: 1.4;

}

.top-prediction p {

  margin: 0;

  color: #7188a7;

  font-size: 11px;

  line-height: 1.6;

}

.leading-option {

  margin-top: 20px;

  color: #91a8c8;

  font-size: 11px;

}

.leading-option strong {

  color: white;

  font-size: 14px;

}

.donut-area {

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 28px;

}

.donut-chart {

  width: 175px;

  height: 175px;

  min-width: 175px;

  border-radius: 50%;

  display: flex;

  align-items: center;

  justify-content: center;

  box-shadow:

    0 0 0 1px rgba(255,255,255,0.06),

    0 0 35px rgba(37, 99, 235, 0.15);

}

.donut-inner {

  width: 110px;

  height: 110px;

  border-radius: 50%;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  background: #0b1729;

  border:

    1px solid rgba(148, 163, 184, 0.12);

  text-align: center;

}

.donut-inner strong {

  color: white;

  font-size: 22px;

  font-weight: 850;

}

.donut-inner span {

  margin-top: 4px;

  color: #7188a7;

  font-size: 9px;

  letter-spacing: 0.7px;

}

.donut-legend {

  flex: 1;

  display: grid;

  grid-template-columns:

    repeat(2, minmax(0, 1fr));

  gap: 10px;

}

.legend-item {

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 10px;

  padding: 10px 12px;

  border-radius: 9px;

  background:

    rgba(30, 58, 95, 0.28);

  border:

    1px solid rgba(96, 165, 250, 0.08);

}

.legend-name {

  display: flex;

  align-items: center;

  gap: 7px;

  color: #c8d6ea;

  font-size: 11px;

  font-weight: 650;

}

.legend-dot {

  width: 7px;

  height: 7px;

  min-width: 7px;

  border-radius: 50%;

}

.legend-item strong {

  color: white;

  font-size: 11px;

}

/* =========================================================

   QUESTIONS

\========================================================= */

.section-heading {

  display: flex;

  align-items: flex-end;

  justify-content: space-between;

  gap: 20px;

  margin-bottom: 18px;

}

.section-heading h2 {

  margin: 5px 0;

  color: white;

  font-size: 25px;

  font-weight: 820;

}

.section-heading p {

  margin: 0;

  color: #6e86a5;

  font-size: 12px;

}

.question-count {

  padding: 8px 12px;

  border-radius: 8px;

  background:

    rgba(37, 99, 235, 0.11);

  border:

    1px solid rgba(96, 165, 250, 0.14);

  color: #8fc0ff;

  font-size: 11px;

  font-weight: 750;

}

.question-grid {

  display: grid;

  grid-template-columns:

    repeat(2, minmax(0, 1fr));

  gap: 20px;

}

/* =========================================================

   QUESTION CARD

\========================================================= */

.question-card {

  position: relative;

  overflow: hidden;

  border-radius: 17px;

  border:

    1px solid rgba(96, 165, 250, 0.15);

  background:

    linear-gradient(

      145deg,

      rgba(13, 33, 61, 0.97),

      rgba(8, 23, 42, 0.98)

    );

  box-shadow:

    0 14px 34px rgba(0, 0, 0, 0.18);

}

.question-card::before {

  content: "";

  position: absolute;

  top: 0;

  left: 0;

  right: 0;

  height: 2px;

  background:

    linear-gradient(

      90deg,

      #fb7185,

      #3b82f6,

      #22d3ee

    );

}

.question-header {

  display: grid;

  grid-template-columns:

    44px minmax(0, 1fr) auto;

  gap: 13px;

  align-items: center;

  padding: 22px;

  border-bottom:

    1px solid rgba(148, 163, 184, 0.09);

}

.question-number {

  width: 40px;

  height: 40px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 11px;

  background:

    linear-gradient(

      135deg,

      rgba(239, 51, 64, 0.20),

      rgba(59, 130, 246, 0.18)

    );

  border:

    1px solid rgba(251, 113, 133, 0.18);

  color: #fda4af;

  font-size: 11px;

  font-weight: 850;

}

.question-title {

  min-width: 0;

}

.question-title > span {

  display: block;

  color: #7da8df;

  font-size: 9px;

  font-weight: 800;

  letter-spacing: 1.3px;

}

.question-title h3 {

  margin: 5px 0 0;

  color: #f8fafc;

  font-size: 15px;

  line-height: 1.4;

  font-weight: 750;

}

.question-total {

  text-align: right;

  padding-left: 10px;

}

.question-total strong {

  display: block;

  color: white;

  font-size: 20px;

  font-weight: 850;

}

.question-total span {

  display: block;

  margin-top: 4px;

  color: #607795;

  font-size: 9px;

  text-transform: uppercase;

}

/* =========================================================

   OPTIONS

\========================================================= */

.options-list {

  padding: 18px 22px 22px;

}

.option-row {

  padding: 11px 0 13px;

  border-bottom:

    1px solid rgba(148, 163, 184, 0.07);

}

.option-row:last-child {

  border-bottom: none;

  padding-bottom: 2px;

}

.option-top {

  display: grid;

  grid-template-columns:

    minmax(0, 1fr) auto;

  align-items: center;

  gap: 18px;

  margin-bottom: 8px;

}

.option-name {

  min-width: 0;

  color: #ffffff;

  font-size: 13px;

  font-weight: 700;

  overflow: visible;

  white-space: normal;

}

.option-stats {

  display: flex;

  align-items: center;

  justify-content: flex-end;

  gap: 10px;

  min-width: 110px;

}

.option-stats strong {

  min-width: 28px;

  color: #ffffff;

  font-size: 12px;

  font-weight: 850;

  text-align: right;

}

.option-stats span {

  min-width: 58px;

  color: #ff8ca0;

  font-size: 12px;

  font-weight: 850;

  text-align: right;

}

.progress-track {

  width: 100%;

  height: 7px;

  overflow: hidden;

  border-radius: 999px;

  background:

    rgba(30, 58, 95, 0.75);

}

.progress-fill {

  height: 100%;

  min-width: 0;

  border-radius: inherit;

  background:

    linear-gradient(

      90deg,

      #ff4d6d,

      #ff7590,

      #4da3ff

    );

  transition:

    width 0.5s ease;

}

/* =========================================================

   ERROR

\========================================================= */

.analytics-error {

  margin-top: 20px;

  display: flex;

  align-items: center;

  gap: 15px;

  padding: 18px;

  border-radius: 13px;

  border:

    1px solid rgba(239, 68, 68, 0.22);

  background:

    rgba(127, 29, 29, 0.16);

}

.analytics-error-icon {

  width: 36px;

  height: 36px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 50%;

  background:

    rgba(239, 68, 68, 0.14);

  color: #fb7185;

  font-weight: 900;

}

.analytics-error p {

  margin: 4px 0 0;

  color: #9f7f87;

  font-size: 11px;

}

.analytics-error button {

  margin-left: auto;

  height: 36px;

  padding: 0 13px;

  border:

    1px solid rgba(239, 68, 68, 0.25);

  border-radius: 8px;

  background:

    rgba(239, 68, 68, 0.10);

  color: #fda4af;

  font-size: 11px;

  font-weight: 750;

  cursor: pointer;

}

/* =========================================================

   LOADING

\========================================================= */

.analytics-loading-screen {

  width: 100%;

  min-height: 100vh;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

}

.analytics-loading-screen h2 {

  margin: 0 0 5px;

  color: white;

}

.analytics-loading-screen p {

  margin: 0;

  color: #7890af;

  font-size: 13px;

}

.analytics-spinner {

  width: 42px;

  height: 42px;

  margin-bottom: 18px;

  border:

    3px solid rgba(96, 165, 250, 0.15);

  border-top-color: #3b82f6;

  border-right-color: #fb7185;

  border-radius: 50%;

  animation:

    spin 0.8s linear infinite;

}

@keyframes spin {

  to {

    transform: rotate(360deg);

  }

}

/* =========================================================

   RESPONSIVE

\========================================================= */

@media (max-width: 1200px) {

  .analytics-summary {

    grid-template-columns:

      repeat(2, minmax(0, 1fr));

  }

  .question-grid {

    grid-template-columns: 1fr;

  }

  .top-prediction {

    grid-template-columns: 1fr;

  }

  .donut-area {

    justify-content: flex-start;

  }

}

@media (max-width: 800px) {

  .analytics-sidebar {

    width: 205px;

    min-width: 205px;

  }

  .analytics-main {

    padding: 25px 22px 45px;

  }

  .analytics-header {

    align-items: flex-start;

    flex-direction: column;

  }

  .analytics-header-actions {

    align-items: flex-start;

  }

  .poll-overview {

    align-items: flex-start;

    flex-direction: column;

  }

  .donut-legend {

    grid-template-columns: 1fr;

  }

}

@media (max-width: 600px) {

  .analytics-page {

    display: block;

  }

  .analytics-sidebar {

    position: relative;

    width: 100%;

    min-width: 100%;

    min-height: auto;

    padding: 15px;

  }

  .analytics-nav {

    flex-direction: row;

  }

  .analytics-nav-link {

    flex: 1;

    justify-content: center;

  }

  .analytics-nav-link span:last-child {

    display: none;

  }

  .analytics-sidebar-bottom {

    display: none;

  }

  .analytics-main {

    padding: 22px 14px 40px;

  }

  .analytics-summary {

    grid-template-columns: 1fr;

  }

  .question-header {

    grid-template-columns:

      40px minmax(0, 1fr);

  }

  .question-total {

    grid-column: 2;

    text-align: left;

    padding-left: 0;

  }

  .option-top {

    grid-template-columns: 1fr;

    gap: 7px;

  }

  .option-stats {

    justify-content: flex-start;

    min-width: auto;

  }

  .donut-area {

    flex-direction: column;

    align-items: flex-start;

  }

  .donut-legend {

    width: 100%;

  }

}

`;

export default Analytics;
