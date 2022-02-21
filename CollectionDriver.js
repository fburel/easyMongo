var ObjectID = require("mongodb").ObjectID;

let CollectionDriver = function (db) {
  this.db = db;
};

CollectionDriver.prototype.isConnected = function () {
  return this.db.serverConfig.isConnected()
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
  return this.db.collection(collectionName).findOne(criteria).then((res) => {
    if(res !== null){
      res._id = res._id.toString();
    }
    return res;
  });;
};

// Return all the element from a given collection that matches a given criteria
CollectionDriver.prototype.findAllAsync = function (collectionName, criteria) {
  return this.db.collection(collectionName).find(criteria).then(cursor => {
    const res = cursor.toArray();
    res.forEach(x => x._id = x._id.toString());
    return res;
  });
};

CollectionDriver.prototype.getByIdAsync = function (collectionName, objectId) {

  if(!isBSonId(objectId)){
    throw "ObjectId is not a valid bson"
  }
  return this.findOneAsync(collectionName, {
    _id : this.toObjectId(objectId)
  });
};

// Save a the given object into the given collection
CollectionDriver.prototype.saveAsync = function (collectionName, obj) {
  obj._created_at = new Date();
  obj._updated_at = new Date();

  return this.db.collection(collectionName).insertOne(obj).then((res) => {
    obj._id = res.insertedId.toString();
    return obj;
  });
};

// Save a the given object into the given collection
CollectionDriver.prototype.saveManyAsync = function(collectionName, array) {

  array.forEach(obj => {
    obj._created_at = new Date();
    obj._updated_at = new Date();
  })

  return this.db.collection(collectionName).insertMany(array, { ordered : true })
      .then(res => {
        return Promise.resolve(res.insertedIds.map(x => x.toString()));
      });
};


CollectionDriver.prototype.replaceAsync = function (
  collectionName,
  obj,
  objectId
) {
  if (!isBSonId(objectId)) throw "Invalid id";

  const id = ObjectID(objectId);

  obj._id = id;
  obj._updated_at = new Date();

  return this.db.collection(collectionName).findOneAndReplace({ _id: id }, obj).then((result) => Promise.resolve(result.value));
};

CollectionDriver.prototype.deleteOneAsync = function (collectionName, criteria) {
  return this.db.collection(collectionName).deleteOne({ _id: criteria });
};

CollectionDriver.prototype.deleteByIdAsync = function (collectionName, id) {
  if (isBSonId(id)) {
    id = ObjectID(id);
  }
  else {
    throw 'id is not a valid BSonId : ' + id
  }

  return this.deleteOneAsync(collectionName, {_id : id})
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
  return this.db.collection(collectionName).aggregate(pipeline).then((cursor) => {
    const res = cursor.toArray();
    res.forEach(x => {
      if(x._id !== undefined){
        x._id = x._id.toString()
      }
    });
    return res;
  });
};


CollectionDriver.prototype.updateManyAsync = function (
  collectionName,
  criteria,
  updater
) {
  updater.$set = updater.$set || {};
  updater.$set._updated_at = new Date();
  return this.db.collection(collectionName).updateMany(criteria, updater)
};

CollectionDriver.prototype.updateByIdAsync = function (
  collectionName,
  id,
  updater
) {

  if (isBSonId(id)) {
    id = ObjectID(id);
  }
  else {
    throw 'id is not a valid BSonId : ' + id
  }

  return this.updateOneAsync(collectionName, { _id : id }, updater);

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

exports.CollectionDriver = CollectionDriver;
