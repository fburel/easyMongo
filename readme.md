# EasyMongo

## Description

easyMongo helps you connect to your mongoDB instance and interact with your collections

## installation 

You can install this package with NPM
`npm install easyMongo --save`

## Configuration

### Set the connection string to the DB

this package looks for a connection string in the MONGO environment variable. 
Before using, make sure to configure your working environment accordingly.

``` shell
MONGO=mongodb+srv://..../myDatabase?retryWrites=true&w=majority
```

### Register you collections using Models

MyEasyMongo uses the principles of Models to encapsulate a mongoDB collection and the methods that can be use on it (CRUD, aggegation....);
Once you have created a model for your collection, it will be available as a property in the myeasymongo driver.
Registering a Model is easy,for example let's create a model for a `Post` collection:

```javascript

const { Model, Register } = require('myeasymongo');
const model = Model("Post"); // the table of the collection in MongoDB
Register("post", model); // Register the model with a unique identifier : i.e post. Once registered, the model will be available under the `post` property of the driver
```

> Note that the model is register with the `post` label. We will use this label later on to access this collection.

A Model comes with the usual CRUD methods : `saveAsync`, `saveAllAsync`, `getbyIdAsync`, `findOneAsync`, `findAllAsync`, `updateAsync`, `updateOneAsync`, `updateManyAsync`, `setAsync`, `deleteAsync`, `deleteAllAsync`... However you might want to add some methods of you own to a specific model.
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
````

Now the `user` model has 2 extra methods: `checkPassword` and `hash`.

### Pro tip : importing all your model at once

As your project grow, you might find that you have more and more collection, each with special need and custom method (i.e. aggregation helper).
I find it cleaner to have a folder containing all my model declaration, a js file per model, and to load them all early on in the project using a package like auto load to do so:

```javascript
require('auto-load')('./routes/model');
```

### Creating the database object (Express)

Now that your models have been declared an imported, you need to establish the connection to the db so you can get the myeasymongo driver and start performing request.
Using Express, I recommand implementing a middleware that will be called for each route needing acces to the DB.
The middleware will conect to the db and store the myeasymongo driver in the req object so subsequent method can access it directly.

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
````

Then add the middleware to the route that need access to the db. By doing so, your code can access the req.model object and perform db related tasks directly.

```javascript
const makeModel = require("./middleware/makeModel");

router.get('/posts', makeModel, function(req, res, next){
    const posts = await req.model.post.findAllAsync();
    res.json(posts);
});
```

### Creating the database object (alternate version)

Once your model file have been imported, you can use the Connect function to initiate a connection to the db.
The connect function takes a callback in wich you can play with the received driver.
the driver contains all your registered model.

```javascript

const { Connect } = require('myeasymongo');
require('auto-load')('./model');

await Connect(async function (mongo) {

    try{
        await mongo.post.updateAllAsync({
            categorie : { $exists : false}
        }, {
            $set : {
                categorie : 'default'
            }
        })
    } catch (e) {
        console.log('error');
        console.log(e);
    }
});
```

## API

### creating an object id form a string

Parfois necessaire pour des aggregations:

```javascript
const { ObjectId } = require('myeasymongo');
const id = ObjectId("618a05bea5e689590685043c");
```

### CRUD

utiliser le label associer a votre model pour invoquer les fonctions. Toutes les fonction retourne sont awaitable.
When fetching object, the _id field is automaticly rewrote to a string instead of a bson object so it's easier to manipulate

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
