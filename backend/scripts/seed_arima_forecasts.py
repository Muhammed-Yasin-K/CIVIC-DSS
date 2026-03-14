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


async def seed_arima_forecasts():
    """
    Load the SARIMA model, generate 6-month monthly forecasts starting from 
    the current month, and seed them into MongoDB.
    """
    try:
        base_path = Path(__file__).resolve().parent.parent
        model_path = base_path / "data" / "models" / "arima_complaint_forecast.pkl"

        if not model_path.exists():
            logger.error(f"SARIMA model not found at {model_path}. Run retrain_arima.py first.")
            return

        # Load model (SARIMAX native format)
        logger.info(f"Loading SARIMA model from {model_path}...")
        from statsmodels.tsa.statespace.sarimax import SARIMAXResults
        model_fit = SARIMAXResults.load(str(model_path))

        # Generate 6-month forecast
        forecast_steps = 6
        logger.info(f"Generating {forecast_steps} months of SARIMA forecasts...")
        forecast_res = model_fit.get_forecast(steps=forecast_steps)
        forecast_values = forecast_res.predicted_mean
        conf_int = forecast_res.conf_int()

        logger.info(f"  Forecast values: {list(forecast_values.round(0).astype(int))}")

        # Prepare MongoDB documents
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.DATABASE_NAME]

        # Clear existing Global ARIMA forecasts
        result = await db.forecasts.delete_many({"model_type": "ARIMA", "zone": "Global"})
        logger.info(f"Cleared {result.deleted_count} existing forecasts")

        from dateutil.relativedelta import relativedelta

        # Forecast starts from CURRENT month
        start_date = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        forecast_docs = []

        for i in range(forecast_steps):
            val = float(forecast_values.iloc[i])
            lower = float(conf_int.iloc[i, 0])
            upper = float(conf_int.iloc[i, 1])
            forecast_date = start_date + relativedelta(months=i)

            doc = {
                "date": forecast_date,
                "zone": "Global",
                "predicted_value": max(0, round(val)),   # floor at 0
                "lower_bound": max(0, round(lower)),
                "upper_bound": max(0, round(upper)),
                "confidence": 0.95,
                "model_type": "ARIMA",
                "created_at": datetime.utcnow()
            }
            forecast_docs.append(doc)
            logger.info(f"  {forecast_date.strftime('%b %Y')}: {round(val):.0f} [{round(lower):.0f} – {round(upper):.0f}]")

        if forecast_docs:
            await db.forecasts.insert_many(forecast_docs)
            logger.info(f"[OK] Seeded {len(forecast_docs)} monthly SARIMA forecasts to MongoDB")

    except Exception as e:
        logger.error(f"Error seeding SARIMA forecasts: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(seed_arima_forecasts())
