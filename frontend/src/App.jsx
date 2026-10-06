import { useEffect, useState } from "react";



import {



  BrowserRouter,



  Routes,



  Route,



  Navigate,



} from "react-router-dom";







import AdminLogin from "./AdminLogin";



import AdminDashboard from "./AdminDashboard";



import Analytics from "./Analytics";







import "./App.css";











function PublicPoll() {



  const [poll, setPoll] = useState(null);



  const [name, setName] = useState("");







  const [answers, setAnswers] = useState({});







  const [started, setStarted] = useState(false);



  const [submitted, setSubmitted] = useState(false);







  const [loading, setLoading] = useState(true);



  const [submitting, setSubmitting] = useState(false);







  const [error, setError] = useState("");











  // =====================================================



  // LOAD POLL



  // =====================================================







  useEffect(() => {



    const loadPoll = async () => {



      try {



        const response = await fetch(

          `${import.meta.env.VITE_API_URL}/api/poll/`

        );







        if (!response.ok) {



          throw new Error("Unable to load poll.");



        }







        const data = await response.json();







        setPoll(data);



      } catch (error) {



        console.error("Poll loading error:", error);







        setError(



          "Unable to load the poll. Please try again."



        );



      } finally {



        setLoading(false);



      }



    };







    loadPoll();



  }, []);











  // =====================================================



  // START PREDICTION



  // =====================================================







  const startPrediction = () => {



    setError("");







    if (!name.trim()) {



      setError("Please enter your name.");



      return;



    }







    setStarted(true);







    window.scrollTo({



      top: 0,



      behavior: "smooth",



    });



  };











  // =====================================================



  // SELECT / UNSELECT MULTIPLE OPTIONS



  // =====================================================







  const handleOptionChange = (



    questionId,



    optionId



  ) => {



    setAnswers((currentAnswers) => {



      const currentOptions =



        currentAnswers[questionId] || [];







      const alreadySelected =



        currentOptions.includes(optionId);







      let updatedOptions;







      if (alreadySelected) {



        updatedOptions = currentOptions.filter(



          (id) => id !== optionId



        );



      } else {



        updatedOptions = [



          ...currentOptions,



          optionId,



        ];



      }







      return {



        ...currentAnswers,



        [questionId]: updatedOptions,



      };



    });







    setError("");



  };











  // =====================================================



  // SUBMIT POLL



  // =====================================================







  const handleSubmit = async (event) => {



    event.preventDefault();







    setError("");







    if (!name.trim()) {



      setError("Please enter your name.");



      return;



    }







    if (!poll || !poll.questions) {



      setError("Poll data is not available.");



      return;



    }











    // Check every question has at least one answer



    for (const question of poll.questions) {



      const selectedOptions =



        answers[question.id] || [];







      if (selectedOptions.length === 0) {



        setError(



          `Please answer Question ${question.order}.`



        );







        return;



      }



    }











    // Create response format required by Django



    const responses = poll.questions.map(



      (question) => ({



        question_id: question.id,



        option_ids:



          answers[question.id] || [],



      })



    );











    try {



      setSubmitting(true);











      const response = await fetch(

        `${import.meta.env.VITE_API_URL}/api/submit/`,



        {



          method: "POST",







          headers: {



            "Content-Type": "application/json",



          },







          body: JSON.stringify({



            name: name.trim(),



            responses: responses,



          }),



        }



      );











      const data = await response.json();











      if (!response.ok) {



        throw new Error(



          data.message ||



            "Unable to submit the poll."



        );



      }











      // SUCCESS



      setSubmitted(true);







      window.scrollTo({



        top: 0,



        behavior: "smooth",



      });











    } catch (error) {



      console.error(



        "Submit poll error:",



        error



      );







      setError(



        error.message ||



          "Something went wrong while submitting."



      );







    } finally {



      setSubmitting(false);



    }



  };











  // =====================================================



  // LOADING



  // =====================================================







  if (loading) {



    return (



      <div className="public-loading">



        Loading IPL 2029 Poll...



      </div>



    );



  }











  // =====================================================



  // THANK YOU PAGE



  // =====================================================







  if (submitted) {



    return (



      <div className="public-page">







        <header className="public-topbar">



          <div className="brand">



            IPL <span>2029</span>



          </div>







          <div className="poll-label">



            PREDICTION POLL



          </div>



        </header>











        <main className="public-card">







          <div className="thank-you-card">







            <div className="trophy">



              🏆



            </div>







            <div className="small-title">



              IPL 2029



            </div>







            <h1>



              Thank You,{" "}



              <span>{name.trim()}</span>!



            </h1>







            <p className="thank-you-text">



              Your IPL 2029 prediction has been



              successfully submitted.



            </p>







            <div className="success-box">



              ✓ Your response has been saved



            </div>







          </div>







        </main>











        <footer className="public-footer">



          IPL 2029 • Prediction Poll



        </footer>







      </div>



    );



  }











  // =====================================================



  // START PAGE



  // =====================================================







  if (!started) {



    return (



      <div className="public-page">







        <header className="public-topbar">







          <div className="brand">



            IPL <span>2029</span>



          </div>







          <div className="poll-label">



            PREDICTION POLL



          </div>







        </header>











        <main className="public-card">







          <div className="start-card">







            <div className="trophy">



              🏆



            </div>







            <div className="small-title">



              IPL 2029



            </div>











            <h1>



              Who will rule



              <br />



              <span>IPL 2029?</span>



            </h1>











            <p>



              Share your prediction and tell us



              what you think will decide IPL 2029.



            </p>











            <div className="name-section">







              <input



                type="text"



                placeholder="Enter your name"



                value={name}



                onChange={(event) =>



                  setName(event.target.value)



                }



                onKeyDown={(event) => {



                  if (event.key === "Enter") {



                    startPrediction();



                  }



                }}



              />







              <button



                type="button"



                onClick={startPrediction}



              >



                START PREDICTION →



              </button>







            </div>











            {error && (



              <div className="public-error">



                {error}



              </div>



            )}







          </div>







        </main>











        <footer className="public-footer">



          IPL 2029 • Prediction Poll



        </footer>







      </div>



    );



  }











  // =====================================================



  // QUESTION PAGE



  // =====================================================







  return (



    <div className="question-page">







      <header className="question-header">







        <div>







          <div className="question-brand">



            IPL <span>2029</span>



          </div>







          <h1>



            Prediction Poll



          </h1>







          <p>



            Welcome,{" "}



            <strong>{name.trim()}</strong>



            . Select your answers below.



          </p>







        </div>











        <div className="question-count">



          {poll.questions.length} Questions



        </div>







      </header>











      <main className="questions-container">







        <form onSubmit={handleSubmit}>







          {poll.questions.map(



            (question, questionIndex) => (







              <div



                className="question-card"



                key={question.id}



              >







                <div className="question-number">



                  QUESTION{" "}



                  {String(



                    questionIndex + 1



                  ).padStart(2, "0")}



                </div>











                <h2>



                  {question.text}



                </h2>











                <div className="multiple-hint">



                  Select one or more options



                </div>











                <div className="options-grid">







                  {question.options.map(



                    (option) => {







                      const selected =



                        (



                          answers[



                            question.id



                          ] || []



                        ).includes(



                          option.id



                        );











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



                            {selected



                              ? "✓"



                              : ""}



                          </span>











                          <span className="option-text">



                            {option.text}



                          </span>







                        </label>



                      );







                    }



                  )}







                </div>







              </div>







            )



          )}











          {error && (



            <div className="submit-error">



              {error}



            </div>



          )}











          <div className="submit-section">







            <button



              type="submit"



              className="submit-poll-button"



              disabled={submitting}



            >







              {submitting



                ? "SUBMITTING..."



                : "SUBMIT PREDICTION →"}







            </button>







          </div>







        </form>







      </main>











      <footer className="public-footer">



        IPL 2029 • Prediction Poll



      </footer>







    </div>



  );



}











