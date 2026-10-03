from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict, Any

from backend.core.database import get_db
from backend.models.all_models import (
    Incident, Resource, Responder, Hospital, Shelter, RiskZone
)
from backend.services.providers.geocoding_provider import GeocodingProvider
from backend.services.providers.routing_provider import RoutingProvider, haversine_distance_km
from backend.services.providers.weather_provider import WeatherProvider

router = APIRouter(prefix="/map", tags=["Geospatial Intelligence & Map Layers"])

@router.get("/layers")
async def get_map_layers(
    db: AsyncSession = Depends(get_db)
):
    """Aggregates all live map layers from application database state"""
    # 1. Incidents
    inc_res = await db.execute(select(Incident).where(Incident.is_active == True))
    incidents = inc_res.scalars().all()
    inc_data = [
        {
            "id": inc.id,
            "incident_number": inc.incident_number,
            "title": inc.title,
            "incident_type": inc.incident_type,
            "status": inc.status,
            "severity_class": inc.severity_class,
            "severity_score": inc.severity_score,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "address": inc.address,
            "radius_meters": inc.radius_meters,
            "verification_status": inc.verification_status,
            "is_demo": inc.is_demo
        } for inc in incidents
    ]

    # 2. Resources
    res_res = await db.execute(select(Resource).where(Resource.is_active == True))
    resources = res_res.scalars().all()
    res_data = [
        {
            "id": r.id,
            "resource_name": r.resource_name,
            "resource_type": r.resource_type,
            "status": r.status,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "station_name": r.station_name,
            "capacity": r.capacity
        } for r in resources
    ]

    # 3. Responders
    resp_res = await db.execute(select(Responder).where(Responder.status != "OFF_DUTY"))
    responders = resp_res.scalars().all()
    resp_data = [
        {
            "id": r.id,
            "responder_name": r.responder_name,
            "specialization": r.specialization,
            "status": r.status,
            "latitude": r.latitude,
            "longitude": r.longitude
        } for r in responders if r.latitude is not None and r.longitude is not None
    ]

    # 4. Hospitals
    hosp_res = await db.execute(select(Hospital).where(Hospital.is_active == True))
    hospitals = hosp_res.scalars().all()
    hosp_data = [
        {
            "id": h.id,
            "name": h.name,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "total_beds": h.total_beds,
            "available_beds": h.available_beds,
            "trauma_center_level": h.trauma_center_level,
            "phone": h.phone
        } for h in hospitals
    ]

    # 5. Shelters
    shelter_res = await db.execute(select(Shelter).where(Shelter.is_active == True))
    shelters = shelter_res.scalars().all()
    shelter_data = [
        {
            "id": s.id,
            "name": s.name,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "capacity": s.capacity,
            "current_occupancy": s.current_occupancy,
            "phone": s.phone
        } for s in shelters
    ]

    # 6. Risk Zones
    rz_res = await db.execute(select(RiskZone).where(RiskZone.active == True))
    risk_zones = rz_res.scalars().all()
    rz_data = [
        {
            "id": rz.id,
            "zone_name": rz.zone_name,
            "hazard_type": rz.hazard_type,
            "risk_level": rz.risk_level,
            "coordinates_geojson": rz.coordinates_geojson,
            "population_estimate": rz.population_estimate,
            "description": rz.description
        } for rz in risk_zones
    ]

    # Center coords baseline
    default_lat = incidents[0].latitude if incidents else 13.0827
    default_lng = incidents[0].longitude if incidents else 80.2707

    return {
        "center": {"latitude": default_lat, "longitude": default_lng},
        "incidents": inc_data,
        "resources": res_data,
        "responders": resp_data,
        "hospitals": hosp_data,
        "shelters": shelter_data,
        "risk_zones": rz_data
    }

@router.get("/weather")
async def get_live_weather(lat: float, lng: float):
    weather = await WeatherProvider.get_current_weather(lat, lng)
    return weather

@router.get("/reverse-geocode")
async def reverse_geocode(lat: float, lng: float):
    return await GeocodingProvider.reverse_geocode(lat, lng)

@router.get("/forward-geocode")
async def forward_geocode(query: str):
    res = await GeocodingProvider.forward_geocode(query)
    if not res:
        raise HTTPException(status_code=404, detail="Location query not found")
    return res

@router.get("/route")
async def calculate_route(start_lat: float, start_lng: float, end_lat: float, end_lng: float):
    """Section 21: Agnostic routing computation with distance, ETA, and geometry"""
    return await RoutingProvider.get_route(start_lat, start_lng, end_lat, end_lng)
