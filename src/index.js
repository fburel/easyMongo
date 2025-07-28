"use strict";

const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require('uuid');
const ObjectId = require('./ObjectId');

const CollectionDriver = require("./CollectionDriver").CollectionDriver;

let registred = {};
const clients = {};

function connectToDatabase(uri) {
  if (clients[uri]) {
    return Promise.resolve(clients[uri]);
  }

  const client = new MongoClient(uri, {});

  client.uuid = uuidv4();

  return client.connect().then(() => {
    clients[uri] = client;
    return client;
  });
}

exports.Register = function(name, collection){
  registred[name] = collection;
}

exports.Connect = async function onConnection(task, keepAlive = true) {

  try {
    const URI = process.env.MONGO;

    if (URI.length < 1) {
      const err =
        "The connection uri to your mongo databse is not set. Make sure to provide the connection string in the 'MONGO' environment variable";
      console.log(err);
      throw err;
    }
  
    const client = await connectToDatabase(URI);
    const db = client.db();
    const driver = new CollectionDriver(db);
    let index = {};
    for(const cl in registred) {
      const Model = registred[cl];
      index[cl] = new Model(driver);
    }
  
    index.isConnected = function() {
      return driver.isConnected()
    }
  
    index.driver = driver;
  
    const res = await task(index);
  
    if (!keepAlive) await client.close();
  
    return res;
  }
  catch(e)
  {
    console.error(e);
    return task(null, e);
  }


};

exports.ObjectId = ObjectId;

exports.Model = require("./CollectionModel");
