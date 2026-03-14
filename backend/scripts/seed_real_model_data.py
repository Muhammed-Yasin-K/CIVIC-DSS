import pandas as pd
import os
import random
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
db_name = os.getenv("DATABASE_NAME", "civic_risk_db")
csv_path = os.path.join("data", "models", "civic_risk_preprocessed_xgb.csv")

print(f"Connecting to MongoDB at: {mongo_url}")
client = MongoClient(mongo_url)
db = client[db_name]

if not os.path.exists(csv_path):
    print(f"Error: Dataset not found at {csv_path}")
    exit(1)

print(f"Reading real dataset from {csv_path}...")
df = pd.read_csv(csv_path)

print("Dropping existing collections...")
db.complaints.drop()
db.ward_master.drop()

complaints_to_insert = []
ward_master_docs = {}

print(f"Processing {len(df)} data points from CSV...")

for index, row in df.iterrows():
    city = str(row['City'])
    ward = str(row['Ward'])
    issue = str(row['Issue_Type'])
    stat_key = f"{city}_{ward}"
    
    # 1. Collect Ward Master Data (Uniqueness per city/ward)
    if stat_key not in ward_master_docs:
        ward_master_docs[stat_key] = {
            "city": city,
            "ward": ward,
            "state": str(row['State']),
            "population": float(row['Population_Affected']),
            "latitude": float(row['Latitude']),
            "longitude": float(row['Longitude']),
            "area_type": str(row['Area_Type'])
        }
    
    # 2. Generate individual records based on Complaint_Count
    # The count in the training data is the 'real' historical volume
    count = int(row['Complaint_Count'])
    
    # Batch create individual records
    # We use semi-recent dates if the date in CSV is very old, 
    # but the prompt implies using the exact training data patterns.
    # We'll use the CSV date to maintain the temporal integrity.
    try:
        base_date = datetime.strptime(str(row['Date']), "%Y-%m-%d")
    except:
        base_date = datetime.now()

    for _ in range(count):
        # Add slight time jitter to make it look like individual filings
        filing_time = base_date.replace(hour=random.randint(0,23), minute=random.randint(0,59))
        complaints_to_insert.append({
            "city": city,
            "ward": ward,
            "issue_type": issue,
            "severity": str(row['Risk_Level']),
            "date": filing_time,
            "latitude": float(row['Latitude']),
            "longitude": float(row['Longitude'])
        })

print(f"Total individual records to insert: {len(complaints_to_insert)}")
print(f"Total ward master entries: {len(ward_master_docs)}")

# Bulk Insert in chunks for performance
chunk_size = 10000
for i in range(0, len(complaints_to_insert), chunk_size):
    db.complaints.insert_many(complaints_to_insert[i:i + chunk_size])
    print(f"Inserted chunk {i // chunk_size + 1}")

if ward_master_docs:
    db.ward_master.insert_many(list(ward_master_docs.values()))

print("Creating indexes...")
db.complaints.create_index([("city", 1), ("ward", 1), ("issue_type", 1)])
db.ward_master.create_index([("city", 1), ("ward", 1)])

print("Done! Database seeded with real model data.")
