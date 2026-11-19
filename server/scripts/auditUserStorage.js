require("dotenv").config();
const mongoose = require("mongoose");

async function auditStorage() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const db = mongoose.connection.db;

    const collections = [
      "tasks",
      "userprogresses",
      "lifetimeachievements",
      "lifetimetaskcompletions",
      "gameattempts",
      "pushsubscriptions"
    ];

    const users = await db.collection("users")
      .find({}, { projection: { _id: 1, email: 1 } })
      .toArray();

    console.log("\nQUESTIFY USER STORAGE AUDIT");

    for (const user of users) {
      console.log("\nUSER:", user._id.toString());

      for (const name of collections) {
        const count = await db.collection(name)
          .countDocuments({ userId: user._id });

        console.log(`${name}: ${count}`);
      }
    }

    console.log("\nAUDIT COMPLETED - READ ONLY");

  } catch (error) {
    console.error("Audit failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

auditStorage();