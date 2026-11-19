const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
});

const MONGO_URI = process.env.MONGO_URI;

// Account-owned collections
const ACCOUNT_COLLECTIONS = [
  "tasks",
  "pushsubscriptions",
  "userprogresses",
  "lifetimetaskcompletions",
  "lifetimeachievements",
  "gameattempts"
];

// Globally shared collections
const SHARED_COLLECTIONS = [
  "dailychallenges",
  "puzzles"
];

async function getCollectionAudit(db, collectionName) {
  const collection = db.collection(collectionName);

  const totalDocuments = await collection.countDocuments();

  const legacyBrowserIdDocuments =
    await collection.countDocuments({
      browserId: { $exists: true }
    });

  const legacyPlayerIdDocuments =
    await collection.countDocuments({
      playerId: { $exists: true }
    });

  const missingUserIdDocuments =
    await collection.countDocuments({
      userId: { $exists: false }
    });

  const nullUserIdDocuments =
    await collection.countDocuments({
      userId: { $type: 10 }
    });

  const nonObjectIdUserIdDocuments =
    await collection.countDocuments({
      userId: {
        $exists: true,
        $nin: [null],
        $not: { $type: "objectId" }
      }
    });

  // Find references to users that do not exist.
  const orphanResult = await collection.aggregate([
    {
      $match: {
        userId: {
          $exists: true,
          $ne: null
        }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "matchedUser"
      }
    },
    {
      $match: {
        matchedUser: { $size: 0 }
      }
    },
    {
      $count: "count"
    }
  ]).toArray();

  const orphanUserIdDocuments =
    orphanResult.length > 0 ? orphanResult[0].count : 0;

  const indexes = await collection.indexes();

  return {
    collection: collectionName,
    totalDocuments,
    legacyBrowserIdDocuments,
    legacyPlayerIdDocuments,
    missingUserIdDocuments,
    nullUserIdDocuments,
    nonObjectIdUserIdDocuments,
    orphanUserIdDocuments,
    indexes: indexes.map(index => ({
      name: index.name,
      keys: index.key,
      unique: index.unique || false,
      sparse: index.sparse || false,
      expireAfterSeconds: index.expireAfterSeconds ?? null
    }))
  };
}


async function runMongoOwnershipAudit() {
  try {
    if (!MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing from the server/.env file."
      );
    }

    console.log("\n==================================");
    console.log(" QUESTIFY MONGODB OWNERSHIP AUDIT ");
    console.log("==================================\n");

    await mongoose.connect(MONGO_URI);

    console.log("MongoDB connection successful.\n");

    const db = mongoose.connection.db;

    const existingCollections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();

    const existingNames = new Set(
      existingCollections.map(item => item.name)
    );

    console.log("DATABASE COLLECTIONS");
    console.log("--------------------");

    console.log(
      [...existingNames].sort().join("\n") || "No collections found."
    );

    const results = [];

    console.log("\nACCOUNT OWNERSHIP AUDIT");
    console.log("----------------------");

    for (const name of ACCOUNT_COLLECTIONS) {
      if (!existingNames.has(name)) {
        results.push({
          collection: name,
          status: "COLLECTION NOT FOUND"
        });

        continue;
      }

      const result = await getCollectionAudit(db, name);

      results.push(result);
    }

    console.log("\nSHARED COLLECTION AUDIT");
    console.log("-----------------------");

    const sharedResults = [];

    for (const name of SHARED_COLLECTIONS) {
      if (!existingNames.has(name)) {
        sharedResults.push({
          collection: name,
          status: "COLLECTION NOT FOUND"
        });

        continue;
      }

      const collection = db.collection(name);

      sharedResults.push({
        collection: name,
        totalDocuments: await collection.countDocuments(),
        legacyBrowserIdDocuments:
          await collection.countDocuments({
            browserId: { $exists: true }
          }),
        legacyPlayerIdDocuments:
          await collection.countDocuments({
            playerId: { $exists: true }
          }),
        indexes: (await collection.indexes()).map(index => ({
          name: index.name,
          keys: index.key,
          unique: index.unique || false
        }))
      });
    }

    console.log("\nAUDIT RESULTS");
    console.log("==============");

    console.log(
      JSON.stringify(
        {
          database: db.databaseName,
          accountCollections: results,
          sharedCollections: sharedResults
        },
        null,
        2
      )
    );

    console.log("\n==================================");
    console.log(" AUDIT COMPLETED - READ ONLY ");
    console.log("==================================\n");

  } catch (error) {
    console.error("\nMONGODB AUDIT FAILED:");
    console.error(error.message);

  } finally {
    await mongoose.disconnect();
  }
}

runMongoOwnershipAudit();
