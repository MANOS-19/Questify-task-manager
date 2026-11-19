require("dotenv").config();
const mongoose = require("mongoose");

async function inspect() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const db = mongoose.connection.db;

    for (const name of [
      "lifetimeachievements",
      "gameattempts"
    ]) {
      console.log(`\n========== ${name} ==========`);

      const result = await db.collection(name).aggregate([
        {
          $group: {
            _id: {
              browserId: "$browserId",
              playerId: "$playerId",
              userId: "$userId"
            },
            totalRecords: { $sum: 1 },
            firstCreated: { $min: "$createdAt" },
            lastCreated: { $max: "$createdAt" }
          }
        },
        {
          $sort: {
            totalRecords: -1
          }
        }
      ]).toArray();

      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

inspect();