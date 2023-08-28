import { Document } from "../src/lib/document";
import * as createCollection from "../src/lib/snapjson";

/**
 * toObject
 * toJSON
 * save
 * delete
 */

const obj = {
  __id: 5,
  name: "test",
  age: 17,
};
const user = new Document<typeof obj>(obj, "db", "user") as Document<
  typeof obj
> &
  typeof obj;

const mockCreateCollection = jest.spyOn(createCollection, "defineCollection");
const mockUpdateOne = jest.fn((document) => document);
const mockDeleteOne = jest.fn((document) => document);

mockCreateCollection.mockResolvedValue({
  updateOne: mockUpdateOne,
  deleteOne: mockDeleteOne,
} as any);

describe("creating document", () => {
  it("should return properties of document", () => {
    expect(user.toObject()).toEqual(obj);
  });

  it("should return string representing properties of document", () => {
    expect(user.toJSON()).toEqual(JSON.stringify(obj));
  });

  it("should save document", async () => {
    user.age = 20;
    const { __id, ...expected } = user.toObject();
    await user.save();
    expect(mockUpdateOne).toHaveBeenNthCalledWith(1, { age: 20 }, { __id: 5 });
  });

  it("should delete document", async () => {
    await user.delete();
    expect(mockDeleteOne).toHaveBeenNthCalledWith(1, { __id: 5 });
  });
});
