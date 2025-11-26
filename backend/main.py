from pathlib import Path
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

app = FastAPI(
    title="Stress & Emotion Detector",
    description="API that predicts emotion and stress level from journal text.",
    version="1.0.0",
)

# ------------ Request / Response models ------------

class PredictRequest(BaseModel):
    text: str


class PredictResponse(BaseModel):
    emotion: str
    label: int
    stress_level: str
    scores: dict  # emotion -> probability


# ------------ Label / stress mapping (same as in Colab) ------------

label_map = {
    0: "sadness",
    1: "joy",
    2: "love",
    3: "anger",
    4: "fear",
    5: "surprise",
}

stress_map = {
    "sadness": "high",
    "anger": "high",
    "fear": "high",
    "surprise": "medium",
    "love": "low",
    "joy": "low",
}

# ------------ Load model & tokenizer once at startup ------------

BASE_DIR = Path(__file__).resolve().parent

# Model directory = backend/emotion_model_final
MODEL_DIR = BASE_DIR / "emotion_model_final"

device = "cuda" if torch.cuda.is_available() else "cpu"

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
model.eval()  # set to evaluation mode


# ------------ Routes ------------

@app.get("/")
def read_root():
    return {"message": "Stress-burnout detector API is running"}

@app.get("/health")
def health_check():
    """Simple endpoint to check that the API is running."""
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """Predict emotion + stress from a single text string."""
    # 1. Tokenize input
    inputs = tokenizer(
        req.text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128,
    ).to(device)

    # 2. Run model
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.softmax(logits, dim=-1)[0]

    # 3. Get predicted label
    label_id = int(torch.argmax(probs))
    emotion = label_map[label_id]
    stress_level = stress_map[emotion]

    # 4. Build scores dict: emotion -> float probability
    scores = {
        label_map[i]: float(probs[i])
        for i in range(len(label_map))
    }

    # 5. Return response
    return PredictResponse(
        emotion=emotion,
        label=label_id,
        stress_level=stress_level,
        scores=scores,
    )
