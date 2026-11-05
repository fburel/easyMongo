import { describe, expect, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Connect, Configure, Disconnect, Register, Model } from "../../src/index";
import { randomString } from "../mock";

describe("Configure, Disconnect, indexes and pagination with total", () => {
    let mongod;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        process.env.MONGO = mongod.getUri();
    })

    afterEach(async () => {
        Configure({});
        await Disconnect();
    })

    afterAll(async () => {
        await mongod.stop();
    })

    describe("Configure", () => {

        it("should use the uri given to Configure over the MONGO env", async () => {
            const saved = process.env.MONGO;
            delete process.env.MONGO;
            try {
                Configure({ uri: mongod.getUri() });
                const ok = await Connect(m => m.isConnected());
                expect(ok).toBe(true);
            } finally {
                process.env.MONGO = saved;
            }
        })

        it("should use the configured database name", async () => {
            const dbName = "db_" + randomString(6);
            Configure({ dbName });
            const name = await Connect(m => m.driver.db.databaseName);
            expect(name).toBe(dbName);
        })

        it("should pass clientOptions to the MongoClient", async () => {
            Configure({ clientOptions: { maxPoolSize: 3 } });
            const poolSize = await Connect(m => m.driver.db.client.options.maxPoolSize);
            expect(poolSize).toBe(3);
        })

        it("should replace the previous configuration", async () => {
            Configure({ dbName: "first" });
            Configure({});
            const name = await Connect(m => m.driver.db.databaseName);
            expect(name).not.toBe("first");
        })
    })

    describe("Disconnect", () => {

        it("should close the open connections and allow reconnecting", async () => {
            const first = await Connect(m => m.driver.db.client);
            await Disconnect();

            const second = await Connect(async m => {
                expect(await m.isConnected()).toBe(true);
                return m.driver.db.client;
            });
            expect(second).not.toBe(first);
        })

        it("should not fail when nothing is connected", async () => {
            await Disconnect();
            await expect(Disconnect()).resolves.toBeUndefined();
        })
    })

    describe("indexes", () => {

        it("should expose the collection name and indexes on the model", () => {
            const indexes = [{ key: { email: 1 }, unique: true }];
            const model = Model("Users", { indexes });
            expect(model.collectionName).toBe("Users");
            expect(model.indexes).toEqual(indexes);
            expect(Model("Other").indexes).toEqual([]);
        })

        it("should create the declared indexes on connect", async () => {
            const Table = "T_" + randomString(6);
            const name = randomString(8);
            Register(name, Model(Table, { indexes: [{ key: { email: 1 }, unique: true, name: "email_unique" }] }));

            const indexes = await Connect(m => m.driver.db.collection(Table).indexes());
            const email = indexes.find(i => i.name === "email_unique");
            expect(email).toBeDefined();
            expect(email.unique).toBe(true);

            await Connect(async m => {
                await m[name].saveAsync({ email: "a@b.c" });
                await expect(m[name].saveAsync({ email: "a@b.c" })).rejects.toThrow(/duplicate key/);
            });
        })

        it("should create the indexes only once per connection", async () => {
            const Table = "T_" + randomString(6);
            Register(randomString(8), Model(Table, { indexes: [{ key: { a: 1 } }] }));

            const spy = await Connect(m => vi.spyOn(Object.getPrototypeOf(m.driver.db.collection(Table)), "createIndexes"));
            await Connect(() => {});
            await Connect(() => {});
            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        })

        it("should report index creation errors to the task", async () => {
            const Table = "T_" + randomString(6);
            const name = randomString(8);

            // duplicated data prevents the unique index from being built
            await Connect(m => m.driver.db.collection(Table).insertMany([{ k: 1 }, { k: 1 }]));

            Register(name, Model(Table, { indexes: [{ key: { k: 1 }, unique: true }] }));
            const task = vi.fn((m, err) => err);
            const err = await Connect(task);
            expect(task.mock.calls[0][0]).toBeNull();
            expect(err.message).toMatch(/duplicate key/);

            // once the data is fixed, the next Connect retries and succeeds
            const { MongoClient } = await import("mongodb");
            const client = await MongoClient.connect(mongod.getUri());
            await client.db().collection(Table).deleteOne({ k: 1 });
            await client.close();

            const ok = await Connect((m, e) => e === undefined && m[name] !== undefined);
            expect(ok).toBe(true);
        })
    })

    describe("fetchPageAsync withTotal", () => {

        it("should return total and pageCount", async () => {
            const name = randomString(8);
            Register(name, Model("T_" + randomString(6)));

            await Connect(async m => {
                await m[name].saveAllAsync([1, 2, 3, 4, 5].map(n => ({ n })));

                const page = await m[name].fetchPageAsync({ n : { $gte : 2 } }, { n : 1 }, null, 2, 3, { withTotal : true });

                expect(page.total).toBe(4);
                expect(page.pageCount).toBe(2);
                expect(page.size).toBe(1);
                expect(page.items.map(x => x.n)).toEqual([5]);
                expect(typeof page.items[0]._id).toBe("string");
            });
        })

        it("should return an empty page with a total of 0", async () => {
            const name = randomString(8);
            Register(name, Model("T_" + randomString(6)));

            const page = await Connect(m => m[name].fetchPageAsync({}, {}, null, 1, 10, { withTotal : true }));
            expect(page).toEqual({ size : 0, items : [], total : 0, pageCount : 0 });
        })
    })
})
