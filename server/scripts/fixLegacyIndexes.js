const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const fs = require("fs");

// Load every model so all indexes are known.
fs.readdirSync(path.resolve(__dirname, "../models"))
  .filter(file => file.endsWith(".js"))
  .forEach(file => require(path.resolve(__dirname, "../models", file)));

const {
  dropLegacyBrowserIdIndexes
} = require("../utils/dropLegacyIndexes");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await dropLegacyBrowserIdIndexes();
    console.log("Done.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
