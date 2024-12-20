const ObjectId = require("./ObjectId");

module.exports = function (Table) {

  return function (driver) {
    this.driver = driver;

    // get

    this.getByIdAsync = function (_id, project = null) {
      return this.driver.getByIdAsync(Table, _id, project);
    };

    this.findAllAsync = function findAllAsync(criteria, project = {}, sort = {}, skip = 0, limit = 0) {
      return this.driver.findAllAsync(Table, criteria, project, sort, skip, limit);
    };

    this.findOneAsync = function findOneAsync(criteria, projection = {}, sort = {}) {
      return this.driver.findOneAsync(Table, criteria, projection, sort);
    };

    /**
     * @deprecated since version 2.5.3. Will be remove in future version, please use fetchPageAsync
     */
    this.getByPageAsync = function (
      pageNumber,
      pageSize = 50,
      match = null,
      project = null,
      sort = null,
    ) {
      let pipe = [];
      if(match) pipe.push({
        $match: match,
      });
      if(project) pipe.push({
        $project: project,
      });
      if(sort) pipe.push({
        $sort: sort,
      });

      // group element
      pipe.push( {
        $group: {
          _id: null,
          total: {
            $sum: 1,
          },
          data: {
            $push: "$$ROOT",
          },
        },
      })

      // return the page
      pipe.push({
        $project: {
          _id: 0,
          pageCount: {
            $ceil: {
              $divide: ["$total", pageSize],
            },
          },
          items: {
            $slice: ["$data", (pageNumber - 1) * pageSize, pageSize],
          },
        },
      },)

      return this.driver.aggregateAsync(Table, pipe).then((array) => array[0]);
    };

    /**
     * return the list of record matching a certain criteria in a page per page fashion.
     */
    this.fetchPageAsync = function (
        match = {},
        sort = {},
        project = null,
        pageNumber = 1,
        pageSize = 50,
    ) {
      let pipe = [];

      if(match) pipe.push({
        $match: match,
      });

      if(sort) pipe.push({
        $sort: sort,
      });

      pipe.push({
        $skip : (pageNumber - 1) * pageSize
      })

      pipe.push({
        $limit : pageSize
      })

      if(project) pipe.push({
        $project: project,
      });

      // group element
      pipe.push( {
        $group: {
          _id: null,
          size: {
            $sum: 1,
          },
          items: {
            $push: "$$ROOT",
          }
        },
      })

      return this.driver.aggregateAsync(Table, pipe).then((array) => array[0]);
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

    // count

    this.countAsync = function (query = {}) {
      return this.driver
        .countAsync(Table, query)
    };

    // aggregate

    this.aggregateAsync = function (pipeline) {
        return this.driver
          .aggregateAsync(Table, pipeline);
      };


  };
};
