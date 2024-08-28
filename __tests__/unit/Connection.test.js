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
