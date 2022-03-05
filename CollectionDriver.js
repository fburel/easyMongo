var ObjectID = require("mongodb").ObjectID;

let CollectionDriver = function (db) {
  this.db = db;
};

CollectionDriver.prototype.isConnected = function () {
  return this.db.serverConfig.isConnected()
};

CollectionDriver.prototype.getCollectionAsync = function (collectionName) {
  const database = this.db;
  return Promise.resolve(database.collection(collectionName));
};

function isBSonId(id) {
  var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
  return checkForHexRegExp.test(id);
}

CollectionDriver.prototype.toObjectId = function (idAsString) {
  if(!isBSonId(idAsString)) throw "cannot convert this string into an objectId";
  return ObjectID(idAsString);

};

// Return all the element from a given collection that matches a given criteria
CollectionDriver.prototype.findOneAsync = function (collectionName, criteria) {
  return this.getCollectionAsync(collectionName)
  .then(collection => collection.findOne(criteria))
  .then(result => {
    if(res !== null) res._id = res._id.toString();
    return res;
  })
};

CollectionDriver.prototype.getByIdAsync = function (collectionName, objectId) {
  return this.getCollectionAsync(collectionName)
  .then(collection => collection.findOne({ _id : this.toObjectId(objectId)}))
  .then(result => {
    if(result !== null) result._id = result._id.toString();
    return result;
  })
};

// Return all the element from a given collection that matches a given criteria
CollectionDriver.prototype.findAllAsync = function (collectionName, criteria, options =  {}) {
  return this.getCollectionAsync(collectionName)
  .then(collection => collection
      .find(criteria, options)
      .map(x => 
        {
          x._id = x._id.toString();
          return x;
        })
      .toArray()
      );
};

// SAVE

CollectionDriver.prototype.saveAsync = function (collectionName, obj) {
  obj._created_at = new Date();
  obj._updated_at = new Date();

  return this.getCollectionAsync(collectionName)
    .then((collection) => {
      return collection.insertOne(obj);
    })
    .then((res) => {
      obj._id = res.insertedId.toString();
      return obj;
    });
};

// Save a the given object into the given collection
CollectionDriver.prototype.saveManyAsync = function(collectionName, array) {

  return this.getCollectionAsync(collectionName)
      .then(collection => {
        return collection.insertMany(array, {
          ordered : true
        });
      })
      .then(res => {
        return Promise.resolve(res.insertedIds);
      });
};

// UPDATE

CollectionDriver.prototype.replaceAsync = function (
  collectionName,
  obj,
  objectId
) {
  if (!isBSonId(objectId)) throw "Invalid id";

  const id = ObjectID(objectId);

  obj._id = id;
  obj._updated_at = new Date();

  return this.getCollectionAsync(collectionName)
    .then((collection) => {
      return collection.findOneAndReplace({ _id: id }, obj);
    })
    .then((result) => Promise.resolve(result.value));
};

CollectionDriver.prototype.updateByIdAsync = function (
  collectionName,
  entityId,
  updater
) {

  updater.$set = updater.$set || {};
  updater.$set._updated_at = new Date();

  return this.db.collection(collectionName).updateOne({ _id: this.toObjectId(entityId) }, updater);
};

CollectionDriver.prototype.updateOneAsync = function (
  collectionName,
  criteria,
  updater
) {

  updater.$set = updater.$set || {};
  updater.$set._updated_at = new Date();

  return this.db.collection(collectionName).updateOne(criteria, updater);
};

CollectionDriver.prototype.updateManyAsync = function (
  collectionName,
  criteria,
  updater
) {

  updater.$set = updater.$set || {};
  updater.$set._updated_at = new Date();

  return this.getCollectionAsync(collectionName)
    .then((collection) => collection.updateMany(criteria, updater))
};


// DELETE

CollectionDriver.prototype.deleteByIdAsync = function (collectionName, entityId) {
  return this.db
    .collection(collectionName)
    .deleteOne({ _id: this.toObjectId(entityId) });
};

CollectionDriver.prototype.deleteOneAsync = function (collectionName, criteria) {
  return this.db
    .collection(collectionName)
    .deleteOne(criteria);
};

CollectionDriver.prototype.deleteAllAsync = function (
  collectionName,
  criteria = {}
) {
  return this.db.collection(collectionName).deleteMany(criteria);
};

// AGGREGATE

CollectionDriver.prototype.aggregateAsync = function (
  collectionName,
  pipeline
) {
  return this.db.collection(collectionName).aggregate(pipeline).toArray()
};

exports.CollectionDriver = CollectionDriver;
