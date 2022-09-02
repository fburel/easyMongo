const ObjectId = require("./ObjectId");

module.exports = function (Table) {
  
  return function (driver) {
    this.driver = driver;

    // get

    this.getByIdAsync = function (_id, project = {}) {
      return this.driver.getByIdAsync(Table, _id, project);
    };

    this.findAllAsync = function findAllAsync(criteria, project = {}, sort = {}, skip = 0, limit = 0) {
      return this.driver.findAllAsync(Table, criteria, project, sort, skip, limit);
    };

    this.findOneAsync = function findOneAsync(criteria, sort = {}, project = {}) {
      return this.driver.findOneAsync(Table, criteria, sort, project);
    };

    this.getByPageAsync = function (
      pageNumber,
      pageSize = 50,
      match = {},
      sort = { _updated_at: -1 }
    ) {
      let pipeline = [
        {
          $match: match,
        },
        {
          $sort: sort,
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: 1,
            },
            data: {
              $push: "$$ROOT",
            },
          },
        },
        {
          $project: {
            _id: 0,
            pages: {
              $ceil: {
                $divide: ["$total", pageSize],
              },
            },
            items: {
              $slice: ["$data", (pageNumber - 1) * pageSize, pageSize],
            },
          },
        },
      ];

      return this.driver.aggregateAsync(Table, pipeline).then((array) => array[0]);
    };

    // save 

    this.saveAsync = function (value) {
      return this.driver.saveAsync(Table, value);
    };

    this.saveAllAsync = function (objects) {
      return this.driver.saveManyAsync(Table, objects);
    }

    // delete

    this.deleteByIdAsync = function (_id) {
      return this.driver.deleteByIdAsync(Table, _id);
    };

    this.deleteAllAsync = function deleteAllAsync(criteria) {
      return this.driver.deleteAllAsync(Table, criteria);
    };

    // update

    this.replaceAsync = function (value) {
      return this.driver.replaceAsync(Table, value, value._id);
    };
  
    this.updateByIdAsync = function (id, updater) {
      return this.driver
        .updateManyAsync(Table, {_id : ObjectId.from(id) }, updater);
    };

    this.updateManyAsync = function (criteria, updater) {
      return this.driver
        .updateManyAsync(Table, criteria, updater);
    };

    this.updateOneAsync = function (criteria, updater) {
      return this.driver
        .updateOneAsync(Table, criteria, updater);
    };

    this.setAsync = function (id, values) {
      const update = { $set: values };
      return this.driver
        .updateManyAsync(Table, {_id : ObjectId.from(id) },update);
    };

    this.insertIfNotFoundAsync = function (criteria, document) {
      const update = { $setOnInsert: document };
      return this.driver
        .upsertAsync(Table, criteria, update);
    };

    this.upsertAsync = function (criteria, updater) {
      return this.driver
        .upsertAsync(Table, criteria, updater);
    };


    // aggregate

    this.aggregateAsync = function (pipeline) {
      return this.driver
        .aggregateAsync(Table, pipeline);
    };

    // count

    this.countAsync = function (query = {}) {
      return this.driver
        .countAsync(Table, query)
    };

  };
};
