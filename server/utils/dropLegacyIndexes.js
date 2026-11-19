const mongoose = require("mongoose");

/**
 * Questify used to store data per browser (`browserId`) and later moved to
 * per-account data (`userId`). The OLD unique indexes are still in MongoDB.
 * New documents have no browserId (stored as null), so the 2nd account that
 * inserts the same achievementKey / date / etc. gets E11000 duplicate key,
 * the request returns 500 and the UI shows "Unable to fetch ...".
 *
 * For every registered Mongoose model this compares the unique indexes that
 * really exist in MongoDB with the unique indexes the model declares, and
 * drops the unique ones the model does NOT declare (old leftovers).
 * Documents are never deleted. `_id_` and non-unique indexes are never touched.
 * Safe to run on every start (no-op once clean).
 */
const signature = key => JSON.stringify(key);

async function dropLegacyBrowserIdIndexes() {
  const dropped = [];

  for (const modelName of mongoose.modelNames()) {
    const model = mongoose.model(modelName);
    const collectionName = model.collection.name;

    const exists = await mongoose.connection.db
      .listCollections({ name: collectionName }, { nameOnly: true })
      .hasNext();

    if (!exists) continue;

    const expectedUnique = new Set(
      model.schema
        .indexes()
        .filter(([, options]) => options && options.unique)
        .map(([fields]) => signature(fields))
    );

    const liveIndexes = await model.collection.indexes();

    console.log(
      `[db-migrate] ${collectionName}: ` +
        liveIndexes.map(i => `${i.name}${i.unique ? " (unique)" : ""}`).join(", ")
    );

    for (const index of liveIndexes) {
      if (index.name === "_id_" || !index.unique) continue;
      if (expectedUnique.has(signature(index.key))) continue;

      try {
        await model.collection.dropIndex(index.name);
        dropped.push(`${collectionName}.${index.name}`);
        console.log(
          `[db-migrate] Dropped legacy unique index ${collectionName}.${index.name}`
        );
      } catch (error) {
        console.error(
          `[db-migrate] Could not drop ${collectionName}.${index.name}:`,
          error.message
        );
      }
    }
  }

  if (dropped.length === 0) {
    console.log("[db-migrate] No legacy unique indexes found.");
  }

  return dropped;
}

/** Make sure the current (userId-based) indexes exist. */
async function ensureCurrentIndexes() {
  for (const modelName of mongoose.modelNames()) {
    try {
      await mongoose.model(modelName).createIndexes();
    } catch (error) {
      console.error(
        `[db-migrate] createIndexes failed for ${modelName}:`,
        error.message
      );
    }
  }
}

module.exports = { dropLegacyBrowserIdIndexes, ensureCurrentIndexes };
