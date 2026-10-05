import { useState } from "react";
import "./AdminLogin.css";

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");

    if (!username.trim() || !password) {
      setError("Please enter username and password.");
      return;
    }

    setLoading(true);

    try {
      const loginResponse = await fetch(
        "/api/admin/login/",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password: password,
          }),
        }
      );

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        setError(
          loginData.message ||
            "Invalid username or password."
        );

        return;
      }

      /*
       * Check Django session immediately.
       */
      const sessionResponse = await fetch(
        "/api/admin/me/",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const sessionData = await sessionResponse.json();

      if (!sessionResponse.ok) {
        console.error(
          "Session check failed:",
          sessionResponse.status,
          sessionData
        );

        setError(
          "Login succeeded, but the admin session was not created."
        );

        return;
      }

      console.log(
        "Admin session created:",
        sessionData
      );

      onLogin(
        sessionData.username ||
          loginData.username ||
          username.trim()
      );

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setError(
        "Unable to connect to the server. Make sure Django is running."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        {/* IPL LOGO */}
        <div className="login-logo">
          IPL
        </div>

        {/* HEADING */}
        <div className="login-heading">

          <h1>
            Admin Login
          </h1>

          <p>
            Sign in to manage the IPL 2029
            Prediction Poll.
          </p>

        </div>

        {/* LOGIN FORM */}
        <form
          className="login-form"
          onSubmit={handleLogin}
        >

          {/* USERNAME */}
          <div className="form-group">

            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              autoComplete="username"
              disabled={loading}
            />

          </div>

          {/* PASSWORD */}
          <div className="form-group">

            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              disabled={loading}
            />

          </div>

          {/* ERROR */}
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {/* SIGN IN */}
          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>

        </form>

        {/* FOOTER */}
        <div className="login-footer">
          IPL 2029 Prediction Poll
        </div>

      </div>

    </div>
  );
}

export default AdminLogin;