import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import "./AdminDashboard.css";

const API_BASE = (

  import.meta.env.VITE_API_URL || "http://127.0.0.1:8081"

).replace(/\/$/, "");

async function readResponse(response) {

  const text = await response.text();

  if (!text) return {};

  try {

    return JSON.parse(text);

  } catch {

    return { detail: text };

  }

}

function getCsrfTokenFromCookie() {

  const cookie = document.cookie

    .split(";")

    .map((part) => part.trim())

    .find((part) => part.startsWith("csrftoken="));

  return cookie

    ? decodeURIComponent(cookie.slice("csrftoken=".length))

    : "";

}

function getList(data, keys = []) {

  if (Array.isArray(data)) return data;

  for (const key of keys) {

    if (Array.isArray(data?.[key])) return data[key];

  }

  return [];

}

function AdminDashboard({ username, onLogout }) {

  const navigate = useNavigate();

  const [polls, setPolls] = useState([]);

  const [selectedPollId, setSelectedPollId] = useState("");

  const [participants, setParticipants] = useState([]);

  const [loadingPolls, setLoadingPolls] = useState(true);

  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const [selectedParticipant, setSelectedParticipant] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [dateFilter, setDateFilter] = useState("");

  const [error, setError] = useState("");

  const [deletingId, setDeletingId] = useState(null);

  const [togglingPoll, setTogglingPoll] = useState(false);

  const selectedPoll = useMemo(

    () =>

      polls.find(

        (poll) => String(poll.id) === String(selectedPollId)

      ) || null,

    [polls, selectedPollId]

  );

  const fetchPolls = useCallback(async () => {

    setLoadingPolls(true);

    setError("");

    try {

      const response = await fetch(

        `${API_BASE}/api/admin/polls/`,

        {

          credentials: "include",

          headers: { Accept: "application/json" },

        }

      );

      const data = await readResponse(response);

      if (!response.ok) {

        throw new Error(

          data.detail ||

            data.message ||

            "Unable to load polls. Please check your admin session."

        );

      }

      const list = getList(data, ["results", "polls"]);

      setPolls(list);

      setSelectedPollId((current) => {

        if (

          current &&

          list.some(

            (poll) => String(poll.id) === String(current)

          )

        ) {

          return current;

        }

        return list.length ? String(list[0].id) : "";

      });

    } catch (err) {

      console.error("Poll list error:", err);

      setError(err.message || "Unable to load polls.");

      setPolls([]);

      setSelectedPollId("");

    } finally {

      setLoadingPolls(false);

    }

  }, []);

  const fetchParticipants = useCallback(async (pollId) => {

    if (!pollId) {

      setParticipants([]);

      setLoadingParticipants(false);

      return;

    }

    setLoadingParticipants(true);

    setError("");

    try {

      const response = await fetch(

        `${API_BASE}/api/admin/participants/?poll_id=${encodeURIComponent(

          pollId

        )}`,

        {

          credentials: "include",

          headers: { Accept: "application/json" },

        }

      );

      const data = await readResponse(response);

      if (!response.ok) {

        throw new Error(

          data.detail || data.message || "Unable to load participants."

        );

      }

      setParticipants(

        getList(data, ["results", "participants"])

      );

    } catch (err) {

      console.error("Participants fetch error:", err);

      setParticipants([]);

      setError(err.message || "Unable to load participants.");

    } finally {

      setLoadingParticipants(false);

    }

  }, []);

  useEffect(() => {

    fetchPolls();

  }, [fetchPolls]);

  useEffect(() => {

    setSearchTerm("");

    setDateFilter("");

    setSelectedParticipant(null);

    fetchParticipants(selectedPollId);

  }, [selectedPollId, fetchParticipants]);

  const handleRefresh = async () => {

    await fetchPolls();

    if (selectedPollId) {

      await fetchParticipants(selectedPollId);

    }

  };

  const fetchCsrfToken = async () => {

    const cookieToken = getCsrfTokenFromCookie();

    if (cookieToken) return cookieToken;

    try {

      const response = await fetch(

        `${API_BASE}/api/admin/me/`,

        {

          credentials: "include",

          headers: { Accept: "application/json" },

        }

      );

      const data = await readResponse(response);

      return (

        data.csrfToken ||

        getCsrfTokenFromCookie() ||

        ""

      );

    } catch (err) {

      console.error("CSRF token request error:", err);

      return "";

    }

  };

  const handleTogglePoll = async () => {

    if (!selectedPoll || togglingPoll) return;

    setTogglingPoll(true);

    setError("");

    try {

      const csrfToken = await fetchCsrfToken();

      const response = await fetch(

        `${API_BASE}/api/admin/polls/${selectedPoll.id}/`,

        {

          method: "PATCH",

          credentials: "include",

          headers: {

            "Content-Type": "application/json",

            Accept: "application/json",

            ...(csrfToken

              ? { "X-CSRFToken": csrfToken }

              : {}),

          },

          body: JSON.stringify({

            is_active: !selectedPoll.is_active,

          }),

        }

      );

      const data = await readResponse(response);

      if (!response.ok) {

        throw new Error(

          data.detail ||

            data.message ||

            "Unable to change poll status."

        );

      }

      const updatedPoll = data.poll || data;

      const activeValue =

        typeof updatedPoll.is_active === "boolean"

          ? updatedPoll.is_active

          : !selectedPoll.is_active;

      setPolls((current) =>

        current.map((poll) =>

          String(poll.id) === String(selectedPoll.id)

            ? {

                ...poll,

                ...updatedPoll,

                is_active: activeValue,

              }

            : poll

        )

      );

    } catch (err) {

      console.error("Toggle poll error:", err);

      setError(err.message || "Unable to change poll status.");

    } finally {

      setTogglingPoll(false);

    }

  };

  const formatDate = (value, includeTime = false) => {

    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleString(

      "en-IN",

      includeTime

        ? {

            day: "2-digit",

            month: "short",

            year: "numeric",

            hour: "2-digit",

            minute: "2-digit",

          }

        : {

            day: "2-digit",

            month: "short",

            year: "numeric",

          }

    );

  };

  const filteredParticipants = useMemo(() => {

    const search = searchTerm.trim().toLowerCase();

    return participants.filter((participant) => {

      const name = String(

        participant?.name || ""

      ).toLowerCase();

      const matchesSearch = name.includes(search);

      let matchesDate = true;

      if (dateFilter && participant?.submitted_at) {

        const date = new Date(participant.submitted_at);

        if (Number.isNaN(date.getTime())) {

          matchesDate = false;

        } else {

          const localDate = [

            date.getFullYear(),

            String(date.getMonth() + 1).padStart(2, "0"),

            String(date.getDate()).padStart(2, "0"),

          ].join("-");

          matchesDate = localDate === dateFilter;

        }

      } else if (dateFilter) {

        matchesDate = false;

      }

      return matchesSearch && matchesDate;

    });

  }, [participants, searchTerm, dateFilter]);

  const handleDeleteParticipant = async (participant) => {

    const confirmed = window.confirm(

      `Are you sure you want to delete ${

        participant.name || "this participant"

      }?`

    );

    if (!confirmed) return;

    setDeletingId(participant.id);

    setError("");

    try {

      const csrfToken = await fetchCsrfToken();

      const response = await fetch(

        `${API_BASE}/api/admin/participants/${participant.id}/`,

        {

          method: "DELETE",

          credentials: "include",

          headers: {

            Accept: "application/json",

            ...(csrfToken

              ? { "X-CSRFToken": csrfToken }

              : {}),

          },

        }

      );

      const data = await readResponse(response);

      if (!response.ok) {

        throw new Error(

          data.detail ||

            data.message ||

            "Failed to delete participant."

        );

      }

      setParticipants((current) =>

        current.filter(

          (item) => String(item.id) !== String(participant.id)

        )

      );

      setSelectedParticipant((current) =>

        current &&

        String(current.id) === String(participant.id)

          ? null

          : current

      );

    } catch (err) {

      console.error("Delete participant error:", err);

      setError(err.message || "Unable to delete participant.");

    } finally {

      setDeletingId(null);

    }

  };

  const exportParticipantsToCSV = () => {

    if (!filteredParticipants.length) {

      window.alert("No participants available to export.");

      return;

    }

    const escapeCSV = (value) =>

      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = [

      [

        "Participant ID",

        "Name",

        "Submitted At",

        "Question",

        "Answer",

      ],

    ];

    filteredParticipants.forEach((participant) => {

      const responses = Array.isArray(participant.responses)

        ? participant.responses

        : [];

      if (!responses.length) {

        rows.push([

          participant.id,

          participant.name,

          formatDate(participant.submitted_at, true),

          "",

          "",

        ]);

      } else {

        responses.forEach((answer) => {

          rows.push([

            participant.id,

            participant.name,

            formatDate(participant.submitted_at, true),

            answer.question || "",

            answer.option || "",

          ]);

        });

      }

    });

    const csv =

      "\uFEFF" +

      rows

        .map((row) => row.map(escapeCSV).join(","))

        .join("\r\n");

    const blob = new Blob([csv], {

      type: "text/csv;charset=utf-8;",

    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    const safeTitle = (

      selectedPoll?.title || "poll"

    ).replace(/[^a-z0-9_-]+/gi, "_");

    link.href = url;

    link.download = `${safeTitle}_participants_${

      new Date().toISOString().slice(0, 10)

    }.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

  };

  const totalQuestions = Array.isArray(selectedPoll?.questions)

    ? selectedPoll.questions.length

    : 0;

  return (

    <div className="admin-layout">

      <aside className="admin-sidebar">

        <div className="sidebar-brand">

          <div className="sidebar-logo">🏏</div>

          <div>

            <h2>Poll Admin</h2>

            <p>Admin Panel</p>

          </div>

        </div>

        <nav className="sidebar-nav">

          <button

            type="button"

            className="nav-item active"

            onClick={() => navigate("/admin/dashboard")}

          >

            <span className="nav-icon">📊</span>

            Dashboard

          </button>

          <button

            type="button"

            className="nav-item"

            onClick={() => navigate("/admin/analytics")}

          >

            <span className="nav-icon">📈</span>

            Analytics

          </button>

          <button

            type="button"

            className="nav-item"

            onClick={() => navigate("/admin/polls")}

          >

            <span className="nav-icon">🗳️</span>

            Poll Management

          </button>

        </nav>

        <div className="sidebar-bottom">

          <div className="admin-user">

            <div className="user-avatar">

              {String(username || "A").charAt(0).toUpperCase()}

            </div>

            <div className="user-details">

              <strong>{username || "Admin"}</strong>

              <span>Administrator</span>

            </div>

          </div>

          <button

            type="button"

            className="logout-button"

            onClick={onLogout}

          >

            <span className="button-icon" aria-hidden="true">↪</span> Logout

          </button>

        </div>

      </aside>

      <main className="admin-main">

        <header className="dashboard-header">

          <div>

            <p className="eyebrow">POLL MANAGEMENT SYSTEM</p>

            <h1>Admin Dashboard</h1>

            <p className="header-description">

              Manage polls, participants and results from one place.

            </p>

          </div>

          <div className="dashboard-header-actions">

            <div className="header-user">

              Logged in as <strong>{username || "Admin"}</strong>

            </div>

            <button

              type="button"

              className="create-poll-dashboard-button"

              onClick={() => navigate("/admin/polls")}

            >

              <span className="create-poll-plus">＋</span>

              <span className="create-poll-copy">

                <strong>Create New Poll</strong>

                <small>Add questions and answer options</small>

              </span>

              <span className="create-poll-arrow">→</span>

            </button>

          </div>

        </header>

        {error && (

          <div className="dashboard-error" role="alert">

            {error}

          </div>

        )}

        <section className="poll-picker-section">

          <div className="poll-picker-heading">

            <div>

              <h2>Your Polls</h2>

              <p>

                Select a poll to view its participants and manage its status.

              </p>

            </div>

            <button

              type="button"

              className="refresh-button"

              onClick={() => navigate("/admin/polls")}

            >

              <span className="button-icon" aria-hidden="true">🗳</span> Manage Polls

            </button>

          </div>

          {loadingPolls ? (

            <div className="empty-state">Loading polls...</div>

          ) : polls.length === 0 ? (

            <div className="empty-state">

              <h3>No polls found</h3>

              <p>Create your first poll to start collecting responses.</p>

              <button

                type="button"

                className="create-poll-dashboard-button"

                onClick={() => navigate("/admin/polls")}

              >

                <span className="create-poll-plus">＋</span>

                <span className="create-poll-copy">

                  <strong>Create Your First Poll</strong>

                  <small>Set up your poll in minutes</small>

                </span>

                <span className="create-poll-arrow">→</span>

              </button>

            </div>

          ) : (

            <div className="poll-picker-grid">

              {polls.map((poll) => (

                <button

                  type="button"

                  key={poll.id}

                  className={`poll-picker-card ${

                    String(selectedPollId) === String(poll.id)

                      ? "selected"

                      : ""

                  }`}

                  onClick={() => setSelectedPollId(String(poll.id))}

                >

                  <span

                    className={`poll-picker-dot ${

                      poll.is_active ? "active" : "closed"

                    }`}

                  />

                  <span className="poll-picker-copy">

                    <strong>{poll.title || `Poll ${poll.id}`}</strong>

                    <small>

                      {Array.isArray(poll.questions)

                        ? poll.questions.length

                        : 0}{" "}

                      questions · {poll.is_active ? "Open" : "Closed"}

                    </small>

                  </span>

                  <span className="poll-picker-count">

                    {String(selectedPollId) === String(poll.id)

                      ? "Selected"

                      : "View →"}

                  </span>

                </button>

              ))}

            </div>

          )}

        </section>

        <section className="stats-grid">

          <div className="stat-card">

            <div className="stat-icon blue">👥</div>

            <div className="stat-content">

              <span>Total Participants</span>

              <strong>{participants.length}</strong>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon green">✓</div>

            <div className="stat-content">

              <span>Poll Status</span>

              <strong

                className={

                  selectedPoll?.is_active

                    ? "status-active"

                    : "status-closed"

                }

              >

                {selectedPoll

                  ? selectedPoll.is_active

                    ? "Active"

                    : "Closed"

                  : "N/A"}

              </strong>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon red">?</div>

            <div className="stat-content">

              <span>Total Questions</span>

              <strong>{totalQuestions}</strong>

            </div>

          </div>

        </section>

        <section className="poll-control-card">

          <div className="poll-control-left">

            <div

              className={`poll-status-dot ${

                selectedPoll?.is_active

                  ? "dot-active"

                  : "dot-closed"

              }`}

            />

            <div>

              <h3>{selectedPoll?.title || "Select a poll"}</h3>

              <p>

                {selectedPoll

                  ? selectedPoll.is_active

                    ? "This poll is open for voting."

                    : "This poll is closed for voting."

                  : "Create or select a poll to continue."}

              </p>

            </div>

          </div>

          <div className="poll-control-right">

            <span

              className={`poll-status-label ${

                selectedPoll?.is_active

                  ? "label-active"

                  : "label-closed"

              }`}

            >

              {selectedPoll

                ? selectedPoll.is_active

                  ? "OPEN"

                  : "CLOSED"

                : "NO POLL"}

            </span>

            <button

              type="button"

              className={`poll-main-button ${

                selectedPoll?.is_active

                  ? "main-close"

                  : "main-open"

              }`}

              onClick={handleTogglePoll}

              disabled={!selectedPoll || togglingPoll}

            >

              {togglingPoll

                ? "Updating..."

                : selectedPoll?.is_active

                  ? "Close Poll"

                  : "▶ Open Poll"}

            </button>

          </div>

        </section>

        <section className="participants-section">

          <div className="section-header">

            <div>

              <h2>Participants</h2>

              <p>

                {selectedPoll

                  ? `Responses for ${selectedPoll.title}`

                  : "Select a poll to view participants."}

              </p>

            </div>

            <span className="participant-count">

              {filteredParticipants.length} shown

            </span>

          </div>

          <div className="table-toolbar">

            <div

              className="toolbar-left"

              style={{

                display: "flex",

                gap: 10,

                alignItems: "center",

                flexWrap: "wrap",

              }}

            >

              <div className="search-box">

                <span className="search-icon icon-motion" aria-hidden="true">⌕</span>

                <input

                  type="search"

                  placeholder="Search participants..."

                  value={searchTerm}

                  onChange={(event) => setSearchTerm(event.target.value)}

                />

              </div>

              <div className="date-filter-box">

                <span className="date-icon icon-motion" aria-hidden="true">▦</span>

                <input

                  type="date"

                  value={dateFilter}

                  onChange={(event) => setDateFilter(event.target.value)}

                  aria-label="Filter participants by date"

                />

              </div>

              {(searchTerm || dateFilter) && (

                <button

                  type="button"

                  className="clear-filter-button"

                  onClick={() => {

                    setSearchTerm("");

                    setDateFilter("");

                  }}

                >

                  Clear

                </button>

              )}

            </div>

            <div

              className="toolbar-actions"

              style={{ display: "flex", gap: 8, flexWrap: "wrap" }}

            >

              <button

                type="button"

                className="refresh-button"

                onClick={exportParticipantsToCSV}

              >

                <span className="button-icon" aria-hidden="true">⇩</span> Export CSV

              </button>

              <button

                type="button"

                className="refresh-button"

                onClick={handleRefresh}

              >

                <span className="button-icon" aria-hidden="true">↻</span> Refresh

              </button>

            </div>

          </div>

          {!loadingParticipants && (

            <div

              style={{

                padding: "0 24px 15px",

                fontSize: 12,

                color: "#8992a2",

              }}

            >

              Showing <strong>{filteredParticipants.length}</strong> of{" "}

              <strong>{participants.length}</strong> participants for this poll

            </div>

          )}

          <div className="participants-table-wrapper">

            {loadingParticipants ? (

              <div className="empty-state">

                <div className="loading-spinner" />

                <p>Loading participants...</p>

              </div>

            ) : filteredParticipants.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">👥</div>

                <h3>No participants found</h3>

                <p>

                  {searchTerm || dateFilter

                    ? "Try changing your search or date filter."

                    : "No participants have submitted this poll yet."}

                </p>

              </div>

            ) : (

              <table className="participants-table">

                <thead>

                  <tr>

                    <th>#</th>

                    <th>Participant</th>

                    <th>Submitted At</th>

                    <th>Actions</th>

                  </tr>

                </thead>

                <tbody>

                  {filteredParticipants.map((participant, index) => (

                    <tr key={participant.id}>

                      <td className="serial-number">{index + 1}</td>

                      <td>

                        <div className="participant-name">

                          <div className="participant-avatar">

                            {String(

                              participant.name || "?"

                            ).charAt(0).toUpperCase()}

                          </div>

                          <strong>

                            {participant.name || "Unnamed participant"}

                          </strong>

                        </div>

                      </td>

                      <td>

                        <strong>

                          {formatDate(participant.submitted_at)}

                        </strong>

                        <div

                          style={{

                            marginTop: 3,

                            fontSize: 11,

                            color: "#9aa3b2",

                          }}

                        >

                          {formatDate(participant.submitted_at, true)}

                        </div>

                      </td>

                      <td>

                        <div

                          style={{

                            display: "flex",

                            gap: 8,

                            flexWrap: "wrap",

                          }}

                        >

                          <button

                            type="button"

                            className="view-button"

                            onClick={() =>

                              setSelectedParticipant(participant)

                            }

                          >

                            <span className="button-icon" aria-hidden="true">◉</span> View Answers

                          </button>

                          <button

                            type="button"

                            className="delete-button"

                            onClick={() =>

                              handleDeleteParticipant(participant)

                            }

                            disabled={deletingId === participant.id}

                          >

                            {deletingId === participant.id

                              ? "Deleting..."

                              : <><span className="button-icon" aria-hidden="true">⌫</span> Delete</>}

                          </button>

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            )}

          </div>

        </section>

      </main>

      {selectedParticipant && (

        <div

          className="modal-overlay"

          onClick={() => setSelectedParticipant(null)}

        >

          <div

            className="answers-modal"

            onClick={(event) => event.stopPropagation()}

          >

            <div className="modal-header">

              <div>

                <h2>Participant Answers</h2>

                <p>{selectedParticipant.name || "Participant"}</p>

              </div>

              <button

                type="button"

                className="modal-close"

                onClick={() => setSelectedParticipant(null)}

              >

                ✕

              </button>

            </div>

            <div className="modal-participant-info">

              <strong>

                {selectedParticipant.name || "Participant"}

              </strong>

              <span>

                Submitted:{" "}

                {formatDate(selectedParticipant.submitted_at, true)}

              </span>

            </div>

            <div className="answers-list">

              {Array.isArray(selectedParticipant.responses) &&

              selectedParticipant.responses.length ? (

                selectedParticipant.responses.map((answer, index) => (

                  <div

                    className="answer-card"

                    key={`${answer.question || "q"}-${index}`}

                  >

                    <div className="question-number">{index + 1}</div>

                    <div className="answer-content">

                      <h4>

                        {answer.question || `Question ${index + 1}`}

                      </h4>

                      <p>

                        {answer.option ||

                          answer.options ||

                          "No answer recorded"}

                      </p>

                    </div>

                  </div>

                ))

              ) : (

                <div className="empty-state">No answers available.</div>

              )}

            </div>

            <div className="modal-footer">

              <button

                type="button"

                className="modal-done-button"

                onClick={() => setSelectedParticipant(null)}

              >

                Close

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

export default AdminDashboard;
