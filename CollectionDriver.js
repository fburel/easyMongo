var ObjectID = require("./ObjectId");

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

// Return all the element from a given collection that matches a given criteria
CollectionDriver.prototype.findOneAsync = function (collectionName, criteria, sort = {}, project = {}) {
  return this.getCollectionAsync(collectionName)
  .then(collection => collection.findOne(criteria, {
    sort: sort,
    projection: project,
  }))
  .then(result => {
    if(result !== null && result._id !== undefined) result._id = result._id.toString();
    return result;
  })
};

CollectionDriver.prototype.getByIdAsync = function (collectionName, objectId, project = {}) {
  return this.getCollectionAsync(collectionName)
  .then(collection => collection.findOne({ _id : ObjectID.from(objectId)}, { sort : {}, projection: project }))
  .then(result => {
    if(result !== null && result._id !== undefined) result._id = result._id.toString();
    return result;
  })
};

// Return all the element from a given collection that matches a given criteria
CollectionDriver.prototype.findAllAsync = function (collectionName, criteria, project= {}, sort = {}, skip = 0, limit = 0) {
  return this.getCollectionAsync(collectionName)
  .then(collection => collection
      .find(criteria)
      .project(project)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .map(x => 
        {
          if(x._id !== undefined) x._id = x._id.toString();
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

  array.forEach(obj => {
    obj._created_at = new Date();
  });
  
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

  const id = ObjectID.from(objectId);

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

  return this.db.collection(collectionName).updateOne({ _id: ObjectID.from(entityId) }, updater);
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

  return this.db.collection(collectionName).updateMany(criteria, updater);
};

CollectionDriver.prototype.upsertAsync = function (
  collectionName,
  criteria,
  updater
) {

  updater.$set = updater.$set || {};
  updater.$set._updated_at = new Date();

  updater.$setOnInsert = updater.$setOnInsert || {};
  updater.$setOnInsert._created_at = new Date();
  return this.db.collection(collectionName).updateMany(criteria, updater, {
    upsert: true
  });
};



// DELETE

CollectionDriver.prototype.deleteByIdAsync = function (collectionName, entityId) {
  return this.db
    .collection(collectionName)
    .deleteOne({ _id: ObjectID.from(entityId) });
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

CollectionDriver.prototype.countAsync = function (
  collectionName,
  query = {}
) {
  return this.db.collection(collectionName).countDocuments(query)
};

/**
 * @deprecated: this function is only kept for backward compatibility. It will be remove in a future version. Please use ObjectId.from() instead. 
 */
CollectionDriver.prototype.toObjectId = function(id) {
  return ObjectID.from(id);
};

exports.CollectionDriver = CollectionDriver;
