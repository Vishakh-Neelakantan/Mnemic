# test_api.py
# Test script for the Spaced Repetition API

import requests
import json
from datetime import datetime

# API base URL (adjust if running on different host/port)
BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test the health check endpoint."""
    print("Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print("-" * 50)

def test_single_prediction():
    """Test single prediction endpoint."""
    print("Testing single prediction...")
    
    data = {
        "difficulty": "medium",
        "subject": "math",
        "response_time": 20.0,
        "previous_attempts": 3,
        "success_rate": 0.7,
        "days_since_last_review": 5.0,
        "study_streak": 10,
        "current_accuracy": 0.8
    }
    
    response = requests.post(f"{BASE_URL}/predict", json=data)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Predicted interval: {result['optimal_interval_days']} days")
        print(f"Next review date: {result['next_review_date']}")
    else:
        print(f"Error: {response.json()}")
    print("-" * 50)

def test_schedule_generation():
    """Test study schedule generation."""
    print("Testing schedule generation...")
    
    data = {
        "items": [
            {
                "item_id": "math_001",
                "difficulty": "medium",
                "subject": "math",
                "response_time": 15.0,
                "previous_attempts": 2,
                "success_rate": 0.8,
                "days_since_last_review": 4.0,
                "study_streak": 12,
                "current_accuracy": 0.85
            },
            {
                "item_id": "science_001",
                "difficulty": "hard",
                "subject": "science",
                "response_time": 35.0,
                "previous_attempts": 4,
                "success_rate": 0.5,
                "days_since_last_review": 2.0,
                "study_streak": 8,
                "current_accuracy": 0.6
            },
            {
                "item_id": "language_001",
                "difficulty": "easy",
                "subject": "language",
                "response_time": 8.0,
                "previous_attempts": 1,
                "success_rate": 0.95,
                "days_since_last_review": 10.0,
                "study_streak": 20,
                "current_accuracy": 0.9
            }
        ],
        "days_ahead": 14
    }
    
    response = requests.post(f"{BASE_URL}/schedule", json=data)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Total items in schedule: {result['total_items']}")
        print("\nSchedule:")
        for item in result['schedule']:
            print(f"- {item['item_id']} ({item['subject']}, {item['difficulty']})")
            print(f"  Next review: {item['next_review_date']} ({item['days_until_review']} days)")
            print(f"  Priority: {item['priority']:.2f}")
            print()
    else:
        print(f"Error: {response.json()}")
    print("-" * 50)

def test_ease_factor_update():
    """Test ease factor update."""
    print("Testing ease factor update...")
    
    response = requests.post(f"{BASE_URL}/update_ease_factor?current_ease=2.5&performance=0.8")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Old ease factor: {result['old_ease_factor']}")
        print(f"New ease factor: {result['new_ease_factor']}")
    else:
        print(f"Error: {response.json()}")
    print("-" * 50)

if __name__ == "__main__":
    print("Testing Spaced Repetition API")
    print("=" * 50)
    
    try:
        test_health_check()
        test_single_prediction()
        test_schedule_generation()
        test_ease_factor_update()
        
        print("All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to API. Make sure the FastAPI server is running.")
        print("Run: python fastapi_spaced_repetition.py")
    except Exception as e:
        print(f"Test failed with error: {e}")

# Example curl commands for testing:
print("\nExample curl commands:")
print("# Health check")
print(f"curl -X GET {BASE_URL}/health")
print()
print("# Single prediction")
print(f"""curl -X POST {BASE_URL}/predict \\
  -H "Content-Type: application/json" \\
  -d '{{"difficulty": "medium", "subject": "math", "response_time": 20.0, "previous_attempts": 3, "success_rate": 0.7, "days_since_last_review": 5.0, "study_streak": 10, "current_accuracy": 0.8}}'""")