import json
import logging
from typing import List, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("resqintel.websocket")

class ConnectionManager:
    """Manages active WebSocket connections for live real-time emergency telemetry"""

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, List[WebSocket]] = {}
        self.role_connections: Dict[str, List[WebSocket]] = {
            "ADMIN": [],
            "DISPATCHER": [],
            "RESPONDER": [],
            "CITIZEN": []
        }

    async def connect(self, websocket: WebSocket, user_id: str = None, role: str = "CITIZEN"):
        await websocket.accept()
        self.active_connections.append(websocket)
        
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)
            
        if role in self.role_connections:
            self.role_connections[role].append(websocket)
            
        logger.info(f"WebSocket connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, user_id: str = None, role: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
                
        if role and role in self.role_connections:
            if websocket in self.role_connections[role]:
                self.role_connections[role].remove(websocket)
                
        logger.info(f"WebSocket disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast event to all connected dashboards and devices"""
        data_text = json.dumps(message)
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(data_text)
            except Exception:
                dead_connections.append(connection)
                
        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)

    async def broadcast_to_role(self, role: str, message: Dict[str, Any]):
        """Targeted broadcast to specific operational roles (e.g. DISPATCHERS)"""
        data_text = json.dumps(message)
        connections = self.role_connections.get(role, [])
        dead_connections = []
        for connection in connections:
            try:
                await connection.send_text(data_text)
            except Exception:
                dead_connections.append(connection)
                
        for dead in dead_connections:
            if dead in connections:
                connections.remove(dead)

ws_manager = ConnectionManager()
