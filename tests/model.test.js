const {ObjectId, Connect, Register, Model} = require('../index');

jest.setTimeout("10000")

process.env.MONGO = "mongodb+srv://everybody:1234@cluster0.ngs8m.mongodb.net/main?retryWrites=true&w=majority";

Register("posts", Model("__TEST"));

test("model", async () => {
    await Connect(mongo => {
        expect(mongo.posts).toBeDefined();
    })
})

test("save in db", async() => {
    await Connect(async mongo => {
        const post = await mongo.posts.saveAsync({
            title : "My easy mongo"
        });
        expect(post).toBeDefined();
        expect(post._id).toBeDefined();
        expect(post.title).toMatch(/^My easy mongo$/);
    })
})

test("findById After save", async () => {
    await Connect(async mongo => {
        const saved = await mongo.posts.saveAsync({
            title : "Node.js is awesome"
        });

        const post = await mongo.posts.getByIdAsync(saved._id);

        expect(post).toBeDefined();
        expect(post.title).toMatch(/^Node.js is awesome$/);
    })
})

test("findOne", async () => {
    await Connect(async mongo => {
        const saved = await mongo.posts.saveAsync({
            title : "Node.js is awesome",
            author: 'flo'
        });

        const post = await mongo.posts.findOneAsync({ author : "flo"});

        expect(post).toBeDefined();
        expect(post._id).toBeDefined();
        expect(post.author).toMatch(/^flo$/);
    })
})

test("Delete All", async () => {
    await Connect(async mongo => {

        const saved = await mongo.posts.saveAsync({
            title : "Node.js is awesome"
        });
        const before = await mongo.posts.findAllAsync();
        expect(before.length).toBeGreaterThanOrEqual(1);

        await mongo.posts.deleteAllAsync();
        const after =  await mongo.posts.findAllAsync();
        expect(after.length).toEqual(0);
    })
})

test("Save Many", async () => {
    await Connect(async mongo => {

        // db is empty
        await mongo.posts.deleteAllAsync();
       
        const saved = await mongo.posts.saveAllAsync([
            { title : "Hendrerit ridiculus primis dignissim lectus volutpat facilisis" },
            { title : "Ultricies interdum cursus egestas molestie pharetra non" },
            { title : "Mattis condimentum ultricies luctus class praesent curabitur" },
        ]);

        expect(saved).toBeTruthy();

        const array = await mongo.posts.findAllAsync();
        expect(array).toBeDefined();
        expect(array.length).toEqual(3);
    })
})

test("Updates", async () => {
    await Connect(async mongo => {

        const post = await mongo.posts.saveAsync({
            author : "flo",
            title : "Dignissim tortor tempus quam diam placerat vitae"
        });

        const _id = post._id;

        post.status = "updated";

        await mongo.posts.replaceAsync(post);
        const test1 = await mongo.posts.getByIdAsync(_id);
        expect(test1.status).toMatch(/^updated$/);
        expect(test1.author).toMatch(/^flo$/);

        await mongo.posts.setAsync(_id, { status : "reset"});
        const test2 = await mongo.posts.getByIdAsync(_id);
        expect(test2.status).toMatch(/^reset$/);
        expect(test2.author).toMatch(/^flo$/);

    
        await mongo.posts.updateByIdAsync(_id, { 
            $unset : { status : 0 },
            $set : { author : "fl0"}
        });
        const test3 = await mongo.posts.getByIdAsync(_id);
        expect(test3.status).toBeUndefined();
        expect(test3.author).toMatch(/^fl0$/);

        await mongo.posts.updateManyAsync({
            author : {$exists : true}
        }, { 
            $unset : { author : 0 },
        });

        const test4 = await mongo.posts.getByIdAsync(_id);
        expect(test4.author).toBeUndefined();
    })
})

