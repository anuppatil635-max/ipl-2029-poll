
import { useState } from "react";
import "./AdminLogin.css";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:8082"
    : "https://ipl-2029-backend.onrender.com")
).replace(/\/$/, "");

async function readResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function AdminLogin({ onLogin }) {
  const [mode, setMode] = useState("admin");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [newUsername, setNewUsername] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setSuccess("");
  };

  // ========================================================
  // ADMIN LOGIN
  // ========================================================

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/admin/login/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        setError(
          data.message ||
            data.detail ||
            "Invalid admin username or password."
        );
        return;
      }

      const sessionResponse = await fetch(`${API_BASE}/api/admin/me/`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const sessionData = await readResponse(sessionResponse);

      if (
        !sessionResponse.ok ||
        sessionData.authenticated !== true
      ) {
        setError(
          sessionData.message ||
            sessionData.detail ||
            "Admin login succeeded, but the session could not be verified."
        );
        return;
      }

      if (typeof onLogin === "function") {
        onLogin(sessionData.username || data.username || username.trim());
      } else {
        setError("Admin login succeeded, but the app login handler is missing.");
      }
    } catch (requestError) {
      console.error("Admin login error:", requestError);
      setError(
        "Unable to connect to the server. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // REGULAR USER LOGIN
  // ========================================================

  const handleUserLogin = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/user/login/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        setError(
          data.message ||
            data.detail ||
            "Unable to log in. Check your username and password."
        );
        return;
      }

      const sessionResponse = await fetch(`${API_BASE}/api/user/me/`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const sessionData = await readResponse(sessionResponse);

      if (
        !sessionResponse.ok ||
        sessionData.authenticated !== true
      ) {
        setError(
          sessionData.message ||
            sessionData.detail ||
            "Login succeeded, but your user session could not be verified."
        );
        return;
      }

      // Regular users go to the public poll homepage, not the admin dashboard.
      window.location.assign("/");
    } catch (requestError) {
      console.error("Regular user login error:", requestError);
      setError(
        "Unable to connect to the server. Check your backend URL and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // CREATE REGULAR USER ACCOUNT
  // ========================================================

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !newUsername.trim() ||
      !email.trim() ||
      !newPassword ||
      !confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/register/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          email: email.trim(),
          password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        const details =
          data.message ||
          data.detail ||
          (typeof data === "object"
            ? Object.values(data).flat().filter(Boolean).join(" ")
            : "");

        setError(details || "Unable to create your account.");
        return;
      }

      const registeredUsername = newUsername.trim();

      setNewUsername("");
      setEmail("");
      setNewPassword("");
      setConfirmPassword("");

      setUsername(registeredUsername);
      setPassword("");
      setMode("user");
      setSuccess("Account created successfully! Please log in.");
    } catch (requestError) {
      console.error("Registration error:", requestError);
      setError(
        "Unable to connect to the server. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const isRegister = mode === "register";
  const isAdmin = mode === "admin";

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">IPL</div>

        <div className="login-heading">
          <h1>
            {isRegister
              ? "Create User Account"
              : isAdmin
                ? "Admin Login"
                : "User Login"}
          </h1>

          <p>
            {isRegister
              ? "Create your account to participate in IPL polls."
              : isAdmin
                ? "Sign in to manage the IPL 2029 Prediction Poll."
                : "Sign in to access the IPL Prediction Poll."}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => switchMode("admin")}
            disabled={loading}
            aria-pressed={isAdmin}
            style={tabStyle(isAdmin)}
          >
            Admin Login
          </button>

          <button
            type="button"
            onClick={() => switchMode("user")}
            disabled={loading}
            aria-pressed={mode === "user"}
            style={tabStyle(mode === "user")}
          >
            User Login
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            disabled={loading}
            aria-pressed={isRegister}
            style={tabStyle(isRegister)}
          >
            Create Account
          </button>
        </div>

        {success && (
          <div
            role="status"
            style={{
              padding: "12px",
              marginBottom: "16px",
              borderRadius: "8px",
              background: "#dcfce7",
              color: "#166534",
              fontSize: "14px",
            }}
          >
            {success}
          </div>
        )}

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        {/* ADMIN LOGIN FORM */}
        {isAdmin && (
          <form className="login-form" onSubmit={handleAdminLogin}>
            <div className="form-group">
              <label htmlFor="admin-username">Username</label>
              <input
                id="admin-username"
                type="text"
                placeholder="Enter admin username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Admin Sign In"}
            </button>
          </form>
        )}

        {/* REGULAR USER LOGIN FORM */}
        {mode === "user" && (
          <form className="login-form" onSubmit={handleUserLogin}>
            <div className="form-group">
              <label htmlFor="user-username">Username</label>
              <input
                id="user-username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="user-password">Password</label>
              <input
                id="user-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Signing in..." : "User Sign In"}
            </button>
          </form>
        )}

        {/* REGISTRATION FORM */}
        {isRegister && (
          <form className="login-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="new-username">Username</label>
              <input
                id="new-username"
                type="text"
                placeholder="Choose a username"
                value={newUsername}
                onChange={(event) => setNewUsername(event.target.value)}
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-email">Email Address</label>
              <input
                id="new-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-password">Password</label>
              <input
                id="new-password"
                type="password"
                placeholder="Create a password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}

        <div className="login-footer">
          IPL 2029 Prediction Poll
        </div>
      </div>
    </div>
  );
}

function tabStyle(active) {
  return {
    flex: "1 1 100px",
    padding: "12px 8px",
    borderRadius: "8px",
    border: active ? "2px solid #2563eb" : "1px solid #d1d5db",
    background: active ? "#2563eb" : "transparent",
    color: active ? "#ffffff" : "inherit",
    fontWeight: 600,
    cursor: "pointer",
  };
}

export default AdminLogin;
