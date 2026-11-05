"use strict";

const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require('uuid');
const ObjectId = require('./ObjectId');

const CollectionDriver = require("./CollectionDriver").CollectionDriver;

// One connection promise per URI. Caching the promise (not the client) prevents
// concurrent calls to Connect() from opening several clients.
const clients = new Map();

// client -> Map(collectionName -> Promise) of index creations already done (or in progress)
const ensuredIndexes = new WeakMap();

let registred = {};
let config = {};

function connectToDatabase(uri, clientOptions) {
  if (!clients.has(uri)) {
    const client = new MongoClient(uri, clientOptions || {});
    client.uuid = uuidv4();

    const promise = client.connect()
      .then(() => client)
      .catch((e) => {
        clients.delete(uri);
        throw e;
      });

    clients.set(uri, promise);
  }
  return clients.get(uri);
}

async function closeConnection(uri, client) {
  clients.delete(uri);
  await client.close();
}

// Create the indexes declared on the registered models, once per client and collection.
function ensureIndexes(client, db) {
  if (!ensuredIndexes.has(client)) ensuredIndexes.set(client, new Map());
  const done = ensuredIndexes.get(client);

  const tasks = [];
  for (const name in registred) {
    const model = registred[name];
    const table = model.collectionName;
    const indexes = model.indexes;
    if (!table || !Array.isArray(indexes) || indexes.length === 0) continue;

    if (!done.has(table)) {
      const promise = db.collection(table).createIndexes(indexes)
        .catch((e) => {
          done.delete(table); // retry on next Connect
          throw e;
        });
      done.set(table, promise);
    }
    tasks.push(done.get(table));
  }
  return Promise.all(tasks);
}

/**
 * Set the connection settings. Replaces any previous configuration.
 * @param {{ uri?: string, dbName?: string, clientOptions?: object }} options
 *  - uri: connection string. Defaults to process.env.MONGO
 *  - dbName: database to use. Defaults to the one in the connection string
 *  - clientOptions: options passed to the MongoClient (pool size, timeouts...).
 *    They are applied when a new connection is opened.
 */
exports.Configure = function(options = {}) {
  config = { ...options };
};

exports.Register = function(name, collection){
  registred[name] = collection;
}

exports.Connect = async function onConnection(task, keepAlive = true) {

  const URI = config.uri || process.env.MONGO;
  let client, db;

  // Only connection errors are reported to the task through its second argument.
  // Errors thrown by the task itself are propagated to the caller as-is.
  try {
    if (!URI) {
      throw new Error("The connection uri to your mongo databse is not set. Make sure to provide the connection string in the 'MONGO' environment variable or with Configure({ uri })");
    }
    client = await connectToDatabase(URI, config.clientOptions);
    db = client.db(config.dbName);
    await ensureIndexes(client, db);
  }
  catch(e)
  {
    return task(null, e);
  }

  const driver = new CollectionDriver(db);
  let index = {};
  for(const cl in registred) {
    const f = registred[cl];
    index[cl] = new f(driver);
  }

  index.isConnected = function() {
    return driver.isConnected()
  }

  index.driver = driver;

  try {
    return await task(index);
  }
  finally {
    if (!keepAlive) await closeConnection(URI, client);
  }
};

/**
 * Close every open connection. Call it on shutdown (SIGTERM) or at the end of your tests.
 */
exports.Disconnect = async function() {
  const pending = [...clients.values()];
  clients.clear();
  const results = await Promise.allSettled(pending);
  await Promise.all(
    results
      .filter(r => r.status === "fulfilled")
      .map(r => r.value.close())
  );
};

exports.ObjectId = ObjectId;

exports.Model = require("./CollectionModel");
