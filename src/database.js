import { MongoClient } from 'mongodb';

export async function connectDatabase(config) {
  const options = { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 };
  const reader = new MongoClient(config.readUri, options);
  const writer = new MongoClient(config.writeUri, options);
  try {
    await Promise.all([reader.connect(), writer.connect()]);
  } catch (error) {
    await Promise.allSettled([reader.close(), writer.close()]);
    throw error;
  }
  const readBooks = reader.db(config.dbName).collection('books');
  const writeBooks = writer.db(config.dbName).collection('books');
  return {
    list: () => readBooks.find({}).sort({ createdAt: -1 }).limit(100).toArray(),
    insert: book => writeBooks.insertOne(book),
    ping: () => Promise.all([reader.db(config.dbName).command({ ping: 1 }), writer.db(config.dbName).command({ ping: 1 })]),
    close: () => Promise.all([reader.close(), writer.close()])
  };
}
