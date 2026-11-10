const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();



app.use(cors());
app.use(express.json());


const taskRoutes = require("./routes/taskRoutes");

app.use("/api/tasks", taskRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully!");

        app.listen(process.env.PORT || 5000, () => {
            console.log("Questify Server running on port 5000");
        });

app.get("/", (req, res) => {
    res.send("Questify Backend is Running!");
});

    })
    .catch((error) => {
        console.log("MongoDB Connection Error:", error.message);
    });

    app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Questify API is running"
  });
});