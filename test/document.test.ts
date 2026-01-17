import { Document } from "../src/lib/document";
import * as shortcutFunc from "../src/utils/shortcutFunc";

/**
 * toObject
 * toJSON
 * save
 * delete
 */

const obj = {
  name: "test",
  age: 17,
  __id: 5,
};

const mockCreateCollection = jest.spyOn(shortcutFunc, "defineCollection");
const mockUpdateOne = jest.fn((document) => document);
const mockDeleteOne = jest.fn((document) => document);

mockCreateCollection.mockResolvedValue({
  updateOne: mockUpdateOne,
  deleteOne: mockDeleteOne,
} as any);

const user = new Document<typeof obj>(obj, "student", {
  path_db: "assd",
}) as Document<typeof obj> & typeof obj;

describe("creating document", () => {
  it("should return properties of document", () => {
    expect(user.toObject()).toEqual(obj);
  });

  it("should return string representing properties of document", () => {
    expect(user.toJSON()).toMatch(JSON.stringify(obj));
  });

  it("should save document", async () => {
    user.age = 20;
    const { __id, ...expected } = user.toObject();
    await user.save();

    expect(mockUpdateOne).toHaveBeenNthCalledWith(1, { age: 20 }, { __id: 5 });
  });

  it("should update document", () => {
    const data = { __id: 5, name: "test1", age: 25, email: "test1@gmail.com" };
    const mockSave = jest
      .spyOn(user as any, "save")
      .mockImplementation(() => {});

    expect(user.update(data)).toBeTruthy();
    expect(mockSave).not.toHaveBeenCalled();

    const { save, ...expected } = user.toObject() as any;
    expect(expected).toEqual({ __id: 5, name: "test1", age: 25 });
    mockSave.mockRestore();
  });

  it("should update document and save", () => {
    const mockSave = jest
      .spyOn(user as any, "save")
      .mockImplementation(() => {});

    expect(
      user.update({ __id: 10, name: "test1", age: 25 }, true)
    ).toBeTruthy();
    expect(mockSave).toHaveBeenCalled();

    expect(user.__id).not.toBe(10);
    mockSave.mockRestore();
  });

  it("should delete document", async () => {
    await user.delete();
    expect(mockDeleteOne).toHaveBeenNthCalledWith(1, { __id: 5 });
  });
});
