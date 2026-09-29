const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*" } 
});

// Store live vehicle data in memory
const activeVehicles = {};

// Serve static frontend files from current folder
app.use(express.static(__dirname));

io.on('connection', (socket) => {
  console.log(`[+ Connected] Vehicle ID: ${socket.id}`);

  // Receive position & telemetry updates from client
  socket.on('update_location', (data) => {
    // data = { lat, lng, speed, isOverspeeding }
    activeVehicles[socket.id] = {
      id: socket.id,
      ...data,
      timestamp: Date.now()
    };

    // Broadcast updated positions to all connected clients
    io.emit('vehicles_stream', activeVehicles);
  });

  socket.on('disconnect', () => {
    console.log(`[- Disconnected] Vehicle ID: ${socket.id}`);
    delete activeVehicles[socket.id];
    io.emit('vehicles_stream', activeVehicles);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});