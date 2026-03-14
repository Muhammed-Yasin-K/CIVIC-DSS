import asyncio
import logging
import pandas as pd
import numpy as np
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.ml.models.dbscan_model import DBSCANModel
from app.ml.model_manager import model_manager
from datetime import datetime
from pathlib import Path
import xgboost as xgb

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_hotspots_from_historical_data():
    logger.info("Initializing ModelManager...")
    model_manager.load_all_models()
    
    if not model_manager.is_model_loaded("xgboost"):
        logger.error("XGBoost model failed to load. Cannot proceed with seeding.")
        return

    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    # 1. Load diverse geographic data from clusters CSV
    # This file contains ~500 unique award-level points across multiple cities
    csv_path = Path(__file__).resolve().parent.parent / "data" / "models" / "dbscan_hotspot_clusters.csv"
    if not csv_path.exists():
        logger.error(f"Geographic data CSV not found at {csv_path}")
        return
        
    logger.info(f"Loading diverse geographic data from {csv_path}...")
    df = pd.read_csv(csv_path)
    logger.info(f"Loaded {len(df)} records")

    # 2. Predict Risk Scores using XGBoost for these locations
    model = model_manager.get_model("xgboost")
    feature_columns = model_manager.get_encoder("feature_columns")
    
    if not feature_columns:
        logger.error("Feature columns not found.")
        return

    logger.info("Preparing features for XGBoost prediction...")
    # Prepare a full feature set for these 500 points
    # We use Latitude/Longitude from the file and defaults for the rest
    X_pred = pd.DataFrame(index=df.index)
    for col in feature_columns:
        if col == "Latitude": X_pred[col] = df['Latitude']
        elif col == "Longitude": X_pred[col] = df['Longitude']
        else: X_pred[col] = 0.0 # Default for other features
    
    dmatrix = xgb.DMatrix(X_pred, feature_names=feature_columns)
    
    logger.info("Running batch prediction...")
    risk_preds = model.predict(dmatrix)
    
    if len(risk_preds.shape) > 1 and risk_preds.shape[1] > 1:
        risk_scores = (risk_preds[:, 0] * 1.0 + risk_preds[:, 1] * 0.7 + risk_preds[:, 3] * 0.4 + risk_preds[:, 2] * 0.1)
    else:
        risk_scores = risk_preds
    
    df['predicted_risk_score'] = risk_scores
    
    # 3. Create Hotspots directly from these 500 points for high granularity
    # Since these are already ward-level centers, we don't need further DBSCAN
    logger.info("Generating hotspots from geographic points...")
    
    # Filter for reasonable risk to keep it "realistic" (Top 80%)
    high_granularity_df = df.nlargest(500, 'predicted_risk_score').copy()
    
    # 4. Save to hotspots collection
    # Clear existing
    await db.hotspots.delete_many({})
    logger.info("Cleared existing hotspots in MongoDB")
    
    hotspot_docs = []
    for i, row in high_granularity_df.iterrows():
        # Correctly map categorical level
        level = str(row.get('Hotspot_Level', 'Medium')).upper()
        
        # Parse date if available
        last_date = None
        if 'Last_Date' in df.columns and str(row.get('Last_Date')) != 'nan':
            try:
                last_date = datetime.strptime(str(row['Last_Date']), '%Y-%m-%d')
            except:
                pass

        hotspot_doc = {
            "zone": f"{row.get('Ward', 'Zone')} ({row.get('City', 'Unknown')})",
            "latitude": float(row['Latitude']),
            "longitude": float(row['Longitude']),
            "avg_risk_score": float(max(row['predicted_risk_score'] * 100, row.get('Priority_Score', 0) * 5)),
            "occurrence_count": int(row.get('Total', 10)),
            "risk_frequency": level.capitalize(), # Legacy support
            "hotspot_level": level, # Dedicated severity field
            "city": str(row.get('City', 'Unknown')),
            "ward": str(row.get('Ward', 'Unknown')),
            "state": str(row.get('State', 'Unknown')),
            "issue_type": str(row.get('Top_Issue', 'General')),
            "category": str(row.get('Top_Cluster', 'Public Safety')),
            "top_season": str(row.get('Top_Season', 'Unknown')),
            "last_occurrence": last_date,
            "real_incident": str(row.get('Real_Incident', '')),
            "cluster_id": i,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        hotspot_docs.append(hotspot_doc)
        
    if hotspot_docs:
        await db.hotspots.insert_many(hotspot_docs)
        logger.info(f"Successfully seeded {len(hotspot_docs)} granular hotspots to MongoDB")
            
if __name__ == "__main__":
    asyncio.run(seed_hotspots_from_historical_data())
