import random
import os
from pymongo import MongoClient
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
db_name = os.getenv("DATABASE_NAME", "civic_risk_db")

print(f"Connecting to MongoDB at: {mongo_url}")
client = MongoClient(mongo_url)
db = client[db_name]

# Define cities and wards for the MCA Project
cities = {
    "Mumbai": {
        "state": "Maharashtra",
        "lat": 19.0760, "lng": 72.8777,
        "wards": {
            "Ward_30": {"population": 8000,  "base": 25},
            "Ward_31": {"population": 12000, "base": 180},
            "Ward_32": {"population": 15000, "base": 420},
            "Ward_33": {"population": 9000,  "base": 95},
        }
    },
    "Kochi": {
        "state": "Kerala",
        "lat": 9.9312, "lng": 76.2673,
        "wards": {
            "Ward_1": {"population": 6000,  "base": 310},
            "Ward_2": {"population": 7500,  "base": 145},
            "Ward_3": {"population": 5000,  "base": 520},
            "Ward_4": {"population": 8000,  "base": 78},
        }
    },
    "Chennai": {
        "state": "Tamil Nadu",
        "lat": 13.0827, "lng": 80.2707,
        "wards": {
            "Ward_13": {"population": 11000, "base": 680},
            "Ward_14": {"population": 9500,  "base": 230},
            "Ward_15": {"population": 7000,  "base": 155},
            "Ward_16": {"population": 13000, "base": 390},
        }
    },
    "Jaipur": {
        "state": "Rajasthan",
        "lat": 26.9124, "lng": 75.7873,
        "wards": {
            "Ward_3": {"population": 9000,  "base": 700},
            "Ward_4": {"population": 6500,  "base": 340},
            "Ward_5": {"population": 8000,  "base": 210},
            "Ward_6": {"population": 7000,  "base": 125},
        }
    },
    "Kolkata": {
        "state": "West Bengal",
        "lat": 22.5726, "lng": 88.3639,
        "wards": {
            "Ward_45": {"population": 10000, "base": 450},
            "Ward_46": {"population": 8500,  "base": 280},
            "Ward_47": {"population": 12000, "base": 160},
            "Ward_48": {"population": 9000,  "base": 95},
        }
    }
}

issue_types = ["Water Supply", "Road Safety", "Sanitation", "Waste", "Crowd"]

issue_multipliers = {
    "Water Supply": 0.6,
    "Road Safety":  0.8,
    "Sanitation":   0.7,
    "Waste":        1.0,
    "Crowd":        0.5
}

print("Dropping existing collections...")
db.complaints.drop()
db.ward_master.drop()

complaints = []
ward_master_docs = []

print("Generating data...")
for city, city_data in cities.items():
    for ward, ward_data in city_data["wards"].items():

        ward_master_docs.append({
            "city": city,
            "ward": ward,
            "state": city_data["state"],
            "population": ward_data["population"],
            "latitude": city_data["lat"] + random.uniform(-0.05, 0.05),
            "longitude": city_data["lng"] + random.uniform(-0.05, 0.05),
            "area_type": random.choice(["Residential", "Commercial"])
        })

        for issue in issue_types:
            count = int(
                ward_data["base"] *
                issue_multipliers[issue] *
                random.uniform(0.8, 1.2)
            )
            # Cap count for performance if it's too high, but user wants "real data"
            # 700 is fine.
            for i in range(count):
                date = datetime.now() - timedelta(days=random.randint(0, 180))
                complaints.append({
                    "city": city,
                    "ward": ward,
                    "state": city_data["state"],
                    "issue_type": issue,
                    "population": ward_data["population"],
                    "latitude": city_data["lat"],
                    "longitude": city_data["lng"],
                    "date": date,
                    "severity": random.choice(["Low", "Medium", "High"])
                })

print(f"Inserting {len(complaints)} complaints...")
if complaints:
    # Use insert_many in chunks if it's very large
    chunk_size = 5000
    for i in range(0, len(complaints), chunk_size):
        db.complaints.insert_many(complaints[i:i + chunk_size])

print(f"Inserting {len(ward_master_docs)} ward master records...")
if ward_master_docs:
    db.ward_master.insert_many(ward_master_docs)

print("Creating indexes...")
db.complaints.create_index([("city", 1), ("ward", 1), ("issue_type", 1)])
db.ward_master.create_index([("city", 1), ("ward", 1)])

print("Done!")
print(f"Final Counts - Complaints: {db.complaints.count_documents({})}, Wards: {db.ward_master.count_documents({})}")
