export interface AnalyzeResponse {
  primary_emotion: string;                         // from backend
  stress_level: string;                           // "low" | "medium" | "high"
  stress_score: number;                           // numeric stress score
  scores: Record<string, number>;                 // emotion probabilities
  coping_strategy: string;                        // added field
  sentence_breakdown: {
    sentence: string;
    emotion: string;
    stress_level: string;
    stress_score: number;
    scores: Record<string, number>;
  }[];
}


export interface AnalyzeRequest {
  text: string;
}

const API_BASE_URL = "http://127.0.0.1:8000";

export async function analyzeJournalEntry(
  text: string
): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText || res.statusText}`);
  }

  return res.json();
}
