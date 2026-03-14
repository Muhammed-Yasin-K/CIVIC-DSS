"""
Seed real zones using raw Motor client (bypassing Beanie for reliability).
- Population: real 2011 Census ward-level averages
- Risk override: derived from actual live hotspots collection (not CSV counts)
- Regions: North, South-West, South-East, West, East (matches full project)
"""
import asyncio
import sys
sys.path.insert(0, '.')

import pandas as pd
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

REGION_MAP = {
    "Delhi": "North", "Shimla": "North", "Jaipur": "North", "Prayagraj": "North",
    "Alappuzha": "South-West", "Ernakulam": "South-West", "Idukki": "South-West",
    "Kannur": "South-West", "Kasaragod": "South-West", "Kochi": "South-West",
    "Kollam": "South-West", "Kottayam": "South-West", "Kozhikode": "South-West",
    "Malappuram": "South-West", "Palakkad": "South-West", "Pathanamthitta": "South-West",
    "Thiruvananthapuram": "South-West", "Thrissur": "South-West", "Wayanad": "South-West",
    "Bengaluru": "South-East", "Chennai": "South-East", "Hyderabad": "South-East",
    "Ahmedabad": "West", "Indore": "West", "Mumbai": "West", "Panaji": "West", "Pune": "West",
    "Kolkata": "East",
}

# Real 2011 Census ward-level average population per ward (whole number)
# Source: Census of India 2011 Primary Census Abstract (Municipal Ward level)
REAL_WARD_POP = {
    "Delhi": 61000, "Ahmedabad": 29000, "Bengaluru": 48000, "Chennai": 35440,
    "Hyderabad": 45400, "Kochi": 8130, "Ernakulam": 8130, "Kolkata": 31160,
    "Mumbai": 54970, "Pune": 19230, "Jaipur": 33475, "Indore": 23066,
    "Prayagraj": 13907, "Shimla": 6790, "Panaji": 3813, "Kozhikode": 8123,
    "Thrissur": 3160, "Thiruvananthapuram": 9577, "Alappuzha": 3286,
    "Kasaragod": 2505, "Idukki": 1667, "Palakkad": 2471, "Kollam": 7226,
    "Malappuram": 3704, "Pathanamthitta": 2244, "Wayanad": 4800,
    "Kannur": 5500, "Kottayam": 4200,
}


async def seed():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    # --- Load CSV ---
    try:
        df = pd.read_csv("data/models/dbscan_hotspot_clusters.csv")
    except FileNotFoundError:
        print("ERROR: CSV not found.")
        return

    # --- Load real risk levels from live hotspots collection ---
    print("Reading hotspot risk data from live MongoDB...")
    hotspot_risk = {}  # key: (ward, city) -> highest level
    cursor = db.hotspots.find({}, {"ward": 1, "city": 1, "hotspot_level": 1, "avg_risk_score": 1})
    async for doc in cursor:
        ward = doc.get("ward", "")
        city = doc.get("city", "")
        level = (doc.get("hotspot_level") or "").upper()
        score = doc.get("avg_risk_score", 0) or 0
        key = (ward, city)
        prev = hotspot_risk.get(key, ("", 0))
        # Keep highest level (CRITICAL > HIGH > MEDIUM)
        level_order = {"CRITICAL": 3, "HIGH": 2, "MEDIUM": 1, "": 0}
        if level_order.get(level, 0) > level_order.get(prev[0], 0):
            hotspot_risk[key] = (level, score)

    total_hotspots_with_risk = len(hotspot_risk)
    print(f"Loaded {total_hotspots_with_risk} ward-city risk mappings from hotspots.")

    # --- Delete existing zones ---
    result = await db.administrative_zones.delete_many({})
    print(f"Deleted {result.deleted_count} existing zones from 'administrative_zones'.")

    # --- Get unique wards from CSV ---
    wards_df = df.groupby(["Ward", "City", "State"]).agg({
        "Critical_Count": "sum",
        "High_Count": "sum",
        "Medium_Count": "sum",
        "Total": "sum",
        "Top_Issue": "first",
        "Top_Season": "first",
    }).reset_index().sort_values(["City", "Ward"])

    print(f"Found {len(wards_df)} unique wards from CSV.")

    now = datetime.utcnow()
    docs = []
    stats = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "dynamic": 0}

    for _, row in wards_df.iterrows():
        ward = str(row["Ward"])
        city = str(row["City"])
        state = str(row["State"])
        region = REGION_MAP.get(city, "West")
        population = REAL_WARD_POP.get(city, 5000)

        # Ward ID
        ward_num = "".join(filter(str.isdigit, ward))
        ward_id = f"W-{ward_num.zfill(3)}" if ward_num else f"W-{len(docs)+1:03d}"

        # Risk from live hotspot collection
        live_risk, live_score = hotspot_risk.get((ward, city), (None, 0))

        # Fallback to CSV counts if not in hotspots
        if not live_risk:
            c = int(row.get("Critical_Count", 0) or 0)
            h = int(row.get("High_Count", 0) or 0)
            if c >= 3:
                live_risk = "CRITICAL"
            elif c >= 1 or h >= 3:
                live_risk = "HIGH"
            elif h >= 1:
                live_risk = "MEDIUM"
            else:
                live_risk = None

        if live_risk:
            stats[live_risk] = stats.get(live_risk, 0) + 1
        else:
            stats["dynamic"] += 1

        total_inc = int(row.get("Total", 0) or 0)
        top_issue = str(row.get("Top_Issue", "General"))
        top_season = str(row.get("Top_Season", ""))
        desc = f"{city}, {state} | {total_inc} incidents | Primary: {top_issue}"
        if top_season and top_season not in ["nan", "None"]:
            desc += f" | Peak: {top_season}"

        docs.append({
            "name": ward,
            "city": city,
            "region": region,
            "ward_id": ward_id,
            "population": population,
            "area_sq_km": None,
            "description": desc,
            "risk_level_override": live_risk,
            "created_at": now,
            "updated_at": now,
        })

    if docs:
        await db.administrative_zones.insert_many(docs)

    total_pop = sum(d["population"] for d in docs)
    print()
    print("=" * 50)
    print(f"Seeded {len(docs)} zones")
    print(f"Total real population: {total_pop:,}")
    print(f"CRITICAL: {stats['CRITICAL']}")
    print(f"HIGH:     {stats['HIGH']}")
    print(f"MEDIUM:   {stats['MEDIUM']}")
    print(f"Dynamic:  {stats['dynamic']}")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(seed())
