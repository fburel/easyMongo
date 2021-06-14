var ObjectID = require("mongodb").ObjectID;

let CollectionDriver = function (db) {
  this.db = db;
};

CollectionDriver.prototype.isConnected = function () {
  return this.db.serverConfig.isConnected()
};

CollectionDriver.prototype.getDatabase = function () {
  return this.db;
};

CollectionDriver.prototype.getCollection = function (collectionName, callback) {
  this.db.collection(collectionName, function (error, the_collection) {
    if (error) callback(error);
    else callback(null, the_collection);
  });
};

CollectionDriver.prototype.getCollectionAsync = function (collectionName) {
  const database = this.db;

  return new Promise(function (resolve, reject) {
    database.collection(collectionName, function (error, the_collection) {
      if (error) reject(error);
      else resolve(the_collection);
    });
  });
};

// Return all the element from a given collection that matches a given criteria
CollectionDriver.prototype.findAll = function (
  collectionName,
  criteria,
  callback
) {
  this.getCollection(collectionName, function (error, the_collection) {
    //A
    if (error) callback(error);
    else {
      the_collection.find(criteria).toArray(function (error, results) {
        //B
        if (error) callback(error);
        else
          callback(
            null,
            results.map((x) => {
              x._id = x._id.toString();
              return x;
            })
          );
      });
    }
  });
};

// Return all the element from a given collection that matches a given criteria
CollectionDriver.prototype.findOne = function (
  collectionName,
  criteria,
  callback
) {
  this.getCollection(collectionName, function (error, the_collection) {
    //A
    if (error) callback(error);
    else {
      the_collection.findOne(criteria, function (error, results) {
        //B
        if (error) callback(error);
        else {
          if (results !== null) results._id = results._id.toString();
          callback(null, results);
        }
      });
    }
  });
};

// Return the element of the given collection with the given id
CollectionDriver.prototype.getById = function (
  collectionName,
  objectId,
  callback
) {
  this.getCollection(collectionName, function (error, the_collection) {
    if (error) {
      callback(error);
    } else {
      var id = null;
      if (isBSonId(objectId)) {
        id = ObjectID(objectId);
      } else {
        callback("Invalid id");
      }

      the_collection.findOne({ _id: id }, function (error, doc) {
        if (error) callback(error);
        else {
          callback(null, doc);
        }
      });
    }
  });
};

// Save a the given object into the given collection
CollectionDriver.prototype.save = function (collectionName, obj, callback) {
  this.getCollection(collectionName, function (error, the_collection) {
    //A
    if (error) callback(error);
    else {
      obj._created_at = new Date();
      obj._updated_at = new Date();
      the_collection.insert(obj, function () {
        //C
        obj._id = obj._id.toString();
        callback(null, obj);
      });
    }
  });
};

//update a specific object
CollectionDriver.prototype.update = function (
  collectionName,
  obj,
  objectId,
  callback
) {
  this.getCollection(collectionName, function (error, the_collection) {
    if (error) callback(error);
    else {
      var id = null;
      if (isBSonId(objectId)) {
        id = ObjectID(objectId);
      } else {
        callback("Invalid id");
      }

      obj._id = id;
      obj._updated_at = new Date();
      the_collection.save(obj, function (error) {
        if (error) callback(error);
        else {
          obj._id = obj._id.toString();
          callback(null, obj);
        }
      });
    }
  });
};

// Delete all record matching criteria
CollectionDriver.prototype.deleteAll = function (
  collectionName,
  criteria,
  callback
) {
  this.getCollection(collectionName, function (error, the_collection) {
    //A
    if (error) callback(error);
    else {
      the_collection.remove(criteria, function (error, doc) {
        //B
        if (error) callback(error);
        else callback(null, doc);
      });
    }
  });
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
  return this.db.collection(collectionName).findOne(criteria);
};

// Return all the element from a given collection that matches a given criteria
CollectionDriver.prototype.findAllAsync = function (collectionName, criteria) {
  let repo = this;
  return new Promise(function (resolve, reject) {
    repo.findAll(collectionName, criteria, function (err, result) {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

CollectionDriver.prototype.getByIdAsync = function (collectionName, objectId) {
  let repo = this;
  return new Promise(function (resolve, reject) {
    repo.getById(collectionName, objectId, function (err, result) {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Save a the given object into the given collection
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

CollectionDriver.prototype.updateAsync = function (
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

CollectionDriver.prototype.deleteAsync = function (collectionName, entityId) {
  return this.db
    .collection(collectionName)
    .deleteOne({ _id: ObjectID(entityId) });
};

CollectionDriver.prototype.deleteAllAsync = function (
  collectionName,
  criteria
) {
  return this.db.collection(collectionName).deleteMany(criteria);
};

CollectionDriver.prototype.aggregateAsync = function (
  collectionName,
  pipeline
) {
  // return this.db.collection(collectionName).then(c => c.aggregate(pipeline));
  return this.getCollectionAsync(collectionName)

    .then(function (collection) {
      return new Promise(function (resolve, reject) {
        collection.aggregate(pipeline, function (MongoError, cursor) {
          if (MongoError) reject(MongoError);
          else {
            resolve(cursor);
          }
        });
      });
    })
    .then((cursor) => {
      return cursor.toArray();
    });
};

CollectionDriver.prototype.partialUpdateAsync = function (
  collectionName,
  updater,
  objectId
) {
  if (!isBSonId(objectId)) throw "Invalid id";

  const id = ObjectID(objectId);

  updater.$set = updater.$set || {};
  updater.$set._updated_at = new Date();

  return this.getCollectionAsync(collectionName)
    .then((collection) => collection.updateOne({ _id: id }, updater))
    .then((result) => Promise.resolve(result.value));
};

exports.CollectionDriver = CollectionDriver;
