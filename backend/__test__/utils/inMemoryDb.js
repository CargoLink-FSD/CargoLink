import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export async function connectInMemoryDb() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
}

export async function clearInMemoryDb() {
  const { db } = mongoose.connection;
  if (!db) {
    return;
  }

  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

export async function disconnectInMemoryDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}
