import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Incident, Resource, Responder, Hospital, Shelter, RiskZone } from '../../types';

// Custom CSS-based SVG icons to avoid missing png assets
const createCustomIcon = (bgColor: string, symbol: string) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background-color: ${bgColor};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 13px;
    ">${symbol}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const incidentIcon = (sev: string) => {
  const color = sev === 'CRITICAL' ? '#ef4444' : sev === 'HIGH' ? '#f97316' : sev === 'MEDIUM' ? '#eab308' : '#3b82f6';
  return createCustomIcon(color, '⚠️');
};

const resourceIcon = (type: string) => {
  if (type.includes('BOAT')) return createCustomIcon('#0284c7', '🚤');
  if (type.includes('FIRE')) return createCustomIcon('#dc2626', '🚒');
  if (type.includes('AMBULANCE')) return createCustomIcon('#e11d48', '🚑');
  if (type.includes('POLICE')) return createCustomIcon('#2563eb', '🚓');
  return createCustomIcon('#64748b', '📦');
};

const responderIcon = createCustomIcon('#06b6d4', '👤');
const hospitalIcon = createCustomIcon('#10b981', '🏥');
const shelterIcon = createCustomIcon('#8b5cf6', '⛺');
const pinIcon = createCustomIcon('#ec4899', '📍');

interface Props {
  center?: [number, number];
  zoom?: number;
  incidents?: Incident[];
  resources?: Resource[];
  responders?: Responder[];
  hospitals?: Hospital[];
  shelters?: Shelter[];
  riskZones?: RiskZone[];
  routePolyline?: Array<[number, number]>;
  selectableLocation?: boolean;
  selectedLocation?: [number, number] | null;
  onSelectLocation?: (lat: number, lng: number) => void;
  height?: string;
  onIncidentClick?: (incident: Incident) => void;
}

