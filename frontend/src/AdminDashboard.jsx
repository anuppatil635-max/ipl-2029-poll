import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";



import "./AdminDashboard.css";



function AdminDashboard({ username, onLogout }) {

  const navigate = useNavigate();



  const [participants, setParticipants] = useState([]);

  const [loading, setLoading] = useState(true);

  const [selectedParticipant, setSelectedParticipant] =

    useState(null);



  const [searchTerm, setSearchTerm] = useState("");

  const [dateFilter, setDateFilter] = useState("");



  const [pollStatus, setPollStatus] = useState(null);

  const [togglingPoll, setTogglingPoll] = useState(false);



  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");



  // ==========================================

  // CSRF TOKEN

  // ==========================================



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



  // ==========================================

  // FETCH PARTICIPANTS

  // ==========================================



  const fetchParticipants = async () => {

    try {

      setLoading(true);

      setError("");



      const response = await fetch(

        `${import.meta.env.VITE_API_URL}/api/admin/participants/`,

        {

          method: "GET",

          credentials: "include",

        }

      );



      if (!response.ok) {

        if (response.status === 403) {

          setError(

            "Session expired. Please login again."

          );

          return;

        }



        throw new Error(

          "Failed to fetch participants."

        );

      }



      const data = await response.json();



      setParticipants(data);

    } catch (error) {

      console.error(

        "Participants fetch error:",

        error

      );



      setError(

        "Unable to load participants."

      );

    } finally {

      setLoading(false);

    }

  };



  // ==========================================

  // FETCH POLL STATUS

  // ==========================================



  const fetchPollStatus = async () => {

    try {

      const response = await fetch(

        `${import.meta.env.VITE_API_URL}/api/admin/poll/status/`,

        {

          method: "GET",

          credentials: "include",

        }

      );



      if (!response.ok) {

        throw new Error(

          "Failed to fetch poll status."

        );

      }



      const data = await response.json();



      setPollStatus(data);

    } catch (error) {

      console.error(

        "Poll status error:",

        error

      );

    }

  };



  // ==========================================

  // INITIAL LOAD

  // ==========================================



  useEffect(() => {

    fetchParticipants();

    fetchPollStatus();

  }, []);



  // ==========================================

  // REFRESH

  // ==========================================



  const handleRefresh = () => {

    fetchParticipants();

    fetchPollStatus();

  };



  // ==========================================

  // TOGGLE POLL

  // ==========================================



  const handleTogglePoll = async () => {

    if (togglingPoll) {

      return;

    }



    const csrfToken = getCsrfToken();



    if (!csrfToken) {

      setError(

        "CSRF token not found. Please refresh the page."

      );

      return;

    }



    try {

      setTogglingPoll(true);

      setError("");



      const response = await fetch(

        `${import.meta.env.VITE_API_URL}/api/admin/poll/toggle/`,

        {

          method: "POST",

          credentials: "include",

          headers: {

            "Content-Type": "application/json",

            "X-CSRFToken": csrfToken,

          },

        }

      );



      const data = await response.json();



      if (!response.ok) {

        throw new Error(

          data.message ||

            "Unable to change poll status."

        );

      }



      setPollStatus((current) => ({

        ...current,

        is_active: data.is_active,

      }));



      alert(

        data.message ||

          "Poll status updated successfully."

      );

    } catch (error) {

      console.error(

        "Toggle poll error:",

        error

      );



      setError(

        error.message ||

          "Unable to change poll status."

      );

    } finally {

      setTogglingPoll(false);

    }

  };



  // ==========================================

  // DELETE PARTICIPANT

  // ==========================================



  const handleDeleteParticipant = async (

    participant

  ) => {

    const confirmDelete = window.confirm(

      `Are you sure you want to delete ${participant.name}?`

    );



    if (!confirmDelete) {

      return;

    }



    const csrfToken = getCsrfToken();



    if (!csrfToken) {

      setError(

        "CSRF token not found. Please refresh the page."

      );

      return;

    }



    try {

      setDeletingId(participant.id);

      setError("");



      const response = await fetch(

        `${import.meta.env.VITE_API_URL}/api/admin/participants/${participant.id}/`,

        {

          method: "DELETE",

          credentials: "include",

          headers: {

            "X-CSRFToken": csrfToken,

          },

        }

      );



      const data = await response.json();



      if (!response.ok) {

        throw new Error(

          data.message ||

            "Failed to delete participant."

        );

      }



      setParticipants((current) =>

        current.filter(

          (item) => item.id !== participant.id

        )

      );



      if (

        selectedParticipant &&

        selectedParticipant.id === participant.id

      ) {

        setSelectedParticipant(null);

      }



      alert(

        data.message ||

          "Participant deleted successfully."

      );

    } catch (error) {

      console.error(

        "Delete participant error:",

        error

      );



      setError(

        error.message ||

          "Unable to delete participant."

      );

    } finally {

      setDeletingId(null);

    }

  };



  // ==========================================

  // DATE FORMAT

  // ==========================================



  const formatDate = (dateString) => {

    if (!dateString) {

      return "N/A";

    }



    const date = new Date(dateString);



    return date.toLocaleDateString(

      "en-IN",

      {

        day: "2-digit",

        month: "short",

        year: "numeric",

      }

    );

  };



  const formatDateTime = (dateString) => {

    if (!dateString) {

      return "N/A";

    }



    const date = new Date(dateString);



    return date.toLocaleString(

      "en-IN",

      {

        day: "2-digit",

        month: "short",

        year: "numeric",

        hour: "2-digit",

        minute: "2-digit",

      }

    );

  };



  // ==========================================

  // SEARCH + DATE FILTER

  // ==========================================



  const filteredParticipants =

    participants.filter((participant) => {

      const matchesSearch =

        participant.name

          .toLowerCase()

          .includes(

            searchTerm.toLowerCase()

          );



      let matchesDate = true;



      if (dateFilter) {

        const participantDate =

          new Date(

            participant.submitted_at

          );



        const year =

          participantDate.getFullYear();



        const month = String(

          participantDate.getMonth() + 1

        ).padStart(2, "0");



        const day = String(

          participantDate.getDate()

        ).padStart(2, "0");



        const participantDateString =

          `${year}-${month}-${day}`;



        matchesDate =

          participantDateString ===

          dateFilter;

      }



      return (

        matchesSearch &&

        matchesDate

      );

    });



  // ==========================================

  // CLEAR FILTERS

  // ==========================================



  const clearFilters = () => {

    setSearchTerm("");

    setDateFilter("");

  };







  // ==========================================

// EXPORT PARTICIPANTS TO CSV

// ==========================================



const exportParticipantsToCSV = () => {

  if (filteredParticipants.length === 0) {

    alert("No participants available to export.");

    return;

  }



  const headers = [

    "Participant ID",

    "Name",

    "Submitted Time",

    "Question",

    "Answer",

  ];



  const rows = [];



  filteredParticipants.forEach((participant) => {

    if (

      !participant.responses ||

      participant.responses.length === 0

    ) {

      rows.push([

        participant.id,

        participant.name,

        formatDateTime(participant.submitted_at),

        "",

        "",

      ]);



      return;

    }



    participant.responses.forEach((response) => {

      rows.push([

        participant.id,

        participant.name,

        formatDateTime(participant.submitted_at),

        response.question || "",

        response.option || "",

      ]);

    });

  });



  const escapeCSV = (value) => {

    const text = String(value ?? "");



    return `"${text.replace(/"/g, '""')}"`;

  };



  const csvContent = [

    headers.map(escapeCSV).join(","),

    ...rows.map((row) =>

      row.map(escapeCSV).join(",")

    ),

  ].join("\n");



  const blob = new Blob(

    ["\uFEFF" + csvContent],

    {

      type: "text/csv;charset=utf-8;",

    }

  );



  const url = URL.createObjectURL(blob);



  const link = document.createElement("a");



  link.href = url;

  link.download = `IPL_2029_Participants_${new Date()

    .toISOString()

    .slice(0, 10)}.csv`;



  document.body.appendChild(link);

  link.click();



  document.body.removeChild(link);

  URL.revokeObjectURL(url);

};







  // ==========================================

  // LOGOUT

  // ==========================================



  const handleLogout = () => {

    onLogout();

  };



  return (

    <div className="admin-layout">



      {/* =====================================

          SIDEBAR

      ====================================== */}



      <aside className="admin-sidebar">



        <div className="sidebar-brand">



          <div className="sidebar-logo">

            🏏

          </div>



          <div>

            <h2>IPL 2029</h2>

            <p>Admin Panel</p>

          </div>



        </div>



        <nav className="sidebar-nav">



          <button

            className="nav-item active"

            onClick={() =>

              navigate("/admin/dashboard")

            }

          >

            <span className="nav-icon">

              📊

            </span>



            Dashboard

          </button>



          <button

            className="nav-item"

            onClick={() =>

              navigate("/admin/analytics")

            }

          >

            <span className="nav-icon">

              📈

            </span>



            Analytics

          </button>



        </nav>



        <div className="sidebar-bottom">



          <div className="admin-user">



            <div className="user-avatar">

              {username

                ? username

                    .charAt(0)

                    .toUpperCase()

                : "A"}

            </div>



            <div className="user-details">



              <strong>

                {username}

              </strong>



              <span>

                Administrator

              </span>



            </div>



          </div>



          <button

            className="logout-button"

            onClick={handleLogout}

          >

            🚪 Logout

          </button>



        </div>



      </aside>



      {/* =====================================

          MAIN

      ====================================== */}



      <main className="admin-main">



        {/* HEADER */}



        <header className="dashboard-header">



          <div>



            <p className="eyebrow">

              IPL 2029

            </p>



            <h1>

              Dashboard

            </h1>



            <p className="header-description">

              Manage your IPL 2029 prediction

              poll

            </p>



          </div>



          <div className="header-user">

            Logged in as{" "}

            <strong>

              {username}

            </strong>

          </div>



        </header>



        {/* ERROR */}



        {error && (

          <div className="dashboard-error">

            {error}

          </div>

        )}



        {/* =====================================

            STATS

        ====================================== */}



        <section className="stats-grid">



          <div className="stat-card">



            <div className="stat-icon blue">

              👥

            </div>



            <div className="stat-content">



              <span>

                Total Participants

              </span>



              <strong>

                {participants.length}

              </strong>



            </div>



          </div>



          <div className="stat-card">



            <div className="stat-icon green">

              ✓

            </div>



            <div className="stat-content">



              <span>

                Poll Status

              </span>



              <strong

                className={

                  pollStatus?.is_active

                    ? "status-active"

                    : "status-closed"

                }

              >

                {pollStatus?.is_active

                  ? "Active"

                  : "Closed"}

              </strong>



            </div>



          </div>



          <div className="stat-card">



            <div className="stat-icon red">

              ?

            </div>



            <div className="stat-content">



              <span>

                Total Questions

              </span>



              <strong>

                5

              </strong>



            </div>



          </div>



        </section>



        {/* =====================================

            POLL CONTROL

        ====================================== */}



        <section className="poll-control-card">



          <div className="poll-control-left">



            <div

              className={`poll-status-dot ${

                pollStatus?.is_active

                  ? "dot-active"

                  : "dot-closed"

              }`}

            ></div>



            <div>



              <h3>

                IPL 2029 Prediction Poll

              </h3>



              <p>

                {pollStatus?.is_active

                  ? "The poll is currently open for voting."

                  : "The poll is currently closed."}

              </p>



            </div>



          </div>



          <div className="poll-control-right">



            <span

              className={`poll-status-label ${

                pollStatus?.is_active

                  ? "label-active"

                  : "label-closed"

              }`}

            >

              {pollStatus?.is_active

                ? "OPEN"

                : "CLOSED"}

            </span>



            <button

              className={`poll-main-button ${

                pollStatus?.is_active

                  ? "main-close"

                  : "main-open"

              }`}

              onClick={handleTogglePoll}

              disabled={togglingPoll}

            >

              {togglingPoll

                ? "Updating..."

                : pollStatus?.is_active

                ? "Close Poll"

                : "Open Poll"}

            </button>



          </div>



        </section>



        {/* =====================================

            PARTICIPANTS

        ====================================== */}



        <section className="participants-section">



          <div className="section-header">



            <div>



              <h2>

                Participants

              </h2>



              <p>

                View and manage poll participants

              </p>



            </div>



            <span className="participant-count">

              {filteredParticipants.length} shown

            </span>



          </div>



          {/* TOOLBAR */}



          <div className="table-toolbar">



            <div

              style={{

                display: "flex",

                gap: "10px",

                alignItems: "center",

                flexWrap: "wrap",

              }}

            >



              {/* SEARCH */}



              <div className="search-box">



                <span className="search-icon">

                  🔍

                </span>



                <input

                  type="text"

                  placeholder="Search participants..."

                  value={searchTerm}

                  onChange={(event) =>

                    setSearchTerm(

                      event.target.value

                    )

                  }

                />



              </div>



              {/* DATE */}



              <div className="date-filter-box">



                <span>

                  📅

                </span>



                <input

                  type="date"

                  value={dateFilter}

                  onChange={(event) =>

                    setDateFilter(

                      event.target.value

                    )

                  }

                />



              </div>



              {/* CLEAR */}



              {(searchTerm ||

                dateFilter) && (

                <button

                  className="clear-filter-button"

                  onClick={clearFilters}

                >

                  Clear

                </button>

              )}



            </div>



            {/* REFRESH */}



                      {/* EXPORT CSV */}

          <button
            className="refresh-button"
            onClick={exportParticipantsToCSV}
            style={{
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
            }}
          >
            📥 Export CSV
          </button>

          {/* REFRESH */}

          <button
            className="refresh-button"
            onClick={handleRefresh}
          >
            🔄 Refresh
          </button>



          </div>



          {/* RESULT COUNT */}



          {!loading && (

            <div

              style={{

                padding:

                  "0 24px 15px",

                fontSize: "12px",

                color: "#8992a2",

              }}

            >

              Showing{" "}

              <strong>

                {filteredParticipants.length}

              </strong>{" "}

              of{" "}

              <strong>

                {participants.length}

              </strong>{" "}

              participants

            </div>

          )}



          {/* TABLE */}



          <div className="participants-table-wrapper">



            {loading ? (



              <div className="empty-state">



                <div className="loading-spinner"></div>



                <p>

                  Loading participants...

                </p>



              </div>



            ) : filteredParticipants.length ===

              0 ? (



              <div className="empty-state">



                <div className="empty-icon">

                  👥

                </div>



                <h3>

                  No participants found

                </h3>



                <p>

                  {searchTerm || dateFilter

                    ? "Try changing your search or date filter."

                    : "No participants have submitted the poll yet."}

                </p>



              </div>



            ) : (



              <table className="participants-table">



                <thead>



                  <tr>



                    <th>

                      #

                    </th>



                    <th>

                      Participant

                    </th>



                    <th>

                      Submitted At

                    </th>



                    <th>

                      Actions

                    </th>



                  </tr>



                </thead>



                <tbody>



                  {filteredParticipants.map(

                    (participant, index) => (



                      <tr

                        key={

                          participant.id

                        }

                      >



                        <td className="serial-number">

                          {index + 1}

                        </td>



                        <td>



                          <div className="participant-name">



                            <div className="participant-avatar">

                              {participant.name

                                .charAt(0)

                                .toUpperCase()}

                            </div>



                            <strong>

                              {participant.name}

                            </strong>



                          </div>



                        </td>



                        <td>



                          <div>

                            <strong>

                              {formatDate(

                                participant.submitted_at

                              )}

                            </strong>



                            <div

                              style={{

                                marginTop: "3px",

                                fontSize: "11px",

                                color: "#9aa3b2",

                              }}

                            >

                              {formatDateTime(

                                participant.submitted_at

                              )}

                            </div>

                          </div>



                        </td>



                        <td>



                          <div

                            style={{

                              display: "flex",

                              gap: "8px",

                              flexWrap: "wrap",

                            }}

                          >



                            <button

                              className="view-button"

                              onClick={() =>

                                setSelectedParticipant(

                                  participant

                                )

                              }

                            >

                              View Answers

                            </button>



                            <button

                              className="delete-button"

                              onClick={() =>

                                handleDeleteParticipant(

                                  participant

                                )

                              }

                              disabled={

                                deletingId ===

                                participant.id

                              }

                              style={{

                                border: "none",

                                background:

                                  "#fee2e2",

                                color:

                                  "#dc2626",

                                borderRadius:

                                  "7px",

                                padding:

                                  "8px 11px",

                                fontSize:

                                  "11px",

                                fontWeight:

                                  "700",

                                cursor:

                                  deletingId ===

                                  participant.id

                                    ? "not-allowed"

                                    : "pointer",

                                opacity:

                                  deletingId ===

                                  participant.id

                                    ? 0.6

                                    : 1,

                              }}

                            >

                              {deletingId ===

                              participant.id

                                ? "Deleting..."

                                : "Delete"}

                            </button>



                          </div>



                        </td>



                      </tr>



                    )

                  )}



                </tbody>



              </table>



            )}



          </div>



        </section>



      </main>



      {/* =====================================

          ANSWERS MODAL

      ====================================== */}



      {selectedParticipant && (



        <div

          className="modal-overlay"

          onClick={() =>

            setSelectedParticipant(null)

          }

        >



          <div

            className="answers-modal"

            onClick={(event) =>

              event.stopPropagation()

            }

          >



            <div className="modal-header">



              <div>



                <h2>

                  Participant Answers

                </h2>



                <p>

                  {selectedParticipant.name}

                </p>



              </div>



              <button

                className="modal-close"

                onClick={() =>

                  setSelectedParticipant(null)

                }

              >

                ✕

              </button>



            </div>



            <div className="modal-participant-info">



              <strong>

                {selectedParticipant.name}

              </strong>



              <span>

                Submitted:{" "}

                {formatDateTime(

                  selectedParticipant.submitted_at

                )}

              </span>



            </div>



            <div className="answers-list">



              {selectedParticipant.responses &&

              selectedParticipant.responses.length >

                0 ? (



                selectedParticipant.responses.map(

                  (response, index) => (



                    <div

                      className="answer-card"

                      key={index}

                    >



                      <div className="question-number">

                        {index + 1}

                      </div>



                      <div className="answer-content">



                        <h4>

                          {response.question}

                        </h4>



                        <p>

                          {response.option}

                        </p>



                      </div>



                    </div>



                  )

                )



              ) : (



                <div className="empty-state">

                  No answers available.

                </div>



              )}



            </div>



            <div className="modal-footer">



              <button

                className="modal-done-button"

                onClick={() =>

                  setSelectedParticipant(null)

                }

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