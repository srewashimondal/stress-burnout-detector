import { useState } from "react";
import "./App.css";
import {
  analyzeJournalEntry,
  getCopingSuggestion,
  type AnalyzeResponse,
} from "./api";

type Page = "home" | "about";

function App() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [copingText, setCopingText] = useState("");

  const handleAnalyze = async () => {
    setError(null);
    setResult(null);
    setCopingText(""); // clear old coping text

    if (!text.trim()) {
      setError("Please write a short journal entry first.");
      return;
    }

    try {
      setLoading(true);

      // Step 1: Emotion + stress classification (your DistilBERT model)
      const data = await analyzeJournalEntry(text);
      setResult(data);

      // Step 2: Call backend /coping route (OpenAI) for supportive text
      const coping = await getCopingSuggestion({
        journal: text,
        primary_emotion: data.primary_emotion,
        stress_level: data.stress_level,
      });

      setCopingText(coping.coping_text);
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
                Take a moment to share what’s on your mind. Reflectly will gently check in on your stress 
                and emotions using our fine-tuned model.
              </p>
            </header>

            <main className="content">
              <section className="card">
                <div className="card-header-row">
                  <h2>Analyze Your Journal Entry</h2>
                  <span className="badge">Private</span>
                </div>
                <p className="card-subtitle">
                  Please type your journal entry below!
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

                    {copingText && (
                      <div className="coping-box">
                        <h3>Coping Suggestions:</h3>
                        <p>{copingText}</p>
                      </div>
                    )}
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
              Reflectly is a small project built to help you slow down for a moment and
              understand what you’re feeling. When you write a journal entry, it looks for
              patterns in your stress and emotions using our fine-tuned DistilBERT model.
            </p>
            <p>
              It’s not here to replace therapy or professional support. Think of it more as
              a gentle companion, something that gives you a little clarity when life feels a
              bit overwhelming or uncertain.
            </p>
            <p className="about-note">
              ⚠️ <strong>Disclaimer:</strong> Reflectly is for personal insight only. It is 
              <strong> not</strong> intended for diagnosis, crisis support, or medical care.
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
