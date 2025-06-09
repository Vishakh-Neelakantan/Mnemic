# fastapi_spaced_repetition.py
# FastAPI backend integration for the spaced repetition model

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
from datetime import datetime, timedelta
import json
import os
from tensorflow.keras.losses import MeanSquaredError # type: ignore


# Pydantic models for API requests
class StudyItem(BaseModel):
    item_id: str
    difficulty: str  # 'easy', 'medium', 'hard'
    subject: str     # 'math', 'science', 'language', 'history', 'art'
    response_time: float
    previous_attempts: int
    success_rate: float
    days_since_last_review: float
    study_streak: int
    current_accuracy: float
    ease_factor: Optional[float] = None

class PredictionRequest(BaseModel):
    difficulty: str
    subject: str
    response_time: float
    previous_attempts: int
    success_rate: float
    days_since_last_review: float
    study_streak: int
    current_accuracy: float
    ease_factor: Optional[float] = None

class ScheduleRequest(BaseModel):
    items: List[StudyItem]
    days_ahead: int = 30

class SpacedRepetitionAPI:
    def __init__(self, model_path: str = "spaced_repetition_model"):
        self.model = None
        self.scaler = None
        self.difficulty_encoder = None
        self.subject_encoder = None
        self.is_loaded = False
        self.ease_factor_default = 2.5
        self.ease_factor_min = 1.3
        self.ease_factor_max = 2.5
        
        # Load model on initialization
        self.load_model(model_path)
    
    def load_model(self, filepath: str):
        """Load the trained model and preprocessors."""
        try:
            model_files = {
                'model': f"{filepath}_model.h5",
                'scaler': f"{filepath}_scaler.pkl",
                'difficulty_encoder': f"{filepath}_difficulty_encoder.pkl",
                'subject_encoder': f"{filepath}_subject_encoder.pkl"
            }
            
            # Check if all files exist
            # for name, path in model_files.items():
            #     if not os.path.exists(path):
            #         raise FileNotFoundError(f"Model file not found: {path}")
            for name, path in model_files.items():
                abs_path = os.path.abspath(path)
                print(f"🔍 Looking for {name} at: {abs_path}")
                if not os.path.exists(path):
                    print(f"❌ File not found: {abs_path}")
                    raise FileNotFoundError(f"Model file not found: {abs_path}")
            
            # Load the Keras model
            self.model = tf.keras.models.load_model(model_files['model'], custom_objects={"mse": MeanSquaredError()})
            
            # Load preprocessors
            self.scaler = joblib.load(model_files['scaler'])
            self.difficulty_encoder = joblib.load(model_files['difficulty_encoder'])
            self.subject_encoder = joblib.load(model_files['subject_encoder'])
            
            self.is_loaded = True
            print(f"Model loaded successfully from {filepath}")
            
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            raise e
    
    def predict_optimal_interval(self, request: PredictionRequest) -> float:
        """Predict optimal review interval."""
        if not self.is_loaded:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        ease_factor = request.ease_factor or self.ease_factor_default
        
        # Handle unknown categories
        try:
            difficulty_encoded = self.difficulty_encoder.transform([request.difficulty])[0]
        except ValueError:
            difficulty_encoded = 0  # Default to first category
            
        try:
            subject_encoded = self.subject_encoder.transform([request.subject])[0]
        except ValueError:
            subject_encoded = 0  # Default to first category
        
        # Prepare features
        features = np.array([[
            difficulty_encoded, subject_encoded, request.response_time,
            request.previous_attempts, request.success_rate, request.days_since_last_review,
            request.study_streak, request.current_accuracy, ease_factor
        ]])
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Make prediction (model outputs sigmoid, need to scale back)
        prediction = self.model.predict(features_scaled, verbose=0)[0][0]
        
        # Scale from [0,1] back to [1,90] days (matching training data)
        prediction = 1 + (prediction * 89)
        
        # Apply business logic adjustments
        if request.success_rate < 0.3:
            prediction = max(1, prediction * 0.3)
        elif request.success_rate < 0.6:
            prediction = max(1, prediction * 0.6)
        elif request.success_rate > 0.9:
            prediction = min(90, prediction * 1.3)
        
        # Difficulty adjustments
        difficulty_multipliers = {'easy': 1.2, 'medium': 1.0, 'hard': 0.7}
        prediction *= difficulty_multipliers.get(request.difficulty, 1.0)
        
        # Ensure bounds
        prediction = max(1, min(prediction, 90))
        
        return float(prediction)
    
    def generate_study_schedule(self, request: ScheduleRequest) -> List[Dict]:
        """Generate study schedule for multiple items."""
        if not self.is_loaded:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        schedule = []
        current_date = datetime.now()
        
        for item in request.items:
            # Create prediction request from study item
            pred_request = PredictionRequest(
                difficulty=item.difficulty,
                subject=item.subject,
                response_time=item.response_time,
                previous_attempts=item.previous_attempts,
                success_rate=item.success_rate,
                days_since_last_review=item.days_since_last_review,
                study_streak=item.study_streak,
                current_accuracy=item.current_accuracy,
                ease_factor=item.ease_factor
            )
            
            interval = self.predict_optimal_interval(pred_request)
            next_review_date = current_date + timedelta(days=float(interval))
            
            if next_review_date <= current_date + timedelta(days=request.days_ahead):
                priority = self._calculate_priority(item, interval)
                
                schedule.append({
                    'item_id': item.item_id,
                    'subject': item.subject,
                    'difficulty': item.difficulty,
                    'next_review_date': next_review_date.strftime('%Y-%m-%d'),
                    'days_until_review': int(interval),
                    'priority': priority,
                    'success_rate': item.success_rate
                })
        
        # Sort by priority (lower = more urgent)
        schedule.sort(key=lambda x: x['priority'])
        
        return schedule
    
    def _calculate_priority(self, item: StudyItem, interval: float) -> float:
        """Calculate priority score for scheduling."""
        priority = interval
        
        # Difficulty adjustment
        difficulty_weights = {'easy': 1.0, 'medium': 0.8, 'hard': 0.6}
        priority *= difficulty_weights.get(item.difficulty, 1.0)
        
        # Success rate adjustment
        if item.success_rate < 0.6:
            priority *= 0.7
        
        return priority
    
    def update_ease_factor(self, current_ease: float, performance: float) -> float:
        """Update ease factor based on performance."""
        if performance >= 0.8:
            new_ease = current_ease * 1.1
        elif performance >= 0.6:
            new_ease = current_ease
        else:
            new_ease = current_ease * 0.8
        
        return max(self.ease_factor_min, min(new_ease, self.ease_factor_max))