// =====================================================



// MAIN APP



// =====================================================









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







  const [adminUser, setAdminUser] =



    useState(null);







  const [checkingSession, setCheckingSession] =



    useState(true);











  // =====================================================



  // CHECK ADMIN SESSION



  // =====================================================







  useEffect(() => {







    const checkAdminSession = async () => {







      try {







        const response = await fetch(



          `${import.meta.env.VITE_API_URL}/api/admin/me/`,



          {



            method: "GET",



            credentials: "include",



          }



        );











        if (response.ok) {







          const data =



            await response.json();







          setAdminUser(



            data.username



          );







        } else {







          setAdminUser(null);







        }







      } catch (error) {







        console.error(



          "Session check error:",



          error



        );







        setAdminUser(null);







      } finally {







        setCheckingSession(false);







      }







    };











    checkAdminSession();







  }, []);











  // =====================================================



  // ADMIN LOGIN



  // =====================================================







  const handleLogin = (username) => {







    setAdminUser(username);







    window.location.replace(



      "/admin/dashboard"



    );







  };











  // =====================================================



  // ADMIN LOGOUT



  // =====================================================







  const handleLogout = async () => {

    try {

      const csrfToken = getCsrfToken();



      const response = await fetch(

        `${import.meta.env.VITE_API_URL}/api/admin/logout/`,

        {

          method: "POST",

          credentials: "include",

          headers: {

            "X-CSRFToken": csrfToken || "",

          },

        }

      );



      if (!response.ok) {

        console.error(

          "Logout request failed:",

          response.status

        );

      }

    } catch (error) {

      console.error(

        "Logout error:",

        error

      );

    }



    // Clear frontend admin state

    setAdminUser(null);



    // Force the browser back to the admin login page

    window.location.replace("/admin?logout=1");

  };











  // =====================================================



  // SESSION LOADING



  // =====================================================







  if (checkingSession) {







    return (



      <div



        style={{



          minHeight: "100vh",



          display: "flex",



          alignItems: "center",



          justifyContent: "center",



          fontFamily:



            "Arial, sans-serif",



          background: "#07102f",



          color: "white",



        }}



      >



        Checking...



      </div>



    );







  }











  // =====================================================



  // ROUTES



  // =====================================================







  return (







    <BrowserRouter>







      <Routes>







        {/* PUBLIC POLL */}







        <Route



          path="/"



          element={<PublicPoll />}



        />











        {/* ADMIN LOGIN — ALWAYS SHOW LOGIN PAGE */}

        <Route
          path="/admin"
          element={<AdminLogin onLogin={handleLogin} />}
        />


        {/* ADMIN DASHBOARD */}







        <Route



          path="/admin/dashboard"



          element={



            adminUser ? (



              <AdminDashboard



                username={adminUser}



                onLogout={handleLogout}



              />



            ) : (



              <Navigate



                to="/admin"



                replace



              />



            )



          }



        />











        {/* ANALYTICS */}







        <Route



          path="/admin/analytics"



          element={



            adminUser ? (



              <Analytics



                username={adminUser}



                onLogout={handleLogout}



              />



            ) : (



              <Navigate



                to="/admin"



                replace



              />



            )



          }



        />











        {/* DEFAULT */}







        <Route



          path="*"



          element={



            <Navigate



              to="/"



              replace



            />



          }



        />







      </Routes>







    </BrowserRouter>







  );



}











export default App; 