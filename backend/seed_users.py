import asyncio
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

async def seed_database():
    MONGODB_URL = os.getenv("MONGODB_URL")
    DATABASE_NAME = os.getenv("DATABASE_NAME", "civic_risk_db")
    
    print(f"🔌 Connected to MongoDB: {DATABASE_NAME}")
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    users_collection = db.users

    # Exact 27 unique cities found in dbscan_hotspot_clusters.csv
    # 1. Ahmedabad, 2. Alappuzha, 3. Bengaluru, 4. Chennai, 5. Delhi, 6. Ernakulam, 7. Hyderabad, 8. Idukki, 9. Indore, 10. Jaipur, 11. Kannur, 12. Kasaragod, 13. Kochi, 14. Kolkata, 15. Kollam, 16. Kozhikode, 17. Malappuram, 18. Mumbai, 19. Palakkad, 20. Panaji, 21. Pathanamthitta, 22. Prayagraj, 23. Pune, 24. Shimla, 25. Thiruvananthapuram, 26. Thrissur, 27. Wayanad.

    # Load default passwords from environment or use fallback
    ADMIN_PWD = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
    OFFICER_PWD = os.getenv("DEFAULT_OFFICER_PASSWORD", "officer123")

    test_users = [
        {
            "email": "admin@civic.gov",
            "username": "admin",
            "password": ADMIN_PWD,
            "full_name": "System Administrator",
            "role": "admin",
            "assigned_zones": [],
            "jurisdiction": "All India"
        },
        
        # Regional Officers matching User's Screenshot Exactly
        {
            "email": "off_north@civicrisk.gov",
            "username": "off_north",
            "password": OFFICER_PWD,
            "full_name": "Rajesh Kumar",
            "role": "officer",
            "assigned_zones": ["Delhi", "Shimla", "Jaipur", "Prayagraj"],
            "jurisdiction": "North"
        },
        {
            "email": "off_south_west@civicrisk.gov",
            "username": "off_south_west",
            "password": OFFICER_PWD,
            "full_name": "Arjun Nair",
            "role": "officer",
            "assigned_zones": [
                "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod",
                "Kochi", "Kollam", "Kottayam", "Kozhikode", "Malappuram",
                "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"
            ],
            "jurisdiction": "South-West"
        },
        {
            "email": "off_south_east@civicrisk.gov",
            "username": "off_south_east",
            "password": OFFICER_PWD,
            "full_name": "Karthik S.",
            "role": "officer",
            "assigned_zones": ["Bengaluru", "Chennai", "Hyderabad"],
            "jurisdiction": "South-East"
        },
        {
            "email": "off_west@civicrisk.gov",
            "username": "off_west",
            "password": OFFICER_PWD,
            "full_name": "Vikram Shah",
            "role": "officer",
            "assigned_zones": ["Ahmedabad", "Indore", "Mumbai", "Panaji", "Pune"],
            "jurisdiction": "West"
        },
        {
            "email": "off_east@civicrisk.gov",
            "username": "off_east",
            "password": OFFICER_PWD,
            "full_name": "Ananya Bose",
            "role": "officer",
            "assigned_zones": ["Kolkata"],
            "jurisdiction": "East"
        }
    ]

    # 🚨 CLEAR SYSTEM USERS ONLY (Preserve UI-created 'is_custom' users)
    print("🗑️ Clearing system users to prevent duplicates...")
    await users_collection.delete_many({"is_custom": {"$ne": True}})
    
    created_count = 0
    for user_data in test_users:
        user_doc = {
            "email": user_data["email"],
            "username": user_data["username"],
            "hashed_password": get_password_hash(user_data["password"]),
            "full_name": user_data["full_name"],
            "role": user_data["role"],
            "assigned_zones": user_data["assigned_zones"],
            "jurisdiction": user_data["jurisdiction"],
            "is_active": True,
            "is_verified": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await users_collection.insert_one(user_doc)
        created_count += 1
    
    print(f"✅ Created {created_count} unique users (1 Admin, 5 Officers).")

if __name__ == "__main__":
    asyncio.run(seed_database())
