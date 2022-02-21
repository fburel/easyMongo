module.exports = function (Table) {
  
  return function (driver) {
    this.driver = driver;

    this.getByIdAsync = function (_id) {
      return this.driver.getByIdAsync(Table, _id);
    };

    this.updateAsync = function (value) {
      return this.driver.replaceAsync(Table, value, value._id);
    };

    this.deleteAsync = function deleteAsync(_id) {
      return this.driver.deleteAsync(Table, _id);
    };

    this.deleteAllAsync = function deleteAllAsync(criteria) {
      return this.driver.deleteAllAsync(Table, criteria);
    };

    this.findAllAsync = function findAllAsync(criteria) {
      return this.driver.findAllAsync(Table, criteria);
    };

    this.findOneAsync = function findOneAsync(criteria) {
      return this.driver.findOneAsync(Table, criteria);
    };

    this.saveAsync = function (value) {
      return this.driver.saveAsync(Table, value);
    };

    this.saveAsync = function (value) {
      return this.driver.saveAsync(Table, value);
    };

    this.saveAllAsync = function (objects) {
      return this.driver.saveManyAsync(Table, objects);
    }

    this.updateByIdAsync = function (id, updater) {
      return this.driver
        .updateByIdAsync(Table, id, updater)
        .then(() => Promise.resolve(true));
    };

    this.updateOneAsync = function (criteria, updater) {
      return this.driver
        .updateOneAsync(Table, criteria, updater)
        .then(() => Promise.resolve(true));
    };

    this.updateManyAsync = function (criteria, updater) {
      return this.driver
        .updateManyAsync(Table, criteria, updater)
        .then(() => Promise.resolve(true));
    };

    /**
    * @deprecated Since version 2.0. Will be deleted in version 3.0. Use replaceAsync instead.
    */
    this.updateAsync = function (document) {
      return this.driver
        .replaceAsync(Table, document, document._id)
        .then(() => Promise.resolve(true));
    };

    this.replaceAsync = function (document) {
      return this.driver
        .replaceAsync(Table, document, document._id)
        .then(() => Promise.resolve(true));
    };


    this.setAsync = function (id, values) {
      const update = { $set: values };
      return this.driver
        .updateManyAsync(Table, {_id : this.driver.toObjectId(id) },update)
        .then(() => Promise.resolve(true));
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
  };
};
