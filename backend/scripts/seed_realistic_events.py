import asyncio
import logging
from datetime import datetime, timedelta
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.core.config import settings
from app.models.event import EventType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Realistic Ward-Specific Events aligned with Model
REALISTIC_EVENTS = [
    # Mumbai
    {
        "name": "Ganesh Chaturthi Procession",
        "description": "Major cultural procession through central wards causing high footfall and traffic congestion in Dadar Ward.",
        "event_type": EventType.FESTIVAL,
        "risk_multiplier": 1.8,
        "zones_affected": ["Central Market", "Dadar Ward", "Prabhadevi"],
        "start_date": datetime.now() + timedelta(days=5),
        "end_date": datetime.now() + timedelta(days=15),
    },
    {
        "name": "Monsoon High Tide Alert",
        "description": "Predicted heavy rainfall coinciding with high tide; risk of localized flooding in South Mumbai (A Ward).",
        "event_type": EventType.SEASONAL,
        "risk_multiplier": 1.4,
        "zones_affected": ["Marine Drive", "Colaba", "Fort"],
        "start_date": datetime.now() + timedelta(days=1),
        "end_date": datetime.now() + timedelta(days=3),
    },
    # Bengaluru
    {
        "name": "IT Corridor Marathon",
        "description": "Annual charity run through the IT corridor causing temporary road closures in Mahadevapura Ward.",
        "event_type": EventType.OTHER,
        "risk_multiplier": 1.2,
        "zones_affected": ["Whitefield", "Electronic City", "Outer Ring Road"],
        "start_date": datetime.now() + timedelta(days=10),
        "end_date": datetime.now() + timedelta(days=10),
    },
    {
        "name": "Kadalekai Parishe",
        "description": "Traditional groundnut fair with massive crowds in Basavanagudi (South Ward).",
        "event_type": EventType.FESTIVAL,
        "risk_multiplier": 1.6,
        "zones_affected": ["Basavanagudi", "Hanumanthanagar", "Gandhi Bazaar"],
        "start_date": datetime.now() - timedelta(days=2),
        "end_date": datetime.now() + timedelta(days=2),
    },
    # Delhi
    {
        "name": "International Trade Fair",
        "description": "Trade fair exhibition attracting widespread visitors and VIP movement in Central Delhi.",
        "event_type": EventType.OTHER,
        "risk_multiplier": 1.3,
        "zones_affected": ["Pragati Maidan", "India Gate", "ITO"],
        "start_date": datetime.now() + timedelta(days=20),
        "end_date": datetime.now() + timedelta(days=30),
    },
    {
        "name": "Winter Smog Advisory",
        "description": "Severe smog and fog conditions impacting visibility and public health in Old Delhi wards.",
        "event_type": EventType.SEASONAL,
        "risk_multiplier": 1.2,
        "zones_affected": ["Chandni Chowk", "Kashmere Gate", "Daryaganj"],
        "start_date": datetime.now() - timedelta(days=5),
        "end_date": datetime.now() + timedelta(days=5),
    }
]

async def seed_realistic_events():
    """Wipe old events and seed realistic localized ones"""
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.DATABASE_NAME]
        
        # 1. Clear existing events
        logger.info("Clearing existing events...")
        await db.events.delete_many({})
        
        # 2. Seed new realistic ones
        logger.info(f"Seeding {len(REALISTIC_EVENTS)} realistic ward-specific events...")
        
        seeded_count = 0
        for event in REALISTIC_EVENTS:
            event["created_at"] = datetime.utcnow()
            event["updated_at"] = datetime.utcnow()
            # Ensure dates are UTC and stripped of micros for cleaner display
            event["start_date"] = event["start_date"].replace(hour=0, minute=0, second=0, microsecond=0)
            event["end_date"] = event["end_date"].replace(hour=23, minute=59, second=59, microsecond=0)
            
            await db.events.insert_one(event)
            seeded_count += 1
            
        logger.info(f"[OK] Seeding completed. {seeded_count} events created.")
        
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(seed_realistic_events())
