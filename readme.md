# MyEasyMongo

## Description

`myeasymongo` helps you connect to your mongoDB instance and interact with your collections

## installation 

You can install this package with NPM
`npm install myeasymongo --save`

## Usage

### Set the connection string to the DB

this package looks for a connection string in the MONGO environment variable. 
Before using, make sure to configure your working environment accordingly.

``` shell
MONGO=mongodb+srv://<user>:<pwd>@<cluster_ip>/<database>?retryWrites=true&w=majority
```

### Register you collections using Models

MyEasyMongo uses the principles of Models to encapsulate a mongoDB collection and the methods that can be use on it (CRUD, aggegation....);
Once you have created a model for your collection, it will be available as a property in the myeasymongo driver.
Registering a Model is easy,for example let's create a model for a `Post` collection:

```javascript

const { Model, Register } = require('myeasymongo');
const model = Model("Post"); // the table of the collection in MongoDB
Register("posts", model); // Register the model with a unique identifier : i.e posts. Once registered, the model will be available under the `posts` property of the driver
```

> Note that the model is register with the `posts` label. We will use this label later on to access this collection.

### Add capabilities to a model

A Model comes with the usual CRUD methods : `getbyIdAsync`, `findAllAsync`, `findOneAsync`, `getByPageAsync`, `saveAsync`, `saveAllAsync`, `deleteByIdAsync`, `deleteAllAsync`, `replaceAsync`, `updateByIdAsync`, `updateManyAsync`, `updateOneAsync`, `insertIfNotFoundAsync`, `upsertAsync`, `setAsync`,   `countAsync`, `aggregateAsync` ... 

However you might want to add some methods of you own to a specific model.
You can do so by adding method to the model object before registering it.
In this example we had the bcrypt capability to our user model :

```javascript
const Table = "Users";

const { Model, Register } = require('myeasymongo');

const model = Model(Table);


/***************
 * EXTRAS
 ****************/

const bcrypt = require('bcryptjs');

model.prototype.checkPassword = function (user, password) {

  return new Promise(function (resolve, reject) {

    bcrypt.compare(password, user.password, function (err, results) {
      if(err){
        reject(err);
      } else if(results) {
        resolve(user);
      } else {
        reject(new Error("401"));
      }
    });
  });
}

// encrypt the password
model.prototype.hash = function (password) {
  return new Promise(function (resolve, reject) {
    bcrypt.hash(password, 14, function (err, hash) {
      if(err) reject(err);
      else resolve(hash);
    })
  });
}

Register('user', model);
```

Now the `user` model has 2 extra methods: `checkPassword` and `hash`.

### Connecting and Accessing the model

In order to use your model and actually start coding database stuff, you need to use the Connect function to initiate a connection to the db.
The connect function takes a callback in wich you can play with the received driver.
the driver contains all your registered model.

```javascript

const { Connect } = require('myeasymongo');

// import your model files
require('./model/posts');
require('./model/users')

await Connect(async function (mongo) {

    try{
        await mongo.posts.saveAsync({
          title : "Lorem Ipsum",
          author : 'John Doe',
          content : 'TBD'
        });
    } catch (e) {
        console.log('error');
        console.log(e);
    }
});
```

### Pro tip : importing all your model at once

As your project grow, you might find that you have more and more collection, each with special need and custom method (i.e. aggregation helper).
I find it cleaner to have a folder containing all my model declaration, a js file per model, and to load them all early on in the project using a package like auto load to do so. For instance, in the previous code, the lines :
``` javascript
require('./model/posts');
require('./model/users')
```
could be replaced by :

```javascript
require('auto-load')('./routes/model');
```

A small win when only 2 model files exist, but a life saver as you add more of them and don't have to think about importing them.

### Creating an Express middleware

For those times when you create an api, you have to handle some routes, and some of them needs a running connection to your mongoDB instance. I admit I find it painfull to have to call the `Connect` method in every endpoint handler so I came up with a middleware that will, beforehand, to the Connect thingy and pass the mongo instance down the middleware line.

Let's create a `makeModel.js` file

> Note that this package uses a 'smart connection' mechanism as per recommanded by mongo, meaning that calling connect several times does not necessarly means establishing a new connection each time. If a previous connection exist and is still valid, it will be reused. Hence, calling this method on each route isn't time consuming.

```javascript
const { Connect } = require('myeasymongo');

/// load the model classes
require('auto-load')('./routes/model');

module.exports = async function(req, res, next) {
  try {
    await Connect(async function(driver) {

      // put the database driver in the req object
      req.model = driver

      await next();
    });
  } catch (e) {
    next(e);
  }
};
```

Then add the middleware to the routes handler that need access to the db. By doing so, your code can access the req.model object and perform db related tasks directly.

```javascript
const makeModel = require("./middleware/makeModel");

router.get('/posts', makeModel, function(req, res, next){
    const posts = await req.model.post.findAllAsync({});
    res.json(posts);
});
```

### Testing with JEST

I can be usefull when testing your own code to access the uderneath database to check if the data retrieved or save is what it should be.
When using the jest testing tool, you can create your custom `testWithMongo` method that will connect to the DB and deliver the mongo driver with the loaded model before running your actual test:

``` javascript

const { Connect } = require('myeasymongo');
require('auto-load')('./src/model');

const testWithMongo = function(txt, handler){
    // overrides the jest test method
    test(txt, async () => {
        // Make sure your process.env.MONGO is set to target the correct database.
        // if you need to, you can override the connection string for the tests by providing a setup.js file to the jest command line or override it directly here
        // process.env.MONGO = <connection string to the test database>
        await Connect(mongo => {
            return handler(mongo);
        })
    })
}

testWithMongo("Models should be imported in the mongo object", async (mongo) => {
    expect(mongo.posts).toBeDefined();
    expect(mongo.users).toBeDefined();
})


```