test("aggregate", async () => {
    await Connect(async mongo => {

        // db is empty
        await mongo.posts.deleteAllAsync();
       
        const saved = await mongo.posts.saveAllAsync([
            { title : "Hendrerit ridiculus primis dignissim lectus volutpat facilisis", author: 'flo' },
            { title : "Ultricies interdum cursus egestas molestie pharetra non", author: 'flo' },
            { title : "Mattis condimentum ultricies luctus class praesent curabitur", author: 'gils' },
        ]);


        const results = await mongo.posts.aggregateAsync([
            {
                $match : {
                    author : 'flo'
                }
            },
            {
                $group: {
                    _id : '$author',
                    sum : {
                        $sum : 1
                    }
                }
            }
        ])
        expect(results.length).toEqual(1);
        expect(results[0]._id).toMatch(/^flo$/);
        expect(results[0].sum).toEqual(2);
    })
})

test("Delete by ID", async () => {
    await Connect(async mongo => {

        const saved = await mongo.posts.saveAsync({
            title : "Node.js is awesome"
        });
        const before = await mongo.posts.getByIdAsync(saved._id);
        expect(before).toBeDefined();

        await mongo.posts.deleteByIdAsync(saved._id);
        const after =  await mongo.posts.getByIdAsync(saved._id);
        expect(after).toBeNull();
    })
})

test("count", async () => {
    await Connect(async mongo => {

        await mongo.posts.deleteAllAsync();
        
        await mongo.posts.saveAsync({
            title : "I can count"
        });

        const before = await mongo.posts.countAsync({
            title : "I can count"
        });

        expect(before).toEqual(1);

        await mongo.posts.saveAsync({
            title : "I can count"
        });

        const after = await mongo.posts.countAsync({
            title : "I can count"
        });

        expect(after).toEqual(2);
    })
})

test("find and project", async () => {
    await Connect(async mongo => {

        // db is empty
        await mongo.posts.deleteAllAsync();
       
        await mongo.posts.saveAllAsync([
            { title : "Hendrerit ridiculus primis dignissim lectus volutpat facilisis", author : "James Dee Cox", tags : ["one", "two", "three"], rating : 3 },
            { title : "Ultricies interdum cursus egestas molestie pharetra non", author : "James Dee Cox" , tags : ["one"], rating : 1},
            { title : "Mattis condimentum ultricies luctus class praesent curabitur", author : "John Appleseed", tags : ["three", "four"], rating : 2 },
            { title : "Et vita salute proximorum velut.", author : "John Appleseed", tags : ["three", "four"], rating : 4 },
            { title : "Decernendis suspicione sic alia perpetuae.", author : "Tony Mounti", tags : [], rating : 5 },
            { title : "Narrare professione me quod cadaveribus.", author : "Fred Consy", tags : ['one', 'six'], rating : 1 },
            { title : "Montis ad uberi navigabile Isauria.", author : "James Dee Cox", tags : ['seven'], rating : 5 },
        ]);

        let results = await mongo.posts.findAllAsync({ author : "James Dee Cox" }, { _id: 0, author : 1});

        expect(results.length).toEqual(3);

        results.forEach(x => {
            expect(x.author).toBeDefined();
            expect(x.title).toBeUndefined();
            expect(x.tags).toBeUndefined();
        })

        results = await mongo.posts.findAllAsync({ author : "James Dee Cox" }, {}, {rating : -1}, 0, 1);

        expect(results.length).toEqual(1);
        results.forEach(x => {
            expect(x.rating).toEqual(5);
        })
    })
})

