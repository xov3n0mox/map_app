const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*" } 
});

const activeVehicles = {};
const PROXIMITY_THRESHOLD_METERS = 50;

app.use(express.static(__dirname));

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
            
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function checkVehicleHazards() {
  const ids = Object.keys(activeVehicles);
  
  // Reset flags
  ids.forEach(id => {
    activeVehicles[id].isProximityHazard = false;
    activeVehicles[id].nearestVehicleDist = null;
  });

  // Compare every unique pair
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const v1 = activeVehicles[ids[i]];
      const v2 = activeVehicles[ids[j]];

      if (v1.lat && v1.lng && v2.lat && v2.lng) {
        const distance = getDistanceInMeters(v1.lat, v1.lng, v2.lat, v2.lng);
        
        console.log(`[DEBUG DISTANCE] ${ids[i].slice(0,4)} <--> ${ids[j].slice(0,4)} = ${distance.toFixed(2)} meters`);

        if (distance <= PROXIMITY_THRESHOLD_METERS) {
          console.log(`🔥 [HAZARD TRIGGERED] Distance ${distance.toFixed(1)}m <= ${PROXIMITY_THRESHOLD_METERS}m`);
          v1.isProximityHazard = true;
          v2.isProximityHazard = true;
          v1.nearestVehicleDist = Math.round(distance);
          v2.nearestVehicleDist = Math.round(distance);
        }
      }
    }
  }
}

io.on('connection', (socket) => {
  console.log(`[+ Connected] Vehicle ID: ${socket.id}`);

  socket.on('update_location', (data) => {
    activeVehicles[socket.id] = {
      id: socket.id,
      ...data,
      timestamp: Date.now()
    };

    console.log(`[GPS TELEMETRY] ${socket.id.slice(0,4)} -> Lat: ${data.lat}, Lng: ${data.lng}, Speed: ${data.speed}`);

    checkVehicleHazards();

    // Stream state to all clients
    io.emit('vehicles_stream', activeVehicles);
  });

  socket.on('disconnect', () => {
    console.log(`[- Disconnected] Vehicle ID: ${socket.id}`);
    delete activeVehicles[socket.id];
    checkVehicleHazards();
    io.emit('vehicles_stream', activeVehicles);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});