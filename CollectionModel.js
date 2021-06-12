module.exports = function (Table) {
  
  return function (driver) {
    this.driver = driver;

    this.getByIdAsync = function (_id) {
      return this.driver.getByIdAsync(Table, _id);
    };

    this.updateAsync = function (value) {
      return this.driver.updateAsync(Table, value, value._id);
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

    this.setAsync = function setAsync(id, values) {
      const update = { $set: values };
      return this.driver
        .partialUpdateAsync(Table, update, id)
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
