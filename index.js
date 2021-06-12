"use strict";

const { MongoClient } = require("mongodb");

const CollectionDriver = require("./CollectionDriver").CollectionDriver;

let cachedDb = null;
let registred = {};

function connectToDatabase(uri) {
  if (cachedDb) {
    return Promise.resolve(cachedDb);
  }

  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  return client.connect().then(() => {
    cachedDb = client;
    return client;
  });
}

exports.Register = function(name, collection){
  registred[name] = collection;
}

exports.Connect = async function onConnection(task, keepAlive = true) {
  const URI = process.env.MONGO;

  if (URI.length < 1) {
    const err =
      "The connection uri to your mongo databse is not set. Make sure to provide the connection string in the 'MONGO' environment variable";
    console.log(err);
    throw err;
  }
  const client = await connectToDatabase(URI);
  console.log("connected to Mongo");
  const driver = new CollectionDriver(client.db());
  let index = {};
  for(var cl in registred) {
    f = registred[cl];
    index[cl] = new f(driver);
  }
  await task(index);

  if (!keepAlive) await client.close();
};

exports.Model = require("./CollectionModel");
