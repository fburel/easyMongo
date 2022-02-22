const {toObjectId, Connect, Register, Model} = require('./index');


jest.setTimeout("10000")
process.env.MONGO = "mongodb+srv://everybody:1234@cluster0.ngs8m.mongodb.net/main?retryWrites=true&w=majority";


test("connection", (done) => {
    Connect(mongo => {
        expect(mongo).toBeDefined();
        done();
    })
})


test("model", (done) => {
    Register("posts", Model("Post"));
    Connect(mongo => {
        expect(mongo.posts).toBeDefined();
        done();
    })
})

test("save", (done) => {
    Register("posts", Model("Post"));
    try {
        Connect(async mongo => {
            const post = await mongo.posts.saveAsync({
                author : 'Mark',
                title : 'Welcome to the MetaVerse',
                content: 'You\'ve been fooled!'
              });
    
            expect(post._id).toBeDefined();
            expect(post.author).toBe('Mark');
            expect(post.title).toBe('Welcome to the MetaVerse');
            expect(post.content).toBeDefined();
            expect(post._created_at).toBeDefined();
            expect(post._updated_at).toBeDefined();
    
            done();
        })
    } catch(e){
        console.log(e);
        expect(e).toBe(null);
        done();
    }
   
})

test("save", (done) => {
    Register("posts", Model("Post"));
    try {
        Connect(async mongo => {
            
            const post = await mongo.posts.saveAsync({
                author : 'Mark',
                title : 'Welcome to the MetaVerse',
                content: 'You\'ve been fooled!'
              });
    
            expect(post._id).toBeDefined();
            expect(post.author).toBe('Mark');
            expect(post.title).toBe('Welcome to the MetaVerse');
            expect(post.content).toBeDefined();
            expect(post._created_at).toBeDefined();
            expect(post._updated_at).toBeDefined();
    
            done();
        })
    } catch(e){
        console.log(e);
        expect(e).toBe(null);
        done();
    }
   
})