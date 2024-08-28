import {describe, vi} from "vitest";
import { Connect, Register, Model}  from '../src/index'
import {MongoMemoryServer} from "mongodb-memory-server";
import {randomString} from "./mock";


module.exports.describeWithMongo = async function (txt, holder) {

    let mongod

    describe(txt, async () => {

        // Register some table
        Register("products", Model("Products"));
        Register("posts",  Model("Posts"));

        // create an instance of MongoDB in Memory
        mongod = await MongoMemoryServer.create();
        process.env.MONGO = mongod.getUri();

        return Connect(mongo => {
            return holder(mongo);
        })
    });
}
