import asyncio
import sys
import os
from datetime import datetime, timedelta

# Add the parent directory to sys.path to allow importing from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.event import Event, EventType

async def seed_events():
    print("Connecting to MongoDB...")
    await connect_to_mongo()
    
    print("Clearing existing events...")
    await Event.find_all().delete()
    
    events = [
        {
            "name": "Summer Monsoon Festival",
            "event_type": EventType.FESTIVAL,
            "start_date": datetime.utcnow(),
            "end_date": datetime.utcnow() + timedelta(days=7),
            "zones_affected": ["Central Market", "Downtown"],
            "risk_multiplier": 1.5,
            "description": "Annual summer festival with high footfall in central zones."
        },
        {
            "name": "Statutory Winter Break",
            "event_type": EventType.HOLIDAY,
            "start_date": datetime.utcnow() + timedelta(days=20),
            "end_date": datetime.utcnow() + timedelta(days=25),
            "zones_affected": [],  # Global
            "risk_multiplier": 1.2,
            "description": "General holiday period affecting overall urban activity levels."
        },
        {
            "name": "High Tourist Influx Cycle",
            "event_type": EventType.TOURIST_SEASON,
            "start_date": datetime.utcnow() - timedelta(days=5),
            "end_date": datetime.utcnow() + timedelta(days=15),
            "zones_affected": ["Harbor Area", "Old City"],
            "risk_multiplier": 1.8,
            "description": "Significant increase in tourist population in coastal and heritage regions."
        }
    ]
    
    print(f"Seeding {len(events)} events...")
    for event_data in events:
        event = Event(**event_data)
        await event.create()
        print(f"Created event: {event.name}")
    
    print("Closing connection...")
    await close_mongo_connection()
    print("Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_events())
