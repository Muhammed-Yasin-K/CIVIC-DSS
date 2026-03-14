import asyncio
import os

# Fix for passlib/bcrypt 4.0.0+ incompatibility
try:
    import bcrypt
    if not hasattr(bcrypt, "__about__"):
        class About:
            __version__ = getattr(bcrypt, "__version__", "unknown")
        bcrypt.__about__ = About()
except ImportError:
    pass

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.user import User, UserRole
from app.core.config import settings
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

REGIONS = {
    "North": {
        "cities": ["Delhi", "Shimla", "Jaipur", "Prayagraj"],
        "real_name": "Rajesh Kumar",
        "username": "off_north"
    },
    "South-West": {
        "cities": [
            "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", 
            "Kochi", "Kollam", "Kottayam", "Kozhikode", "Malappuram", 
            "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"
        ],
        "real_name": "Arjun Nair",
        "username": "off_south_west"
    },
    "South-East": {
        "cities": ["Bengaluru", "Chennai", "Hyderabad"],
        "real_name": "Karthik S.",
        "username": "off_south_east"
    },
    "West": {
        "cities": ["Ahmedabad", "Indore", "Mumbai", "Panaji", "Pune"],
        "real_name": "Vikram Shah",
        "username": "off_west"
    },
    "East": {
        "cities": ["Kolkata"],
        "real_name": "Ananya Bose",
        "username": "off_east"
    }
}

async def main():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(database=client.civic_risk_db, document_models=[User])
    
    print("Deleting existing officers...")
    await User.find({"role": UserRole.OFFICER}).delete()
    
    password_hash = pwd_context.hash("officer123")
    
    for region, data in REGIONS.items():
        username = data["username"]
        cities = data["cities"]
        full_name = data["real_name"]
        email = f"{username}@civicrisk.gov"
        
        print(f"Creating officer: {username} ({full_name}) for {region} region...")
        new_officer = User(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=password_hash,
            role=UserRole.OFFICER,
            jurisdiction=region,
            assigned_zones=cities,
            is_active=True
        )
        await new_officer.insert()
        print(f"  - Assigned cities: {', '.join(cities)}")

    print("\nMigration complete! Created 5 regional officers.")
    print("Default password for all: officer123")

if __name__ == "__main__":
    asyncio.run(main())
