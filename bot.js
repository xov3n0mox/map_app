const { io } = require("socket.io-client");

const SERVER_URL = "http://localhost:3000";

// Define two simulated vehicles starting ALMOST AT THE SAME LOCATION (~35 meters apart)
const botVehicles = [
  {
    name: "Bot Alpha (Heading East)",
    lat: 28.61390,
    lng: 77.20900,
    speed: 35, // Normal speed (km/h)
    latDelta: 0.000005,
    lngDelta: 0.00001
  },
  {
    name: "Bot Beta (Heading West - Overspeeding)",
    lat: 28.61390,
    lng: 77.20935, // Starts ~34 meters away from Alpha!
    speed: 48, // Overspeeding (>40 km/h)
    latDelta: -0.000005,
    lngDelta: -0.00001
  }
];

console.log("🚀 Starting Instant Hazard Bot Simulator...\n");

botVehicles.forEach((bot) => {
  const socket = io(SERVER_URL, {
    transports: ["websocket", "polling"]
  });

  socket.on("connect", () => {
    console.log(`[+] ${bot.name} connected with Socket ID: ${socket.id}`);

    setInterval(() => {
      bot.lat += bot.latDelta;
      bot.lng += bot.lngDelta;

      const isOverspeeding = bot.speed > 40;

      socket.emit("update_location", {
        lat: bot.lat,
        lng: bot.lng,
        speed: bot.speed,
        isOverspeeding: isOverspeeding
      });

      console.log(`📍 [${bot.name}] Lat: ${bot.lat.toFixed(5)}, Lng: ${bot.lng.toFixed(5)} | Speed: ${bot.speed} km/h`);
    }, 1000);
  });

  socket.on("disconnect", () => {
    console.log(`[-] ${bot.name} disconnected`);
  });
});