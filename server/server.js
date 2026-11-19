
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const {
  dropLegacyBrowserIdIndexes
} = require("./utils/dropLegacyIndexes");


const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/api/auth", authRoutes);

// ==========================================
// ROUTES
// ==========================================

const gameRoutes = require("./routes/gameRoutes");
const taskRoutes = require("./routes/taskRoutes");
const pushRoutes = require("./routes/pushRoutes");
const {
  startReminderScheduler
} = require("./services/reminderScheduler");

app.use("/api/game", gameRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/push", pushRoutes);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
    res.send("Questify Backend is Running!");
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Questify API is running"
    });
});

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
    console.log(`[404] ${req.method} ${req.originalUrl}`);

    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// ==========================================
// ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
    console.error("Server Error:", err);

    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
});

// ==========================================
// DATABASE CONNECTION & SERVER START
// ==========================================

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("--------------------------------");
    console.log("MongoDB Connected Successfully!");
    console.log("--------------------------------");

    // Remove old browserId unique indexes that break multi-account data
    try {
      await dropLegacyBrowserIdIndexes();
    } catch (error) {
      console.error("[db-migrate] Index migration error:", error.message);
    }

    // Start automatic task reminder scheduler
    startReminderScheduler();

    app.listen(PORT, () => {
      console.log(`Questify Server running on port ${PORT}`);
      console.log("Game API: http://localhost:5000/api/game/daily");
      console.log("Tasks API: http://localhost:5000/api/tasks");
      console.log("Health: http://localhost:5000/api/health");
    });
  })
  .catch((error) => {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  });