## API

### creating an object id form a string

_id fields are, as often as possible, treated as string. That means that in methods such as `doSomethingByIdAsync` or `setAsync`, the `_id` value is expected to be a `string`, the conversion of that `string` to a `MongoDB.ObjectId` happens behind the curtain. Hoewever, sometimes, while writing aggregation pipelines mainly, you might need to write a proper `ObjectId` value. `myeasymongo` comes with the tool for the job:

```javascript
const { ObjectId } = require('myeasymongo');
const id = ObjectId("618a05bea5e689590685043c");
```

### CRUD

When fetching object, the `_id` field is automaticly rewrote to a `string` so it's easier to manipulate :

```javascript
// find by id (id is given as a string)
const post = await mongo.post.getByIdAsync("618a05bea5e689590685043c");
```

```javascript
// find all post 
const post = await mongo.post.findAllAsync();
```

```javascript
// find all post matching criteria
const post = await mongo.post.findAllAsync({
  _created_at : { $gt : ISODate('2022-01-01')}
});
```

```javascript
// Sometimes you just want to know how many documents match a query
const count = await mongo.post.countAsync({
  _created_at : { $gt : ISODate('2022-01-01')}
});
```

```javascript
// For large collection, a pagination system has been set up
const post = await mongo.post.getByPageAsync(
  1, // the page you want
  20, // the number of item per page, default = 50
  {
    _created_at : { $gt : ISODate('2022-01-01')}
  }, // a match criteria, default {}
  { _updated_at: 1 } // sortOrder, default = { _updated_at: -1 }
);
```

```javascript
// find one post only
const post = await mongo.post.findAllAsync({
  _created_at : { $gt : ISODate('2022-01-01')}
});
```

```javascript
// save
// Note that saving an object will had _created_at and _updated_at fields
const post = await mongo.post.saveAsync({
  author : 'Mark',
  title : 'Welcome to the MetaVerse',
  content: 'You\'ve been fooled!'
});

console.log(post)
/*
{
  _id : '......'
  author : 'Mark',
  title : 'Welcome to the MetaVerse',
  content: 'You\'ve been fooled!'
  _updated_at : 2022-01-01T00:00:00.000 
  _created_at : 2022-01-01T00:00:00.000 
}
*/
```

```javascript
// save
// will return a list of isds as strings
const post = await mongo.post.saveAll({
  author : 'Mark',
  title : 'Welcome to the MetaVerse',
  content: 'You\'ve been fooled!'
}, {
  author : 'Flo',
  title : 'All Apologies',
  content: 'to meta fans, it was not cool'
});

console.log(post)
/*
["...", "..."]
*/
```

```javascript
// update a whole object
const post = await mongo.post.getByIdAsync("618a05bea5e689590685043c");
post.content = '....';
await mongo.post.updateAsync(post);
```

```javascript
// an helper method to set a value (the update is done in one shot instead of first fetchin, then writing)
const post = await mongo.post.setAsync("618a05bea5e689590685043c", {
  content: '....'
})
```

```javascript
// delete follow the same principles

await mongo.post.deleteAsync("618a05bea5e689590685043c");

await mongo.post.deleteAllAsync({author : 'Mark'});

```

Upsert can be used to update a document and, if no document match the query, then create one.
There is 2 ways to use upsert with myeasymongo :


```javascript
// insert a whole new doc, if none match the query. Existing doc if any won't be updated.

await mongo.post.insertIfNotFoundAsync({
  email : 'johndoe@myeasymongo.com'
} , {
  email : 'johndoe@myeasymongo.com',
  firstName : 'John'
  lastName : 'Doe',
  job : 'Tech Evangelist'
});

```

```javascript
// when using upsert async you can pass a full mongo updater object. If a document match the query, it will be updated accordingly, if not a new empty document will be created and the updater will be apply to it.

await mongo.post.upsertAsync({
  email : 'johndoe@myeasymongo.com'
} , {
  $set : {
    email : 'johndoe@myeasymongo.com',
    firstName : 'John'
    lastName : 'Doe',
    job : 'Tech Evangelist'
  },
  $unset : {
    profilePicture: ''
  },
  $addToSet {
    achievements : "Employee of the year"
  }
});

```

### Aggregation

Performing aggregation query comes in handy very quickly has your project grows...
MyEasyMongo let you call your own aggregation pipeline, with the mongo syntax, directly to the model.

Usualy, I put my aggregation directly in my model file, has this:

```javascript

// return 4 product ref that can interreste a customer buying the given ref base on gloabal customer purchase (you might also like ...)
model.prototype.getBestMatchAsync = function (sku) {
  const pipeline = [
    {
      '$match': {
        'status': {$ne : 'CANCELLED'}, // exclude cancel orders
        'products.sku': sku, // order containing this product
        'products.1': { $exists: true }, // more than 1 sku in order
      },
    },
    // group by skus
    {
      '$unwind': {
        'path': '$products'
      }
    }, {
      '$group': {
        '_id': '$products.sku',
        'count': {
          '$sum': 1
        }
      }
    },


    // sort by count, exclude the looked up sku, limit to 4 results
    {
      '$sort': {
        'count': -1
      }
    }, {
      '$match': {
        '_id': {
          '$ne': ean
        }
      }
    }, {
      '$limit': 4
    },   
  ];
  return this.driver.aggregateAsync(Table, pipeline);
}
```
