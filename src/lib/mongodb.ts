import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getClient(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    const promise = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
    }).connect();
    globalForMongo._mongoClientPromise = promise;
    promise.catch(() => {
      if (globalForMongo._mongoClientPromise === promise) {
        globalForMongo._mongoClientPromise = undefined;
      }
    });
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || "causalfunnel");
}
