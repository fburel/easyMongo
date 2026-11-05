# myeasymongo

A thin layer over the official [MongoDB Node.js driver](https://www.mongodb.com/docs/drivers/node/current/) that removes the boilerplate:

- **One shared connection**, opened on first use and reused everywhere (works well in serverless functions).
- **Models**: declare a collection once, get CRUD, pagination, upsert and aggregation methods on it, and add your own.
- **String ids**: documents come back with `_id` as a string, ready for JSON.
- **Automatic timestamps**: `_created_at` and `_updated_at` are maintained for you.
- **Declared indexes**, created on connect.
- **TypeScript types** included.

It is not an ORM: there is no schema, no validation, no magic. Queries, updates and pipelines use the plain MongoDB syntax.

> Using an AI coding agent? Install the [myeasymongo skill](#ai-coding-agents) so it knows the API and its pitfalls.

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Models](#models)
- [Connecting](#connecting)
- [API reference](#api-reference)
- [Conventions](#conventions)
- [TypeScript](#typescript)
- [Recipes](#recipes)
- [AI coding agents](#ai-coding-agents)
- [Upgrading to 2.4](#upgrading-to-24)
- [Contributing](#contributing)

## Installation

```shell
npm install myeasymongo
```

Requires Node.js 16.20.1 or later. `mongodb` (v6) is installed as a dependency.

## Quick start

```shell
MONGO="mongodb+srv://<user>:<password>@<cluster>/<database>?retryWrites=true&w=majority"
```

```javascript
const { Model, Register, Connect } = require('myeasymongo');

// 1. Declare a model for the "Posts" collection, available as `mongo.posts`
Register('posts', Model('Posts'));

// 2. Use it
await Connect(async (mongo) => {
  const post = await mongo.posts.saveAsync({ title: 'Hello', author: 'Jane' });
  // { _id: '665f1c...', title: 'Hello', author: 'Jane', _created_at: Date, _updated_at: Date }

  const janePosts = await mongo.posts.findAllAsync({ author: 'Jane' });
});
```

## Configuration

By default the connection string is read from the `MONGO` environment variable. You can also set it in code with `Configure`, before the first `Connect`:

```javascript
const { Configure } = require('myeasymongo');

Configure({
  uri: 'mongodb://localhost:27017',   // default: process.env.MONGO
  dbName: 'blog',                     // default: the database in the connection string
  clientOptions: { maxPoolSize: 10 }, // passed to the MongoClient
});
```

- Every option is optional. Each call to `Configure` **replaces** the previous configuration.
- `clientOptions` are only applied when a connection is opened. Call `Configure` before the first `Connect`, or call `Disconnect()` first.

## Models

### Declaring a model

`Model(collectionName, options?)` creates a model class. `Register(name, model)` makes it available as `mongo[name]` in every `Connect`.

```javascript
// models/posts.js
const { Model, Register } = require('myeasymongo');

const posts = Model('Posts');
Register('posts', posts);

module.exports = posts;
```

Register your models once, at startup, before calling `Connect`.

### Indexes

Declare the indexes of a collection on its model. They are created on the first `Connect`, once per connection. The format is the one of MongoDB's [`createIndexes`](https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndexes/).

```javascript
const users = Model('Users', {
  indexes: [
    { key: { email: 1 }, unique: true },
    { key: { _created_at: -1 } },
  ],
});
Register('users', users);
```

If an index cannot be created (for instance, a unique index on a field that already has duplicates), `Connect` calls your task with `(null, error)` and tries again on the next call.

> `upsertAsync` and `insertIfNotFoundAsync` are only safe against duplicates when the criteria is backed by a unique index. Without one, two concurrent calls can both insert a document.

### Custom methods

Add your own methods to the model's `prototype`. Inside them, `this` is the model: you can call its methods (`this.findOneAsync`, `this.aggregateAsync`...) and the underlying driver (`this.driver`). Use `function`, not an arrow function.

```javascript
const bcrypt = require('bcryptjs');
const { Model, Register } = require('myeasymongo');

const users = Model('Users', { indexes: [{ key: { email: 1 }, unique: true }] });

users.prototype.createAsync = async function (email, password) {
  const passwordHash = await bcrypt.hash(password, 12);
  return this.saveAsync({ email, passwordHash });
};

users.prototype.checkPasswordAsync = async function (email, password) {
  const user = await this.findOneAsync({ email });
  return user !== null && bcrypt.compare(password, user.passwordHash);
};

Register('users', users);
```

```javascript
await Connect(async (mongo) => {
  await mongo.users.createAsync('jane@example.com', 's3cret');
  const ok = await mongo.users.checkPasswordAsync('jane@example.com', 's3cret'); // true
});
```

Aggregation helpers are a good fit for custom methods:

```javascript
const { ObjectId } = require('myeasymongo');

// "Customers who bought this also bought": the 4 products most often ordered with `productId`
orders.prototype.alsoBoughtAsync = function (productId) {
  return this.aggregateAsync([
    { $match: { status: { $ne: 'CANCELLED' }, 'products.id': ObjectId.from(productId), 'products.1': { $exists: true } } },
    { $unwind: '$products' },
    { $match: { 'products.id': { $ne: ObjectId.from(productId) } } },
    { $group: { _id: '$products.id', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 4 },
  ]);
};
```

## Connecting

```javascript
const result = await Connect(async (mongo, error) => {
  // mongo.<name> for each registered model
  // mongo.isConnected() -> Promise<boolean>, pings the server
  // mongo.driver        -> the low level driver (mongo.driver.db is the MongoDB Db)
  return something;
}, keepAlive = true);
```

- `Connect` resolves to the value returned by your task.
- The connection is opened on the first call and **reused** by the next ones, so calling `Connect` on every request is cheap. Concurrent calls share the same connection.
- **Connection errors** (no URI, server unreachable, index creation failed) are not thrown: your task is called with `mongo === null` and the error as second argument.
- **Errors thrown by your task** are propagated: `Connect` rejects with them.
- With `keepAlive = false` the connection is closed when the task ends. The connection is shared, so don't do this while other tasks may be running.

```javascript
await Connect(async (mongo, error) => {
  if (error) {
    // log, retry, return a 503...
    return;
  }
  await mongo.posts.saveAsync({ title: 'Hello' });
});
```

### Closing the connection

Call `Disconnect()` when your process stops, or at the end of your tests:

```javascript
const { Disconnect } = require('myeasymongo');

process.on('SIGTERM', async () => {
  await Disconnect();
  process.exit(0);
});
```

## API reference

All methods return Promises. "Doc" means a document with `_id` as a string (see [Conventions](#conventions)). `id` parameters accept a string or an `ObjectId`; an invalid id throws a `TypeError`.

### Read

| Method | Resolves to |
|---|---|
| `getByIdAsync(id, projection?)` | Doc, or `null` |
| `findOneAsync(filter?, projection?, sort?)` | Doc, or `null` |
| `findAllAsync(filter?, projection?, sort?, skip?, limit?)` | Doc[] (loads everything in memory: use `limit` or `fetchPageAsync` on large collections) |
| `fetchPageAsync(filter?, sort?, projection?, page?, pageSize?, options?)` | `{ size, items }`, plus `total` and `pageCount` with `{ withTotal: true }` |
| `countAsync(filter?)` | number |
| `aggregateAsync(pipeline)` | the raw pipeline results (`_id` **not** converted) |

```javascript
// Page 2 of Jane's posts, 20 per page, newest first, without the content field
const page = await mongo.posts.fetchPageAsync(
  { author: 'Jane' },  // filter, default {}
  { _created_at: -1 }, // sort, default { _id: 1 }
  { content: 0 },      // projection, default none
  2,                   // page number, starts at 1, default 1
  20,                  // page size, default 50
  { withTotal: true }  // also count all matching documents
);
// { size: 20, items: [...], total: 57, pageCount: 3 }
```

### Write

| Method | Resolves to |
|---|---|
| `saveAsync(doc)` | the saved Doc, with `_id`, `_created_at`, `_updated_at` |
| `saveAllAsync(docs)` | the inserted ids as `{ 0: ObjectId, 1: ObjectId, ... }` |
| `replaceAsync(doc)` | replaces the whole document `doc._id`; the new Doc, or `null` if not found |
| `setAsync(id, fields)` | `$set` the given fields on one document; MongoDB `UpdateResult` |
| `updateByIdAsync(id, update)` | MongoDB `UpdateResult` |
| `updateOneAsync(filter, update)` | MongoDB `UpdateResult` |
| `updateManyAsync(filter, update)` | MongoDB `UpdateResult` |
| `upsertAsync(filter, update)` | updates the first match, or creates a document; the document **after** the update (`_id` is an `ObjectId`) |
| `insertIfNotFoundAsync(filter, doc)` | inserts `doc` only if nothing matches; the existing or inserted document (`_id` is an `ObjectId`) |
| `deleteByIdAsync(id)` | MongoDB `DeleteResult` |
| `deleteAllAsync(filter?)` | MongoDB `DeleteResult` (**no filter deletes the whole collection**) |

`update` is a regular MongoDB update document (`$set`, `$unset`, `$inc`, `$push`...):

```javascript
await mongo.users.setAsync(id, { name: 'Jane' });

await mongo.users.updateByIdAsync(id, {
  $set: { name: 'Jane' },
  $unset: { nickname: '' },
  $addToSet: { badges: 'early-adopter' },
});

// Create the user if it doesn't exist, update it otherwise
const user = await mongo.users.upsertAsync(
  { email: 'jane@example.com' },
  { $set: { lastLogin: new Date() }, $inc: { logins: 1 } }
);

// Create the user only if it doesn't exist, never modify an existing one
await mongo.users.insertIfNotFoundAsync(
  { email: 'jane@example.com' },
  { email: 'jane@example.com', name: 'Jane' }
);

// Read, modify, write back the whole document
const post = await mongo.posts.getByIdAsync(id);
post.title = 'New title';
await mongo.posts.replaceAsync(post);
```

### Other exports

| Export | Description |
|---|---|
| `ObjectId.from(value)` | converts a string to a MongoDB `ObjectId`; throws a `TypeError` if invalid |
| `ObjectId.test(value)` | `true` if `value` can be converted |
| `Configure(options)` | see [Configuration](#configuration) |
| `Disconnect()` | closes every open connection |

### Deprecated

| Method | Use instead |
|---|---|
| `getByPageAsync(page, pageSize, filter, projection, sort)` | `fetchPageAsync(..., { withTotal: true })`, which sorts and paginates before the projection and is much faster on large collections |
| `driver.toObjectId(id)` | `ObjectId.from(id)` |

## Conventions

**`_id` is a string** in the documents returned by `getByIdAsync`, `findOneAsync`, `findAllAsync`, `fetchPageAsync`, `saveAsync` and `replaceAsync`. Only the top-level `_id` is converted: other `ObjectId` fields, and the results of `aggregateAsync`, `upsertAsync`, `insertIfNotFoundAsync` and `saveAllAsync`, are not.

**In filters and pipelines, `_id` must be an `ObjectId`**. MongoDB doesn't match a string against an `ObjectId`:

```javascript
const { ObjectId } = require('myeasymongo');

await mongo.posts.findAllAsync({ _id: { $in: ids.map(ObjectId.from) } });
await mongo.comments.findAllAsync({ postId: ObjectId.from(post._id) });
```

Methods that take an `id` parameter (`getByIdAsync`, `setAsync`...) do the conversion for you.

**Timestamps**:

| Method | `_created_at` | `_updated_at` |
|---|---|---|
| `saveAsync` | set | set |
| `saveAllAsync` | set | – |
| `replaceAsync` | kept only if present in the replacement | set |
| `set` / `update*` | – | set |
| `upsertAsync`, `insertIfNotFoundAsync` | set on insert | set |

**Arguments are modified**: `saveAsync` and `saveAllAsync` add `_id` and the timestamps to the objects you pass, and `update*` / `upsertAsync` add a `$set._updated_at` to the update object.

## TypeScript

Types are included. Pass your document type to `Model`, then declare your models in the `Models` interface to type `mongo` in `Connect`:

```typescript
import { Connect, Model, Register, ModelInstance } from 'myeasymongo';

interface Post {
  title: string;
  author: string;
  rating?: number;
}

export const posts = Model<Post>('Posts');
Register('posts', posts);

declare module 'myeasymongo' {
  interface Models {
    posts: ModelInstance<Post>;
    // with custom methods:
    // users: ModelInstance<User> & { checkPasswordAsync(email: string, password: string): Promise<boolean> };
  }
}

await Connect(async (mongo) => {
  const post = await mongo.posts.findOneAsync({ author: 'Jane' }); // Doc<Post> | null
  post?._id;                                                        // string
});
```

- Models registered but not declared in `Models` are still accessible, typed as `any`.
- `mongo` is typed as non-null for convenience; it is `null` when the second argument (`error`) is set.
- `clientOptions` is typed with `MongoClientOptions`, which requires `@types/node` in your project.

## Recipes

### Express middleware

```javascript
// middlewares/mongo.js
const { Connect } = require('myeasymongo');
require('../models'); // register the models

module.exports = async function mongo(req, res, next) {
  const error = await Connect((mongo, err) => {
    if (!err) req.mongo = mongo;
    return err;
  });
  next(error);
};
```

```javascript
const mongo = require('./middlewares/mongo');

router.get('/posts', mongo, async (req, res, next) => {
  try {
    res.json(await req.mongo.posts.findAllAsync({}, {}, { _created_at: -1 }, 0, 50));
  } catch (e) {
    next(e);
  }
});
```

The connection stays open after the middleware returns, so `req.mongo` can be used in the route handlers.

### Loading all your models

With one file per model in a `models/` folder, add an index that requires them all:

```javascript
// models/index.js
require('./posts');
require('./users');
```

Then `require('./models')` once at startup.

### Testing with an in-memory database

With [mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server) and Jest or Vitest:

```javascript
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Configure, Connect, Disconnect } = require('myeasymongo');
require('../models');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  Configure({ uri: mongod.getUri() });
});

afterAll(async () => {
  await Disconnect();
  await mongod.stop();
});

test('saves a post', () => Connect(async (mongo, error) => {
  expect(error).toBeUndefined();
  const post = await mongo.posts.saveAsync({ title: 'Hello' });
  expect(await mongo.posts.getByIdAsync(post._id)).toMatchObject({ title: 'Hello' });
}));
```

## AI coding agents

This repository ships an [Agent Skill](https://agentskills.io) that teaches AI coding agents how to use myeasymongo: project wiring, the rules that avoid the common bugs (string vs `ObjectId` ids, connection errors, unbounded reads, unsafe upserts...), and the full API. Agents load it automatically when they work on code that uses the library.

**Claude Code**, as a plugin:

```shell
claude plugin marketplace add fburel/easyMongo
claude plugin install myeasymongo@myeasymongo
```

(or `/plugin marketplace add fburel/easyMongo` then `/plugin install myeasymongo@myeasymongo` inside a session). It can also be invoked explicitly with `/myeasymongo:myeasymongo`.

**From the npm package**: the skill is included in `node_modules/myeasymongo/skills/myeasymongo`. Copy it to the skills folder of your agent, for instance for Claude Code:

```shell
mkdir -p .claude/skills
cp -r node_modules/myeasymongo/skills/myeasymongo .claude/skills/
```

Commit `.claude/skills/myeasymongo` to share it with your team. Other agents that support Agent Skills use their own skills folder: check their documentation.

## Upgrading to 2.4

- `mongo.isConnected()` now pings the server and returns a **Promise**: use `await mongo.isConnected()`. It used to throw with the v6 driver.
- `fetchPageAsync` returns `{ size, items }` (it used to return `{ _id: null, size, items }`, or `undefined` for an empty page), and defaults to sorting by `_id`.
- `replaceAsync` returns the new document. It used to always return `undefined`, and no longer modifies the object you pass.
- Errors thrown inside a `Connect` task are now propagated. The task used to be called a second time with `(null, error)`.

New: `Configure`, `Disconnect`, model indexes, `fetchPageAsync(..., { withTotal: true })`, TypeScript types.

## Contributing

```shell
npm install
npm test            # unit tests, with an in-memory MongoDB
npm run typecheck   # checks the TypeScript definitions
```

See [AGENTS.md](AGENTS.md) for the project layout and conventions (written for AI coding agents, useful for humans too).

## License

MIT © Florian Burel
