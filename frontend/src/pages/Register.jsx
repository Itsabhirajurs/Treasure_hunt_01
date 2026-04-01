import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { useGame } from "../context/GameContext";
import { supabase } from "../supabaseClient";

async function hashPassword(pass) {
  const encoded = new TextEncoder().encode(pass);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function Register() {
  const [mode, setMode] = useState("register");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { dispatch } = useGame();

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "admin") {
      if (password !== "ojas2026") {
        setError("Invalid administrator password");
        return;
      }
      navigate("/admin", { state: { adminAuthed: true } });
      return;
    }

    if (!name.trim() || !password) {
      setError("Crew name and password are required");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const passwordHash = await hashPassword(password);

      if (mode === "register") {
        const payload = {
          name: name.trim(),
          password_hash: passwordHash,
          current_round: 1,
          total_score: 0,
          badges: [],
        };
        const { data, error: insertError } = await supabase.from("teams").insert(payload).select("*").single();
        if (insertError) throw insertError;
        dispatch({ type: "SET_TEAM", payload: data });
      } else {
        const { data, error: loginError } = await supabase
          .from("teams")
          .select("*")
          .eq("name", name.trim())
          .eq("password_hash", passwordHash)
          .maybeSingle();
        if (loginError) throw loginError;
        if (!data) throw new Error("No crew found with that name, sailor");
        dispatch({ type: "SET_TEAM", payload: data });
      }

      navigate("/hunt");
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell center-screen">
      <form className="pirate-card register-card" onSubmit={submit}>
        <h1>Auth Dock</h1>
        <div className="tabs">
          <button type="button" className={mode === "register" ? "tab active" : "tab"} onClick={() => setMode("register")}>NEW CREW</button>
          <button type="button" className={mode === "login" ? "tab active" : "tab"} onClick={() => setMode("login")}>RETURN SAILOR</button>
          <button type="button" className={mode === "admin" ? "tab active" : "tab"} onClick={() => setMode("admin")}>ADMINISTRATOR</button>
        </div>
        {mode !== "admin" && (
          <input className="input-field" placeholder="Team Name" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input
          className="input-field"
          placeholder={mode === "admin" ? "Administrator Password" : "Password"}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "register" && (
          <input className="input-field" placeholder="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        )}
        {error ? <p className="error-text animate-wrongAnswerShake">{error}</p> : null}
        <button className="gold-button" disabled={loading}>
          {loading ? "LOADING" : mode === "admin" ? "ENTER COMMAND CENTER" : "SET SAIL"}
        </button>
        {loading ? <LoadingSpinner inline label="Anchoring..." /> : null}
      </form>
    </main>
  );
}
