module.exports = function (Table) {
  
  return function (driver) {
    this.driver = driver;

    // get

    this.getByIdAsync = function (_id) {
      return this.driver.getByIdAsync(Table, _id);
    };

    this.findAllAsync = function findAllAsync(criteria) {
      return this.driver.findAllAsync(Table, criteria);
    };

    this.findOneAsync = function findOneAsync(criteria) {
      return this.driver.findOneAsync(Table, criteria);
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


    /**
    * @deprecated Since version 1.1 Will be deleted in version 1.2 use deleteByIdAsync instead.
    */
    this.deleteAsync = function (_id) {
      return this.driver.deleteAsync(Table, _id);
    };

    this.deleteByIdAsync = function (_id) {
      return this.driver.deleteAsync(Table, _id);
    };

    this.deleteAllAsync = function deleteAllAsync(criteria) {
      return this.driver.deleteAllAsync(Table, criteria);
    };

    // update

    /**
    * @deprecated Since version 1.1 Will be deleted in version 1.2 use replaceAsync instead.
    */
    this.updateAsync = function (value) {
      return this.driver.updateAsync(Table, value, value._id);
    };

    this.replaceAsync = function (value) {
      return this.driver.updateAsync(Table, value, value._id);
    };
  
    this.updateByIdAsync = function (id, updater) {
      return this.driver
        .updateManyAsync(Table, {_id : this.driver.toObjectId(id) }, updater)
        .then(() => Promise.resolve(true));
    };

    /**
    * @deprecated Since version 1.1 Will be deleted in version 1.2 use updateByIdAsync instead.
    */
    this.updateOneAsync = function (id, updater) {
      return this.driver
        .updateManyAsync(Table, {_id : this.driver.toObjectId(id) }, updater)
        .then(() => Promise.resolve(true));
    };

    this.updateManyAsync = function (criteria, updater) {
      return this.driver
        .updateManyAsync(Table, criteria, updater)
        .then(() => Promise.resolve(true));
    };

    this.setAsync = function (id, values) {
      const update = { $set: values };
      return this.driver
        .updateManyAsync(Table, {_id : this.driver.toObjectId(id) },update)
        .then(() => Promise.resolve(true));
    };

    // aggregate

    this.aggregateAsync = function (pipeline) {
      return this.driver
        .aggregateAsync(Table, pipeline)
        .then(results => Promise.resolve(results));
    };

  };
};
