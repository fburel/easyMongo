import  {describe, expect} from "vitest";
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connect, Register, Model}  from '../../src/index'
import { randomString }  from '../mock'
import { vi } from 'vitest'

describe("test connection and model availability", () => {
    let mongod;


    beforeAll(async () => {
        // create an instance of MongoDB in Memory
        mongod = await MongoMemoryServer.create();

        const uri = mongod.getUri();

        // get uri for that instance
        process.env.MONGO = uri;
    })

    afterAll(async () => {
        await mongod.stop();
    })

    it("should connect to database", async () => {

        expect.assertions(2)

        await Connect(model => {
            expect(model).toBeDefined();
            expect(model.isConnected).toBeTruthy();
        })
    })

    it("should make model available", async () => {

        expect.assertions(2)

        const testValue1  = randomString(10);
        Register(testValue1, Model("__TEST1__"));

        const testValue2  = randomString(10);
        Register(testValue2, Model("__TEST2__"));

        await Connect(model => {
            expect(model[testValue1]).toBeDefined();
            expect(model[testValue2]).toBeDefined();
        })
    })

    it("should make base method available", async () => {

        expect.assertions(17);

        const Table = randomString(5);
        const model = Model(Table);
        model.prototype.customfn = vi.fn();
        Register(Table, model);

        await Connect(model => {
            expect(model[Table].getByIdAsync).toBeDefined();
            expect(model[Table].findAllAsync).toBeDefined();
            expect(model[Table].findOneAsync).toBeDefined();
            expect(model[Table].getByPageAsync).toBeDefined();
            expect(model[Table].countAsync).toBeDefined();
            expect(model[Table].aggregateAsync).toBeDefined();

            expect(model[Table].replaceAsync).toBeDefined();
            expect(model[Table].updateByIdAsync).toBeDefined();
            expect(model[Table].updateManyAsync).toBeDefined();
            expect(model[Table].updateOneAsync).toBeDefined();
            expect(model[Table].setAsync).toBeDefined();

            expect(model[Table].upsertAsync).toBeDefined();
            expect(model[Table].saveAsync).toBeDefined();
            expect(model[Table].saveAllAsync).toBeDefined();
            expect(model[Table].insertIfNotFoundAsync).toBeDefined();

            expect(model[Table].deleteByIdAsync).toBeDefined();
            expect(model[Table].deleteAllAsync).toBeDefined();

        })
    })

    it("isConnected should ping the server", async () => {
        await Connect(async model => {
            await expect(model.isConnected()).resolves.toBe(true);
        })
    })

    it("errors thrown by the task should propagate and the task should run only once", async () => {
        const task = vi.fn(() => { throw new Error("boom"); });

        await expect(Connect(task)).rejects.toThrow("boom");
        expect(task).toHaveBeenCalledTimes(1);
    })

    it("missing MONGO env should call the task with an error", async () => {
        const saved = process.env.MONGO;
        delete process.env.MONGO;
        try {
            const task = vi.fn((model, err) => err);
            const err = await Connect(task);
            expect(task).toHaveBeenCalledTimes(1);
            expect(task.mock.calls[0][0]).toBeNull();
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toMatch(/MONGO/);
        } finally {
            process.env.MONGO = saved;
        }
    })

    it("concurrent connections should share the same client", async () => {
        const [a, b] = await Promise.all([
            Connect(m => m.driver.db.client),
            Connect(m => m.driver.db.client),
        ]);
        expect(a).toBe(b);
    })

    it("should reconnect after a connection closed with keepAlive = false", async () => {
        const first = await Connect(m => m.driver.db.client, false);
        const second = await Connect(async m => {
            expect(await m.isConnected()).toBe(true);
            return m.driver.db.client;
        });
        expect(second).not.toBe(first);
    })

    it("custom method should be make available", async () => {

        const Table = randomString(5);
        const model = Model(Table);
        model.prototype.customfn = vi.fn();
        Register(Table, model);

        expect.assertions(1);

        await Connect(model => {
            expect(model[Table].customfn).toBeDefined();
        })
    })
})
