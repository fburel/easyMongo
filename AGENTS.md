# AGENTS.md

Guide for AI coding agents working **on this repository**. For using the library in another project, see the skill in [claude-plugin/skills/myeasymongo](claude-plugin/skills/myeasymongo/SKILL.md).

## Project

`myeasymongo`: a small CommonJS library over the MongoDB Node.js driver v6. Shared connection, models with CRUD methods, `_id` as strings, automatic timestamps. Published on npm as `myeasymongo`.

## Layout

| Path | Role |
|---|---|
| `src/index.js` | Public entry: `Configure`, `Register`, `Connect`, `Disconnect`, `Model`, `ObjectId`. Holds the module-level state: connection cache (one promise per URI), registered models, config, indexes already created. |
| `src/CollectionModel.js` | `Model(table, options)` returns a constructor. Each instance forwards to the driver with its collection name. `fetchPageAsync` / `getByPageAsync` build aggregation pipelines here. |
| `src/CollectionDriver.js` | All the MongoDB calls. Converts `_id` to string on reads, adds `_created_at` / `_updated_at` on writes. |
| `src/ObjectId.js` | `from` (validate + convert, throws `TypeError`) and `test`. |
| `src/index.d.ts` | Hand-written TypeScript definitions. **Must be kept in sync with the JS.** |
| `__tests__/unit/*.test.js` | Vitest tests against `mongodb-memory-server`. |
| `__tests__/types/usage.ts` | Compile-only usage check of `index.d.ts` (uses `@ts-expect-error` for negative cases). |
| `claude-plugin/skills/myeasymongo/` | Agent Skill for agents *using* the library: `SKILL.md` (wiring + rules) and `references/api.md` (full API). Shipped in the npm package under `skills/`. |
| `claude-plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | Claude Code plugin + marketplace exposing the skill (`claude plugin marketplace add fburel/easyMongo`). |
| `Dockerfile` | Used only to publish to npm (see Publishing). |

## Commands

```shell
npm install
npm test            # vitest run; downloads a MongoDB binary on first run
npm run typecheck   # tsc on __tests__/types/usage.ts
```

Run both before considering a change done. Tests take a few seconds; no external database is needed.

## Conventions

- **CommonJS**, ES2020, no build step, no runtime dependency besides `mongodb` and `uuid`. Don't add dependencies without asking.
- Methods are named `xxxAsync` and return Promises. Public API names are stable: don't rename, deprecate instead (JSDoc `@deprecated` + readme "Deprecated" table).
- Read methods return `_id` as a string (top-level only). Methods taking an `id` accept a string or an `ObjectId` and convert with `ObjectId.from`.
- Write methods set `_created_at` / `_updated_at` (see the timestamps table in the readme).
- `$sort` stages must never be empty: MongoDB rejects `{ $sort: {} }`.
- Driver v6 `findOneAndX` methods return the document itself, not `{ value }`. Pass `returnDocument: "after"` when the new document is wanted.
- `Connect`: only connection-phase errors go to `task(null, error)`. Errors thrown by the task must propagate and the task must never run twice.

## Adding or changing a model method

1. Driver call in `src/CollectionDriver.js` (if it touches MongoDB).
2. Model method in `src/CollectionModel.js`.
3. Signature in `src/index.d.ts` (`ModelInstance<T>`), and a usage line in `__tests__/types/usage.ts`.
4. Tests in `__tests__/unit/model.test.js` (or `features.test.js` for connection-level features).
5. Readme: API reference table, and the "Upgrading" section if behaviour changes.
6. The skill (`SKILL.md` rules, `references/api.md`) if the API or a pitfall changes.

## Tests

- Each test file starts its own `MongoMemoryServer` and sets `process.env.MONGO` or calls `Configure({ uri })`. Vitest isolates modules per file, so the connection cache and the model registry are per file.
- Inside a file, the registry and the connection are shared between tests: use `randomString()` (from `__tests__/mock.js`) for model and collection names, and call `Configure({})` + `Disconnect()` in `afterEach` when a test changes the configuration.
- When fixing a bug, write the test first and check it fails on the old code.

## Known quirks (intentional or not fixed yet)

- `package.json` `main` is `index.js` and `types` is `index.d.ts` although the files live in `src/`: the Dockerfile copies `src/*` to the package root before publishing. Requiring the repo root directly does not work.
- `updateByIdAsync`, `deleteByIdAsync`, `setAsync` call `ObjectId.from` synchronously: an invalid id throws instead of returning a rejected promise.
- `saveAllAsync` doesn't set `_updated_at` and returns `ObjectId`s, `upsertAsync` / `insertIfNotFoundAsync` return a raw `_id`, `aggregateAsync` doesn't convert ids.
- Write methods mutate their arguments (documents and update objects).
- `insertIfNotFoundAsync` also bumps `_updated_at` on an existing document.

Don't "fix" these silently: they change the public behaviour. Propose it, and document it in the readme "Upgrading" section if done.

## Publishing

Only on the maintainer's request.

1. Bump `version` in `package.json` **and** `claude-plugin/.claude-plugin/plugin.json` (same value; Claude Code uses it to detect plugin updates). Add the changes to the readme "Upgrading" section if needed.
2. `claude plugin validate ./claude-plugin && claude plugin validate .` if the plugin or the skill changed.
3. `npm run deploy`: builds the Docker image and runs `npm publish` inside it, with `~/.npmrc` mounted read-only.

Never write npm tokens or `.npmrc` contents into the image, the repo or a commit.
