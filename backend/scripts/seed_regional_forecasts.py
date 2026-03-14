import asyncio
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REGIONS_MAP = {
    "North": ["Delhi", "Shimla", "Jaipur", "Prayagraj"],
    "South-West": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kochi", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
    "South-East": ["Bengaluru", "Chennai", "Hyderabad"],
    "West": ["Ahmedabad", "Indore", "Mumbai", "Panaji", "Pune"],
    "East": ["Kolkata"]
}

async def seed_regional_forecasts():
    """
    Generate and seed regional ARIMA forecasts by scaling global forecasts 
    based on historical city volumes in the preprocessed CSV.
    """
    try:
        base_path = Path(__file__).resolve().parent.parent
        data_file = base_path / "data" / "models" / "civic_risk_preprocessed_xgb.csv"
        
        if not data_file.exists():
            logger.error(f"Data file not found at {data_file}")
            return

        logger.info(f"Reading historical data from {data_file}...")
        df = pd.read_csv(data_file)
        global_total = len(df)
        
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.DATABASE_NAME]
        
        # Get Global Forecasts to scale from
        logger.info("Fetching Global ARIMA forecasts from MongoDB...")
        global_forecasts = await db.forecasts.find({"zone": "Global", "model_type": "ARIMA"}).sort("date").to_list(length=100)
        
        if not global_forecasts:
            logger.error("No Global forecasts found to scale from. Run seed_arima_forecasts.py first.")
            return

        # Clear existing regional forecasts
        region_names = list(REGIONS_MAP.keys())
        logger.info(f"Clearing existing ARIMA forecasts for regions: {region_names}")
        await db.forecasts.delete_many({"zone": {"$in": region_names}, "model_type": "ARIMA"})
        
        new_docs = []
        now = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Pre-compute global forecast stats once
        global_vals = [float(f['predicted_value']) for f in global_forecasts]
        global_mean = sum(global_vals) / len(global_vals) if global_vals else 1.0

        for region, cities in REGIONS_MAP.items():
            logger.info(f"Processing real data for region: {region}")
            
            # 1. Filter region data
            region_df = df[df['City'].isin(cities)].copy()
            if region_df.empty:
                logger.warning(f"No data found for region {region}")
                continue
                
            region_df['Date'] = pd.to_datetime(region_df['Date'])
            
            # 2. Real monthly volume (30x multiplier matches ForecastService logic)
            monthly_counts = region_df.groupby(region_df['Date'].dt.to_period('M')).size()
            monthly_volume = (monthly_counts * 30).astype(float)

            # 3. Baseline from last 12 real months (same unit as global forecast)
            recent_mean = float(monthly_volume.tail(12).mean()) if len(monthly_volume) > 0 else 0.0
            recent_std = float(monthly_volume.tail(12).std()) if len(monthly_volume) > 1 else recent_mean * 0.1

            if recent_mean == 0:
                logger.warning(f"Region {region} has no complaint volume — skipping")
                continue

            # 4. Generate 6-month regional forecast by transferring ARIMA shape with regional volume
            #    deviation_factor: how far each ARIMA month deviates from ARIMA mean
            #    Apply same deviation ratio to the regional mean → gives realistic regional forecast
            for gf in global_forecasts:
                deviation_factor = float(gf['predicted_value']) / global_mean  # shape transfer
                regional_prediction = recent_mean * deviation_factor

                doc = {
                    "date": gf["date"],
                    "zone": region,
                    "predicted_value": max(1, round(regional_prediction)),
                    "lower_bound": max(0, round(regional_prediction - recent_std)),
                    "upper_bound": max(0, round(regional_prediction + recent_std)),
                    "confidence": 0.90,
                    "model_type": "ARIMA",
                    "created_at": datetime.utcnow()
                }
                new_docs.append(doc)
        
        if new_docs:
            await db.forecasts.insert_many(new_docs)
            logger.info(f"[OK] Successfully seeded {len(new_docs)} real-data regional forecast points.")
        else:
            logger.warning("No regional forecasts generated.")

    except Exception as e:
        logger.error(f"Error seeding regional forecasts: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(seed_regional_forecasts())