function LocationPicker({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export const EmergencyMap: React.FC<Props> = ({
  center = [13.0827, 80.2707],
  zoom = 13,
  incidents = [],
  resources = [],
  responders = [],
  hospitals = [],
  shelters = [],
  riskZones = [],
  routePolyline,
  selectableLocation = false,
  selectedLocation,
  onSelectLocation,
  height = '500px',
  onIncidentClick,
}) => {
  // Support CARTO API key if configured; otherwise use standard open OpenStreetMap tiles
  // (Standard OpenStreetMap requires no API key and does NOT display any "API key required" watermark)
  const env = (import.meta as any).env || {};
  const cartoApiKey = env.VITE_CARTO_API_KEY || env.VITE_MAP_API_KEY || '';

  const tileUrl = cartoApiKey
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoApiKey}`
    : (env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

  const tileAttribution = cartoApiKey
    ? '&copy; <a href="https://carto.com/">CartoDB</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    : (env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors');

  return (
    <div style={{ height, width: '100%' }} className="relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', backgroundColor: '#090d16' }}
      >
        <TileLayer
          attribution={tileAttribution}
          url={tileUrl}
          maxZoom={19}
        />

        {selectableLocation && onSelectLocation && (
          <LocationPicker onSelect={onSelectLocation} />
        )}

        {/* Selected Pin for Reporting */}
        {selectedLocation && (
          <Marker position={selectedLocation} icon={pinIcon}>
            <Popup>
              <div className="text-xs p-1">
                <strong>Selected Incident Location</strong>
                <div>Lat: {selectedLocation[0].toFixed(5)}, Lng: {selectedLocation[1].toFixed(5)}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Incidents Markers & Radius circles */}
        {incidents.map((inc) => (
          <React.Fragment key={inc.id}>
            <Marker
              position={[inc.latitude, inc.longitude]}
              icon={incidentIcon(inc.severity_class)}
              eventHandlers={{
                click: () => onIncidentClick && onIncidentClick(inc),
              }}
            >
              <Popup>
                <div className="p-1 min-w-[200px] text-slate-900">
                  <div className="flex items-center justify-between font-bold text-xs mb-1">
                    <span className="text-red-600">#{inc.incident_number}</span>
                    <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-mono">
                      {inc.severity_class} ({inc.severity_score}/10)
                    </span>
                  </div>
                  <div className="font-semibold text-sm leading-snug">{inc.title}</div>
                  <div className="text-xs text-slate-600 mt-1 line-clamp-2">{inc.description}</div>
                  <div className="mt-2 text-[11px] font-mono text-slate-500">
                    Status: <strong>{inc.status}</strong>
                  </div>
                  {inc.injuries_count ? (
                    <div className="text-[11px] text-red-600 font-bold">
                      {inc.injuries_count} Injuries Reported
                    </div>
                  ) : null}
                </div>
              </Popup>
            </Marker>
            {inc.radius_meters && (
              <Circle
                center={[inc.latitude, inc.longitude]}
                radius={inc.radius_meters}
                pathOptions={{
                  color: inc.severity_class === 'CRITICAL' ? '#ef4444' : '#f97316',
                  fillColor: inc.severity_class === 'CRITICAL' ? '#ef4444' : '#f97316',
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: '4, 4',
                }}
              />
            )}
          </React.Fragment>
        ))}

        {/* Resources Markers */}
        {resources.map((res) => (
          <Marker
            key={res.id}
            position={[res.latitude, res.longitude]}
            icon={resourceIcon(res.resource_type)}
          >
            <Popup>
              <div className="p-1 text-slate-900 min-w-[180px]">
                <div className="font-bold text-xs text-blue-700">{res.resource_name}</div>
                <div className="text-xs text-slate-600 font-mono">Type: {res.resource_type}</div>
                <div className="text-xs mt-1">Status: <span className="font-bold text-emerald-700">{res.status}</span></div>
                {res.station_name && <div className="text-[11px] text-slate-500">Base: {res.station_name}</div>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Responders Markers */}
        {responders.map((resp) => (
          resp.latitude && resp.longitude ? (
            <Marker
              key={resp.id}
              position={[resp.latitude, resp.longitude]}
              icon={responderIcon}
            >
              <Popup>
                <div className="p-1 text-slate-900">
                  <div className="font-bold text-xs text-cyan-800">{resp.responder_name}</div>
                  <div className="text-xs text-slate-600">Badge: {resp.badge_number}</div>
                  <div className="text-xs text-slate-500">{resp.specialization}</div>
                  <div className="text-[11px] font-bold text-emerald-700 mt-1">{resp.status}</div>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}

        {/* Hospitals Markers */}
        {hospitals.map((hosp) => (
          <Marker
            key={hosp.id}
            position={[hosp.latitude, hosp.longitude]}
            icon={hospitalIcon}
          >
            <Popup>
              <div className="p-1 text-slate-900">
                <div className="font-bold text-xs text-emerald-800">{hosp.name}</div>
                <div className="text-xs text-slate-600">{hosp.trauma_center_level}</div>
                <div className="text-xs font-semibold mt-1">
                  Beds: {hosp.available_beds} available / {hosp.total_beds} total
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Shelters Markers */}
        {shelters.map((shelter) => (
          <Marker
            key={shelter.id}
            position={[shelter.latitude, shelter.longitude]}
            icon={shelterIcon}
          >
            <Popup>
              <div className="p-1 text-slate-900">
                <div className="font-bold text-xs text-purple-800">{shelter.name}</div>
                <div className="text-xs">Capacity: {shelter.capacity} evacuees</div>
                <div className="text-xs text-slate-600">Occupancy: {shelter.current_occupancy}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Risk Zones Polygons */}
        {riskZones.map((rz) => {
          if (rz.coordinates_geojson && rz.coordinates_geojson.coordinates) {
            const polygonCoords = rz.coordinates_geojson.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
            return (
              <Polygon
                key={rz.id}
                positions={polygonCoords}
                pathOptions={{
                  color: '#dc2626',
                  fillColor: '#ef4444',
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="p-1 text-slate-900">
                    <div className="font-bold text-xs text-red-700">{rz.zone_name}</div>
                    <div className="text-xs font-mono">Risk Level: {rz.risk_level} ({rz.hazard_type})</div>
                    <div className="text-xs text-slate-600 mt-1">{rz.description}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Exposed Population: ~{rz.population_estimate}</div>
                  </div>
                </Popup>
              </Polygon>
            );
          }
          return null;
        })}

        {/* Live Route Polyline */}
        {routePolyline && routePolyline.length > 0 && (
          <Polyline
            positions={routePolyline}
            pathOptions={{
              color: '#3b82f6',
              weight: 5,
              opacity: 0.85,
              dashArray: '8, 8',
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};
