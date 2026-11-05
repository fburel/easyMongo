# myeasymongo API reference

All model methods return Promises. "Doc" = document with the top-level `_id` converted to a string. `id` parameters accept a string or an `ObjectId`; an invalid id throws `TypeError`.

## Exports

| Export | Description |
|---|---|
| `Configure({ uri?, dbName?, clientOptions? })` | Connection settings. Default uri: `process.env.MONGO`; default db: the one in the uri. Replaces the previous config. `clientOptions` (MongoClientOptions) only apply to connections opened afterwards. |
| `Model(collectionName, { indexes? })` | Returns a model class. `indexes`: array of MongoDB index descriptions (`{ key, unique, name, ... }`), created on the first Connect, once per connection. Add custom methods on `.prototype`. |
| `Register(name, modelClass)` | Makes the model available as `mongo[name]` from the next Connect. |
| `Connect(task, keepAlive = true)` | Calls `task(mongo)` with the shared connection, or `task(null, error)` if connecting fails. Resolves to the task's return value; rejects with errors thrown by the task. `keepAlive = false` closes the shared connection after the task. |
| `Disconnect()` | Closes every open connection. |
| `ObjectId.from(value)` | String or ObjectId → ObjectId. Throws `TypeError` if invalid. |
| `ObjectId.test(value)` | `true` if `value` is a valid id. |

## The `mongo` object (Connect task argument)

| Property | Description |
|---|---|
| `mongo.<name>` | Each registered model instance. |
| `mongo.isConnected()` | `Promise<boolean>`, pings the server. |
| `mongo.driver` | Low-level driver. `mongo.driver.db` is the MongoDB `Db` (escape hatch for anything not covered: transactions, bulkWrite, change streams...). |

## Model methods

### Read

| Method | Resolves to |
|---|---|
| `getByIdAsync(id, projection?)` | Doc \| null |
| `findOneAsync(filter = {}, projection = {}, sort = {})` | Doc \| null |
| `findAllAsync(filter = {}, projection = {}, sort = {}, skip = 0, limit = 0)` | Doc[] (`limit = 0` means no limit) |
| `fetchPageAsync(filter = {}, sort = { _id: 1 }, projection = null, page = 1, pageSize = 50, { withTotal } = {})` | `{ size, items: Doc[] }`; with `withTotal: true` also `total` and `pageCount`. Sort/skip/limit run before the projection. |
| `countAsync(filter = {})` | number |
| `aggregateAsync(pipeline)` | raw result array (`_id` not converted) |
| `getByPageAsync(page, pageSize, filter, projection, sort)` | **Deprecated**, use `fetchPageAsync`. |

### Write

| Method | Resolves to | Timestamps |
|---|---|---|
| `saveAsync(doc)` | the saved Doc (input object is mutated: `_id` string + timestamps) | sets both |
| `saveAllAsync(docs)` | `{ 0: ObjectId, 1: ObjectId, ... }` (object of ObjectIds, not an array of strings) | `_created_at` only |
| `replaceAsync(doc)` | replaces the whole document `doc._id`; new Doc, or null if not found. Fields absent from `doc` are removed. | sets `_updated_at`; `_created_at` kept only if in `doc` |
| `setAsync(id, fields)` | MongoDB `UpdateResult` (`$set` of `fields`) | `_updated_at` |
| `updateByIdAsync(id, update)` | `UpdateResult` | `_updated_at` |
| `updateOneAsync(filter, update)` | `UpdateResult` | `_updated_at` |
| `updateManyAsync(filter, update)` | `UpdateResult` | `_updated_at` |
| `upsertAsync(filter, update)` | document after update/insert, `_id` is an ObjectId | `_created_at` on insert, `_updated_at` always |
| `insertIfNotFoundAsync(filter, doc)` | existing or inserted document, `_id` is an ObjectId. Existing docs are not modified, except `_updated_at`. | same as upsert |
| `deleteByIdAsync(id)` | `DeleteResult` | – |
| `deleteAllAsync(filter = {})` | `DeleteResult` — no filter deletes everything | – |

`update` is a MongoDB update document with operators (`$set`, `$unset`, `$inc`, `$push`, `$addToSet`...). The library adds `$set._updated_at` to it (the object is mutated).

## Custom methods

```js
const orders = Model('Orders');

orders.prototype.totalByCustomerAsync = function (customerId) {
  return this.aggregateAsync([
    { $match: { customerId: ObjectId.from(customerId), status: { $ne: 'CANCELLED' } } },
    { $group: { _id: '$customerId', total: { $sum: '$amount' } } },
  ]).then(([res]) => (res ? res.total : 0));
};

Register('orders', orders);
```

`this` is the model instance: every method above is available, plus `this.driver`.

## Express middleware

```js
module.exports = async function mongo(req, res, next) {
  const error = await Connect((mongo, err) => {
    if (!err) req.mongo = mongo;
    return err;
  });
  next(error);
};
```

The connection stays open after the middleware, so route handlers can use `req.mongo`.

## TypeScript types

- `Model<T>(name, options?)` → `ModelClass<T>`; instances are `ModelInstance<T>`.
- `Doc<T>` = `T` with `_id: string`, `_created_at?: Date`, `_updated_at?: Date`.
- `Page<T>` = `{ size, items: Doc<T>[] }`; `PageWithTotal<T>` adds `total`, `pageCount` (returned when `{ withTotal: true }` is passed).
- Declare models in the `Models` interface (module augmentation of `'myeasymongo'`) to type `mongo.<name>`; undeclared ones are `any`.
- `clientOptions` needs `@types/node` in the project.
