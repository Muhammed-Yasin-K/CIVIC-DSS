import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import os
import sys
from pathlib import Path

# Add the parent directory to sys.path to resolve 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load .env from backend root
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from app.models.user import User

async def update_officers():
    # MongoDB connection URL — loaded from .env (never hardcode credentials)
    MONGODB_URL = os.getenv("MONGODB_URL")
    DATABASE_NAME = os.getenv("DATABASE_NAME", "civic_risk_db")

    if not MONGODB_URL:
        print("ERROR: MONGODB_URL not set. Please configure your .env file.")
        return

    client = AsyncIOMotorClient(MONGODB_URL)
    database = client[DATABASE_NAME]

    # Initialize Beanie
    await init_beanie(database=database, document_models=[User])

    officer_updates = [
        {"name": "Rajesh Kumar", "email": "rajeshkumarcivicgov@gmail.com"},
        {"name": "Arjun Nair", "email": "arjunnaircivicgov@gmail.com"},
        {"name": "Karthik S", "email": "karthikscivicgov@gmail.com"},
        {"name": "Vikram Shah", "email": "vikramshahcivicgov@gmail.com"},
        {"name": "Ananya Bose", "email": "ananyabosecivicgov@gmail.com"},
    ]

    for data in officer_updates:
        # Assuming the initial seed script matches the names roughly, let's find them
        # or we might need to find by assigned zone.
        # From the previous conversation, we mapped them by zone. Let's try to find by region/jurisdiction or name.
        
        # Searching by name first (case-insensitive)
        officer = await User.find_one({"full_name": {"$regex": data["name"], "$options": "i"}})
        
        if officer:
            print(f"Updating {officer.full_name} -> {data['email']}")
            officer.email = data["email"]
            await officer.save()
        else:
            print(f"Warning: Officer {data['name']} not found. Trying flexible match...")
            # Fallback a looser search
            first_name = data["name"].split()[0]
            officer = await User.find_one({"full_name": {"$regex": first_name, "$options": "i"}})
            if officer:
                print(f"Fallback match: Updating {officer.full_name} -> {data['email']}")
                officer.email = data["email"]
                await officer.save()
            else:
                 print(f"Error: Could not find any officer matching {data['name']}")

    print("Finished updating officer emails.")

if __name__ == "__main__":
    asyncio.run(update_officers())
