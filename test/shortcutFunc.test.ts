import {
  defineCollection,
  createCollection,
  removeCollection,
  defineDocument,
} from "../src/utils/shortcutFunc";
import { SnapJson } from "../src/lib/snapjson";
import { Document } from "../src/lib/document";

const collection = jest.fn();
const createCollectionMock = jest.fn();
const createCollectionsMock = jest.fn();
const removeCollectionMock = jest.fn();
jest.mock("../src/lib/snapjson", () => ({
  SnapJson: jest.fn().mockImplementation(() => ({
    collection,
    removeCollection: removeCollectionMock,
    createCollection: createCollectionMock,
    createCollections: createCollectionsMock,
  })),
}));

const snapjson = new SnapJson();
describe("helper function", () => {
  it("should call collection method of snapjson with correct args", () => {
    defineCollection("user");
    expect(collection).toHaveBeenCalledWith("user", undefined);
  });

  it("should call createCollection method of snapjson with correct args", () => {
    createCollection("user", { force: true });
    createCollection(["user"], { force: false });

    expect(createCollectionMock).toHaveBeenCalledWith("user", true);
    expect(createCollectionsMock).toHaveBeenCalledWith(["user"], false);
  });

  it("should call removeCollection method of snapjson with correct args", () => {
    removeCollection("user", { force: true });
    removeCollection("user", { force: false });
    removeCollection(["user"]);
    expect(removeCollectionMock).toHaveBeenNthCalledWith(1, "user", true);
    expect(removeCollectionMock).toHaveBeenNthCalledWith(2, "user", false);
    expect(removeCollectionMock).toHaveBeenNthCalledWith(
      3,
      ["user"],
      undefined
    );
  });

  it("should return a data in a format of document", () => {
    const documents = defineDocument([{ __id: 1, name: "smith" }], "student", {
      path_db: "db",
      encrypted: false,
      mode: "dev",
      splitFile: true,
    });

    expect((documents as any)[0]).toBeInstanceOf(Document);
  });
});
