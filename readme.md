# EasyMongo

## Description

easyMongo helps you connect to your mongoDB instance and interact with your collections

## installation 

You can install this package with NPM
`npm install easyMongo --save`

## Usage

this package looks for a connection string in the MONGO environment variable. Before using, make sure to configure your working environment accordingly.

example with gulp :

``` javascript
gulp.task("default", function () {
  nodemon({
    script: "./bin/www",
    ext: "js",
    env: {
      PORT: 3000,
      MONGO:
        "mongodb+srv://..../myDatabase?retryWrites=true&w=majority",
    },
    ignore: ["./node_modules/**"],
  }).on("restart", function () {
    console.log("Restarting");
  });
});
```