# Initialize the API
app = FastAPI(title="Spaced Repetition API", version="1.0.0")

# Initialize the model (make sure model files are in the same directory)
try:
    sr_api = SpacedRepetitionAPI()
except Exception as e:
    print(f"Warning: Could not load model on startup: {e}")
    sr_api = None

@app.get("/")
async def root():
    return {"message": "Spaced Repetition API is running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": sr_api is not None and sr_api.is_loaded
    }

@app.post("/predict")
async def predict_interval(request: PredictionRequest):
    """Predict optimal review interval for a single item."""
    if sr_api is None or not sr_api.is_loaded:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        interval = sr_api.predict_optimal_interval(request)
        next_review_date = (datetime.now() + timedelta(days=interval)).strftime('%Y-%m-%d')
        
        return {
            "optimal_interval_days": round(interval, 1),
            "next_review_date": next_review_date,
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")

@app.post("/schedule")
async def generate_schedule(request: ScheduleRequest):
    """Generate study schedule for multiple items."""
    if sr_api is None or not sr_api.is_loaded:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        schedule = sr_api.generate_study_schedule(request)
        
        return {
            "schedule": schedule,
            "total_items": len(schedule),
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Schedule generation failed: {str(e)}")

@app.post("/update_ease_factor")
async def update_ease_factor(current_ease: float, performance: float):
    """Update ease factor based on performance."""
    if sr_api is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        new_ease = sr_api.update_ease_factor(current_ease, performance)
        return {
            "old_ease_factor": current_ease,
            "new_ease_factor": round(new_ease, 2),
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ease factor update failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)