const { ObjectId } = require('mongodb');

module.exports = {
    
    from(string){
        if(!ObjectId.isValid(string)){
            throw new TypeError(`Invalid id: ${string}`)
        }
        return ObjectId(string);
    },

    test(string){
        return ObjectId.isValid(string)
    },
}