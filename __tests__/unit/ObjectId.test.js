const { ObjectId } = require('../../src/index');

test("create an object ID with a valid string", () => {

    var string = "61485e21a7748c745342c4d3";

    var id = ObjectId.from(string);

    expect(id).toBeDefined();

})

test("create an object ID with a invalid string", () => {

    function throwOnBadId() {
        ObjectId.from("c745342c4d3")
    }

    expect(throwOnBadId).toThrowError();

})

test("objectId test", () => {
    expect(ObjectId.test("c745342c4d3")).toBeFalsy();
    expect(ObjectId.test("5ab4d7bd685042051beeb1d2")).toBeTruthy();
})
