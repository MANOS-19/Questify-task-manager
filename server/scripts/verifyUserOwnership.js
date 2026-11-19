require("dotenv").config();
const mongoose = require("mongoose");

async function verifyUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const db = mongoose.connection.db;

    const userIds = [
      "6afc1c1fb653bf7a3859aeed",
      "6afc1bd9b653bf7a3859aeec",
      "6afc116ff6c2eab33a7f415d"
    ];

    console.log("\nREGISTERED USER VERIFICATION\n");

    for (const id of userIds) {
      const user = await db.collection("users").findOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { projection: { _id: 1, createdAt: 1 } }
      );

      console.log({
        searchedUserId: id,
        exists: Boolean(user),
        databaseUserId: user?._id?.toString() || null,
        createdAt: user?.createdAt || null
      });
    }

  } catch (error) {
    console.error("Verification failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

verifyUsers();