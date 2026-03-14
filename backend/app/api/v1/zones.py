from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from app.models.zone import Zone
from app.models.user import UserRole
from app.schemas.zone import ZoneCreate, ZoneUpdate
from app.api.v1.auth import get_current_user
from datetime import datetime

router = APIRouter()


def zone_to_dict(zone: Zone) -> dict:
    """Serialize a Zone Beanie document to a plain dict."""
    return {
        "id": str(zone.id),
        "name": zone.name,
        "city": zone.city,
        "region": zone.region,
        "ward_id": zone.ward_id,
        "population": zone.population,
        "area_sq_km": zone.area_sq_km,
        "risk_level_override": zone.risk_level_override,
        "description": zone.description,
        "created_at": zone.created_at,
        "updated_at": zone.updated_at,
    }


@router.get("")
async def get_zones(
    city: Optional[str] = None,
    region: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Fetch all configured zones with optional filtering"""
    zones = await Zone.find_all().to_list()
    if city:
        zones = [z for z in zones if z.city.lower() == city.lower()]
    if region:
        zones = [z for z in zones if z.region.lower() == region.lower()]
    return [zone_to_dict(z) for z in zones]


@router.post("", status_code=201)
async def create_zone(
    zone_in: ZoneCreate,
    current_user = Depends(get_current_user)
):
    """Create a new administrative zone"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only administrators can manage zones")

    existing = await Zone.find_one(Zone.name == zone_in.name, Zone.city == zone_in.city)
    if existing:
        raise HTTPException(status_code=400, detail="Zone with this name already exists in this city")

    zone = Zone(**zone_in.model_dump())
    await zone.insert()
    return zone_to_dict(zone)


@router.get("/{zone_id}")
async def get_zone(
    zone_id: str,
    current_user = Depends(get_current_user)
):
    """Get a specific zone by ID"""
    from beanie import PydanticObjectId
    zone = await Zone.get(PydanticObjectId(zone_id))
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone_to_dict(zone)


@router.put("/{zone_id}")
async def update_zone(
    zone_id: str,
    zone_in: ZoneUpdate,
    current_user = Depends(get_current_user)
):
    """Update an existing zone"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only administrators can manage zones")

    from beanie import PydanticObjectId
    zone = await Zone.get(PydanticObjectId(zone_id))
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    update_data = zone_in.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()

    await zone.set(update_data)
    # Refresh from db
    zone = await Zone.get(PydanticObjectId(zone_id))
    return zone_to_dict(zone)


@router.delete("/{zone_id}")
async def delete_zone(
    zone_id: str,
    current_user = Depends(get_current_user)
):
    """Remove a zone from the registry"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only administrators can manage zones")

    from beanie import PydanticObjectId
    zone = await Zone.get(PydanticObjectId(zone_id))
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    await zone.delete()
    return {"message": "Zone successfully removed"}
