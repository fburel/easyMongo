const {toObjectId, Connect, Register, Model} = require('./index');

jest.setTimeout("10000")

process.env.MONGO = "mongodb+srv://everybody:1234@cluster0.ngs8m.mongodb.net/main?retryWrites=true&w=majority";

Register("posts", Model("__TEST"));

beforeEach(() => {
    return Connect(mongo => {
        mongo.posts.deleteAllAsync();
    })
  });

test("model", (done) => {
    Connect(mongo => {
        expect(mongo.posts).toBeDefined();
        done();
    }).catch(done)
})

test("model", (done) => {
    Connect(async mongo => {
        const lookup = await mongo.posts.findOneAsync({ author : 'Gils'});
        expect(lookup).toBeNull();
        done();
    }).catch(done)
})