test("projection in findOne", async () => {
    await Connect(async mongo => {

        // db is empty
        await mongo.posts.deleteAllAsync();
       
        await mongo.posts.saveAllAsync([
            { title : "Hendrerit ridiculus primis dignissim lectus volutpat facilisis", author : "James Dee Cox", tags : ["one", "two", "three"], rating : 3 },
            { title : "Ultricies interdum cursus egestas molestie pharetra non", author : "James Dee Cox" , tags : ["one"], rating : 1},
            { title : "Mattis condimentum ultricies luctus class praesent curabitur", author : "John Appleseed", tags : ["three", "four"], rating : 2 },
            { title : "Et vita salute proximorum velut.", author : "John Appleseed", tags : ["three", "four"], rating : 4 },
            { title : "Decernendis suspicione sic alia perpetuae.", author : "Tony Mounti", tags : [], rating : 5 },
            { title : "Narrare professione me quod cadaveribus.", author : "Fred Consy", tags : ['one', 'six'], rating : 1 },
            { title : "Montis ad uberi navigabile Isauria.", author : "James Dee Cox", tags : ['seven'], rating : 5 },
        ]);

        let results = await mongo.posts.findOneAsync({author : "James Dee Cox"}, {rating : -1}, {_id: 0, title : 1});

        expect(results._id).toBeUndefined();
        expect(results.author).toBeUndefined();
        expect(results.rating).toBeUndefined();
        expect(results.title).toEqual('Montis ad uberi navigabile Isauria.');
        
        const saved = await mongo.posts.saveAsync({ 
            title : "Hello world", 
            author : "Florian BUREL", 
            tags : ['test'], 
            content : 'Lorem ipsum',
            rating : 1 
        },);

        const post = await mongo.posts.getByIdAsync(saved._id, {_id: 0, content : 1});

       

        expect(post._id).toBeUndefined();
        expect(post.author).toBeUndefined();
        expect(post.rating).toBeUndefined();
        expect(post.title).toBeUndefined();
        expect(post.content).toEqual('Lorem ipsum');

    })
})

test("upsert with an existing document", async () => {
    await Connect(async mongo => {

        // db is empty
        await mongo.posts.deleteAllAsync();
       
        // create a post
        const doc = { 
            title : "Et vita salute proximorum velut.", 
            author : "John Appleseed", 
            tags : ["three", "four"], 
            rating : 5 
        };

        await mongo.posts.saveAsync(doc);

        // there should be 1 record in the db
        let count = await mongo.posts.countAsync();
        expect(count).toEqual(1);
        

        const updatedDoc = { 
            title : "Et vita salute proximorum velut.", 
            author : "John Appleseed", 
            tags : ["three", "four"], 
            rating : 5 
        };

        // try to insert the doc if it doesnt exist
        await mongo.posts.upsertAsync({
            title : updatedDoc.title
        }, {
            $set : updatedDoc
        });

        count = await mongo.posts.countAsync();
        let post = await mongo.posts.findOneAsync({title : updatedDoc.title});

        expect(count).toEqual(1); // number of doc should still be one
        expect(post.rating).toEqual(5); // the doc should be updated


    })
})


test("upsert with non existing document", async () => {
    await Connect(async mongo => {

        // db is empty
        await mongo.posts.deleteAllAsync();

        // there should be 0 record in the db
        let count = await mongo.posts.countAsync();
        expect(count).toEqual(0);
        
        const updatedDoc = { 
            title : "Et vita salute proximorum velut.", 
            author : "John Appleseed", 
            tags : ["three", "four"], 
            rating : 5 
        };

        await mongo.posts.upsertAsync({
            title : updatedDoc.title
        }, {
            $set : updatedDoc
        });

        // the doc should bhave been created
        let post = await mongo.posts.findOneAsync({title : updatedDoc.title});

        expect(post).toBeDefined();
        expect(post.rating).toEqual(5);


    })
})


test("create if not exist should insert when not exist", async () => {
    await Connect(async mongo => {

        // db is empty
        await mongo.posts.deleteAllAsync();

        // there should be 0 record in the db
        let count = await mongo.posts.countAsync();
        expect(count).toEqual(0);
        
        const docToInsert = { 
            title : "Et vita salute proximorum velut.", 
            author : "John Appleseed", 
            tags : ["three", "four"], 
            rating : 5 
        };

        await mongo.posts.insertIfNotFoundAsync({
            title : docToInsert.title
        }, docToInsert);

        // the doc should bhave been created
        let post = await mongo.posts.findOneAsync({title : docToInsert.title});

        expect(post).toBeDefined();
        expect(post.rating).toEqual(docToInsert.rating);
        expect(post.title).toEqual(docToInsert.title);
        expect(post.author).toEqual(docToInsert.author);
        expect(post.tags).toEqual(docToInsert.tags);

    })
})
