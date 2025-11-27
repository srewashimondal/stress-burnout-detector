import { useState } from "react";
import "./App.css";
import { analyzeJournalEntry } from "./api";
import type { AnalyzeResponse } from "./api";


type Page = "home" | "about";

function App() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [page, setPage] = useState<Page>("home");

  const handleAnalyze = async () => {
    setError(null);
    setResult(null);

    if (!text.trim()) {
      setError("Please write a short journal entry first.");
      return;
    }

    try {
      setLoading(true);

      const data = await analyzeJournalEntry(text); // ✅ call our helper
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="nav-inner">
          <div className="nav-left">
            <div className="logo-circle">☼</div>
            <div className="brand">
              <span className="brand-name">Reflectly</span>
              <span className="brand-tagline">
                Journal-powered stress & emotion insights
              </span>
            </div>
          </div>
          <div className="nav-links">
            <button
              className={`nav-link ${page === "home" ? "nav-link-active" : ""}`}
              onClick={() => setPage("home")}
            >
              Home
            </button>
            <button
              className={`nav-link ${
                page === "about" ? "nav-link-active" : ""
              }`}
              onClick={() => setPage("about")}
            >
              About
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="container">
        {page === "home" && (
          <>
            <header className="hero">
              <h1>
                Check In With Your
                <span className="highlight"> Stress & Emotions</span>
              </h1>
              <p className="subtitle">
                Paste a short journal entry and let Reflectly estimate your
                stress level and dominant emotion using our fine-tuned
                DistilBERT model.
              </p>
            </header>

            <main className="content">
              <section className="card">
                <div className="card-header-row">
                  <h2>Analyze Your Journal Entry</h2>
                  <span className="badge">Private • Local API</span>
                </div>
                <p className="card-subtitle">
                  Your text is sent only to your own backend running on this
                  device. We don&apos;t store your entries.
                </p>

                <textarea
                  className="journal-input"
                  placeholder="Write about your day, how you're feeling, or anything on your mind..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                />

                {error && <div className="error">{error}</div>}

                <button
                  className="analyze-button"
                  onClick={handleAnalyze}
                  disabled={loading}
                >
                  {loading ? "Analyzing..." : "Analyze Emotions"}
                </button>

                {result && (
                  <div className="results">
                    <h3>Results</h3>

                    <div className="result-row">
                      <span className="label">Primary Emotion</span>
                      <span className="value">{result.primary_emotion}</span>
                    </div>

                    <div className="result-row">
                      <span className="label">Stress Level</span>
                      <span className="value">{result.stress_level}</span>
                    </div>

                    <details className="raw-json">
                      <summary>View raw model output</summary>
                      <pre>{JSON.stringify(result, null, 2)}</pre>
                    </details>
                  </div>
                )}
              </section>
            </main>
          </>
        )}

        {page === "about" && (
          <main className="about">
            <h1>About Reflectly</h1>
            <p>
              Reflectly is a small experimental tool that helps you reflect on
              your mental state by analyzing your journal entries. It uses a
              fine-tuned DistilBERT model to classify emotions and estimate
              stress intensity from text.
            </p>
            <p>
              The goal is not to replace therapy or professional care, but to
              give you a gentle nudge to check in with yourself. By pairing
              journaling with automatic feedback, Reflectly can help you
              notice patterns in your mood and stress over time.
            </p>
            <p className="about-note">
              ⚠️ <strong>Disclaimer:</strong> This project is for educational
              and wellbeing purposes only. It is <strong>not</strong> a medical
              device and should not be used for diagnosis or treatment.
            </p>
          </main>
        )}

        <footer className="footer">
          Built by Srewashi · Powered by FastAPI &amp; DistilBERT
        </footer>
      </div>
    </div>
  );
}

export default App;
