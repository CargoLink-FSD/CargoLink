import { MongoClient } from 'mongodb';

export default async function globalTeardown() {
  // adjust if your Mongo runs on a different host/port or has auth
  const mongoUri = process.env.MONGO_ADMIN_URI || 'mongodb://127.0.0.1:27017';
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();

    const prefix = 'testdb_'; // match whatever you used in setup
    const toDrop = databases
      .map(db => db.name)
      .filter(name => name.startsWith(prefix));

    for (const dbName of toDrop) {
      // dropDatabase returns a result object
      await client.db(dbName).dropDatabase();
      // optional logging:
      console.log(`Dropped test DB: ${dbName}`);
    }
  } catch (err) {
    // optional: log but don't fail teardown hard
    console.error('Error during globalTeardown cleanup:', err);
  } finally {
    await client.close();
  }
}