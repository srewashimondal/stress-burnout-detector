from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import numpy as np
import re

# -------------------------------------------------------------
# FastAPI SETUP
# -------------------------------------------------------------

app = FastAPI(
    title="Stress & Emotion Detector",
    description="API that predicts emotion and stress level from journal text.",
    version="1.0.0",
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# DATA MODELS
# -------------------------------------------------------------

class JournalInput(BaseModel):
    text: str


# -------------------------------------------------------------
# SIMPLE SENTENCE SPLITTER (no nltk needed)
# -------------------------------------------------------------

def simple_sentence_split(text: str):
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


# -------------------------------------------------------------
# LABELS FROM YOUR MODEL (based on Kaggle emotion dataset)
# -------------------------------------------------------------
# Adjust this if your model has different label ordering

emotion_labels = ["sadness", "joy", "love", "anger", "fear", "surprise"]

# -------------------------------------------------------------
# COPING STRATEGIES
# -------------------------------------------------------------

COPING_STRATEGIES = {
    "low": {
        "joy": "Celebrate this moment and write down one thing you're grateful for.",
        "sadness": "Be kind to yourself. Drink some water or stretch for a minute.",
        "anger": "Take 3 deep breaths: inhale for 4, hold for 4, exhale for 6.",
        "fear": "Name one thing that feels safe or comforting right now.",
        "default": "Take a slow, deep breath and acknowledge your feelings gently."
    },
    "medium": {
        "joy": "Notice what went well today and how it made you feel.",
        "sadness": "Try writing a short note to yourself like you’re a supportive friend.",
        "anger": "Relax your shoulders and jaw, then breathe slowly.",
        "fear": "Try the 5-4-3-2-1 grounding technique.",
        "default": "Take a short walk or change your physical environment briefly."
    },
    "high": {
        "joy": "Hold onto the positive moment—you earned this feeling.",
        "sadness": "Reach out to someone you trust if possible.",
        "anger": "Pause and take 10 slow breaths. Imagine tension leaving your body.",
        "fear": "Put both feet on the ground and feel the support beneath you.",
        "default": "Your feelings are valid. Focus on slow breathing: in 4, hold 4, out 6."
    }
}

def get_coping_strategy(stress_level: str, emotion: str) -> str:
    level = COPING_STRATEGIES.get(stress_level, {})
    return level.get(emotion, level.get("default", "Take a deep breath."))


# -------------------------------------------------------------
# LOAD MODEL + TOKENIZER
# -------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "emotion_model_final"

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
model.eval()


# -------------------------------------------------------------
# HELPER: compute emotion + stress from logits
# -------------------------------------------------------------

def compute_emotion_and_stress(logits: torch.Tensor):
    """Compute emotion + derived stress levels from logits."""
    probs = torch.softmax(logits, dim=-1).cpu().numpy()

    emotion_idx = int(probs.argmax())
    emotion = emotion_labels[emotion_idx]

    # build dict scores
    scores = {
        emotion_labels[i]: float(p)
        for i, p in enumerate(probs)
    }

    # stress heuristic
    stress_score = (
        scores.get("fear", 0)
        + scores.get("anger", 0)
        + 0.5 * scores.get("sadness", 0)
    )
    stress_score = max(0.0, min(1.0, stress_score))

    if stress_score < 0.3:
        stress_level = "low"
    elif stress_score < 0.6:
        stress_level = "medium"
    else:
        stress_level = "high"

    return emotion, scores, stress_level, stress_score


# -------------------------------------------------------------
# ROUTES
# -------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "Stress-burnout detector API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/predict")
def predict(input: JournalInput):

    text = input.text.strip()

    # ---------- Sentence-level breakdown ----------
    sentences = simple_sentence_split(text)
    sentence_results = []

    for sent in sentences:
        inputs = tokenizer(sent, return_tensors="pt", truncation=True)
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits[0]

        emotion, scores, stress_level, stress_score = compute_emotion_and_stress(logits)

        sentence_results.append({
            "sentence": sent,
            "emotion": emotion,
            "stress_level": stress_level,
            "stress_score": stress_score,
            "scores": scores,
        })

    # ---------- Whole-text prediction ----------
    inputs = tokenizer(text, return_tensors="pt", truncation=True)
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits[0]

    full_emotion, full_scores, full_stress_level, full_stress_score = compute_emotion_and_stress(logits)

    coping = get_coping_strategy(full_stress_level, full_emotion)

    return {
        "primary_emotion": full_emotion,
        "stress_level": full_stress_level,
        "stress_score": full_stress_score,
        "scores": full_scores,
        "coping_strategy": coping,
        "sentence_breakdown": sentence_results,
    }
