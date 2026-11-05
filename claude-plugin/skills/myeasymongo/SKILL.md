---
name: myeasymongo
description: Write correct code with the myeasymongo library (MongoDB models, Connect, CRUD, pagination, upsert, ObjectId). Use whenever the project depends on myeasymongo, or code imports or requires 'myeasymongo', or calls Model(), Register(), Connect(), fetchPageAsync, upsertAsync or other xxxAsync model methods, including when writing tests or Express middlewares that access MongoDB through it.
license: MIT
---

# myeasymongo

Thin layer over the MongoDB Node.js driver v6 (CommonJS, TypeScript types included). One shared connection, models with CRUD methods, `_id` returned as strings, automatic `_created_at` / `_updated_at`. Not an ORM: filters, updates and pipelines are plain MongoDB syntax.

Full method list and return types: [references/api.md](references/api.md). Read it before using a method you are not sure about.

## How a project is wired

```js
const { Configure, Model, Register, Connect, Disconnect, ObjectId } = require('myeasymongo');

// Optional. Default uri: process.env.MONGO. Call before the first Connect. Replaces the previous config.
Configure({ uri, dbName, clientOptions });

// One file per model, required once at startup, before any Connect.
const users = Model('Users', { indexes: [{ key: { email: 1 }, unique: true }] });
users.prototype.findByEmailAsync = function (email) {   // `function`, not an arrow: `this` is the model
  return this.findOneAsync({ email });
};
Register('users', users);                                // available as mongo.users

// Everywhere else. The connection is opened once and reused: calling Connect per request is cheap.
const user = await Connect(async (mongo, error) => {
  if (error) throw error;                                // connection failed: mongo is null
  return mongo.users.findByEmailAsync('jane@example.com');
});

await Disconnect();                                      // on shutdown and at the end of tests
```

Before writing code, look at how the project already does it (models folder, middleware, test helpers) and follow it.

## Rules

1. **Check `error` in every Connect task.** Connection errors (no URI, unreachable server, index creation failure) are not thrown: the task is called with `(null, error)`. Errors thrown inside the task are propagated.
2. **`_id` is a string in what you read, an ObjectId in what you query.** A string never matches an ObjectId:
   ```js
   mongo.posts.findAllAsync({ _id: { $in: ids.map(ObjectId.from) } });
   mongo.comments.findAllAsync({ postId: ObjectId.from(post._id) });
   ```
   Methods taking an `id` parameter (`getByIdAsync`, `setAsync`, `updateByIdAsync`, `deleteByIdAsync`) convert for you.
3. **Store references as ObjectIds** (`authorId: ObjectId.from(user._id)`), not as the strings you got from a read.
4. **`ObjectId` is not a constructor.** Use `ObjectId.from(str)` (throws `TypeError` if invalid) and `ObjectId.test(str)`. Never `new ObjectId()` / `ObjectId()` from this package.
5. **Paginate with `fetchPageAsync`**, never `getByPageAsync` (deprecated, slow). Arguments are positional: `fetchPageAsync(filter, sort, projection, page, pageSize, { withTotal: true })`.
6. **Bound your reads.** `findAllAsync` loads everything: pass a `limit` (5th argument) or paginate.
7. **Upserts need a unique index** on the filter fields to be safe under concurrency. Declare it in the model's `indexes`.
8. **Don't manage timestamps.** `_created_at` / `_updated_at` are set by the library. `_updated_at` in `$setOnInsert`, or in the document passed to `insertIfNotFoundAsync`, makes MongoDB fail with a path conflict.
9. **Write methods mutate their arguments** (`_id`, timestamps, `$set._updated_at`). Copy the object first if you reuse it.
10. **`deleteAllAsync()` without a filter empties the collection.** Always pass a filter unless that is the intent.
11. **`await mongo.isConnected()`**: it returns a Promise (it pings the server).
12. **Don't call `Connect(task, false)` in a server**: it closes the connection shared by every request.

## Choosing a write method

| Intent | Method |
|---|---|
| Create | `saveAsync(doc)` (returns the doc with string `_id`), `saveAllAsync(docs)` |
| Change some fields of one doc by id | `setAsync(id, fields)` or `updateByIdAsync(id, { $set, $inc, ... })` |
| Change docs matching a filter | `updateOneAsync` / `updateManyAsync(filter, update)` |
| Create or update | `upsertAsync(filter, update)` |
| Create only if missing, never modify | `insertIfNotFoundAsync(filter, doc)` |
| Write back a whole doc you read | `replaceAsync(doc)` (uses `doc._id`) |

Updates must use operators (`$set`, `$unset`, `$inc`, `$push`...), never a plain document.

## TypeScript

```ts
import { Model, Register, ModelInstance, Doc } from 'myeasymongo';
import type { ObjectId } from 'mongodb';

interface Post { title: string; authorId: ObjectId }
Register('posts', Model<Post>('Posts'));

declare module 'myeasymongo' {
  interface Models {
    posts: ModelInstance<Post>;
    // with custom methods:
    // users: ModelInstance<User> & { findByEmailAsync(email: string): Promise<Doc<User> | null> };
  }
}
```

Read methods return `Doc<T>` (`_id: string`). In the Connect callback, `mongo` is typed non-null but is `null` when `error` is set. Declare every model with custom methods in `Models`, otherwise it is typed `any`.

## Tests

Use an in-memory server, never the real database:

```js
const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
beforeAll(async () => { mongod = await MongoMemoryServer.create(); Configure({ uri: mongod.getUri() }); });
afterAll(async () => { await Disconnect(); await mongod.stop(); });

test('creates a user', () => Connect(async (mongo, error) => {
  expect(error).toBeUndefined();
  const user = await mongo.users.saveAsync({ email: 'jane@example.com' });
  expect(await mongo.users.getByIdAsync(user._id)).toMatchObject({ email: 'jane@example.com' });
}));
```
