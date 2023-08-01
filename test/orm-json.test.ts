import { Collection } from "../src/lib/collection";
import { OrmJson, createCollection } from "../src/lib/orm-json";
import { EcDbType, MetadataType } from "../src/type/ec_type";
import * as utilsFun from "../src/utils/utils.func";
import { convertToObject } from "../src/utils/utils.func";

const mockLoadData = jest.spyOn(utilsFun, "loadData");
const mockSaveData = jest.spyOn(utilsFun, "saveData");
// const mockIsExistFile = jest.spyOn(utilsFun, "isExistFile");

const path_db = "path/db.json";
const orm = new OrmJson(path_db);
const db: EcDbType = {
  user: [
    {
      fullname: "john smith",
      email: "john@example.com",
      age: 20,
    },
    {
      fullname: "crowly sm",
      email: "crowly@example.com",
      age: 25,
    },
  ],
  __metadata__: [
    {
      collectionName: "user",
      unique: ["email"],
    },
  ] as MetadataType<{ fullname: string; email: string; age: number }>[],
};

mockLoadData.mockResolvedValue(db);
mockSaveData.mockResolvedValue(void 0);

/***
 * getCollections
 * isExistCollection
 * testDatabase
 * pathDB
 *
 * createCollection
 * createCollections
 * removeCollection
 * collection
 * size
 */
describe("data base", () => {
  it("should return an array collection names", async () => {
    await expect(orm.getCollections()).resolves.toEqual(["user"]);
  });

  it("should return true if collection exists", async () => {
    await expect(orm.isExistCollection("user")).resolves.toBeTruthy();
  });

  it("should return false if collection doesn't exist", async () => {
    await expect(orm.isExistCollection("student")).resolves.toBeFalsy();
  });

  // it("should return true is database file exists", async () => {
  //   mockIsExistFile.mockResolvedValue(true);
  //   await expect(orm.testDatabase()).resolves.toBeTruthy();
  // });

  // it("should return false is database file doesn't exist", async () => {
  //   mockIsExistFile.mockResolvedValue(false);
  //   await expect(orm.testDatabase("db.json")).resolves.toBeFalsy();
  // });

  it("should return path of database", () => {
    const path = "root/db.json";
    const _orm = new OrmJson(path);
    expect(_orm.pathDB).toEqual(path);
  });

  it("should return a default path of database", () => {
    expect(orm.pathDB).toEqual(path_db);
  });

  it("should call loadData function once", async () => {
    expect(mockLoadData).toBeCalledTimes(1);
  });

  it("should return database size", async () => {
    const mockSizeFile = jest.spyOn(utilsFun, "sizeFile");
    mockSizeFile.mockResolvedValueOnce("1 KB");
    await expect(orm.size()).resolves.toBe("1 KB");
  });
});

describe("Collection", () => {
  beforeEach(() => {
    mockSaveData.mockClear();
    mockSaveData.mockImplementationOnce((path_id, data) =>
      Promise.resolve<any>(data)
    );
  });

  /**
   * REMOVING COLLECTION FROM DATABASE
   */

  const table1 = [
    {
      collections: "student1",
      expected: "student1",
    },
    { collections: "student", data: [], expected: undefined },
    { collections: "__metadata__", data: [], expected: undefined },
    { collections: "user", data: [], force: true, expected: "user" },
    {
      collections: ["student1", "student2"],
      expected: ["student1", "student2"],
    },
    {
      collections: ["student1", "student2", "student3"],
      expected: ["student1", "student3"],
    },
    {
      collections: ["student1", "student3"],
      data: ["student1", "student2", "student3"],
      expected: ["student1", "student3"],
    },
  ];
  it.each(structuredClone(table1))(
    "should return a correct db after removing collections",
    async ({ collections, expected, data, force }) => {
      if (!data) data = Array.isArray(expected) ? expected : [expected];
      const metadata = data.map((collectionName: string) => ({
        collectionName,
      }));

      const _db = structuredClone(db);
      convertToObject(data, _db);
      _db["__metadata__"].push(...metadata);

      mockLoadData.mockResolvedValue(structuredClone(_db));
      await expect(orm.removeCollection(collections, force)).resolves.toEqual(
        expected
      );
    }
  );

  it.each(structuredClone(table1))(
    "should remove collection from database",
    async ({ collections, expected, data, force }) => {
      if (!expected) return;
      if (!data) data = Array.isArray(expected) ? expected : [expected];
      const metadata = data.map((collectionName: string) => ({
        collectionName,
      }));

      const _db = structuredClone(db);
      convertToObject(data, _db);
      _db["__metadata__"].push(...metadata);

      const _data = data.filter((el) => {
        return Array.isArray(expected)
          ? !expected?.includes(el)
          : expected !== el;
      });

      const expectedDB =
        expected === "user" ? { __metadata__: [] } : structuredClone(db);
      convertToObject(_data, expectedDB);
      expectedDB["__metadata__"].push(
        ..._data.map((collectionName: string) => ({
          collectionName,
        }))
      );

      mockLoadData.mockResolvedValue(structuredClone(_db));
      await orm.removeCollection(collections, force);
      expect(mockSaveData).toHaveBeenNthCalledWith(1, path_db, expectedDB);
    }
  );

  it("should throw an error when removing collection which has items", async () => {
    await expect(orm.removeCollection("user")).rejects.toThrow();
  });

  const table2 = ["user", ["user", "student", "teacher"]];
  it.each(table2)(
    "should return undefined when removing collection from database which has no collection",
    async (collection) => {
      const expected = Array.isArray(collection) ? [] : undefined;
      mockLoadData.mockResolvedValue({});
      await expect(orm.removeCollection(collection)).resolves.toEqual(expected);
    }
  );

  /**
   * ADDING COLLECTION FROM DATABASE
   */

  const table3 = [
    {
      collections: "user",
      expected: "user",
      force: true,
      metadata: { collectionName: "user", unique: [] },
    },
    {
      collections: { name: "student", unique: ["email"] },
      expected: "student",
      metadata: { collectionName: "student", unique: [] },
    },
    {
      collections: ["user", "teacher", "teacher"],
      force: true,
      expected: ["user", "teacher"],
      metadata: [
        { collectionName: "user", unique: [] },
        { collectionName: "teacher", unique: [] },
      ],
    },
    { collections: [], expected: [] },
    {
      collections: [
        { name: "student", uniqueKeys: ["email", "name"] },
        { name: "student", uniqueKeys: ["email", "name"] },
        { name: "teacher", uniqueKeys: ["email"] },
        { name: "patient" },
      ],
      metadata: [
        { collectionName: "student", unique: ["email", "name"] },
        { collectionName: "teacher", unique: ["email"] },
        { collectionName: "patient", unique: [] },
      ],
      expected: ["student", "teacher", "patient"],
    },
  ];

  it.each(structuredClone(table3))(
    "should return the created collection",
    async ({ collections, expected, force }) => {
      const _db = structuredClone(db);
      mockLoadData.mockResolvedValue(_db);
      if (Array.isArray(collections))
        await expect(
          orm.createCollections(collections as string[], force)
        ).resolves.toEqual(expected);
      else
        await expect(
          orm.createCollection(collections as string, force)
        ).resolves.toEqual(expected);
    }
  );

  it.each(structuredClone(table3))(
    "should return a correct object after adding a new collection",
    async ({ collections, force, metadata, expected }) => {
      if (!metadata) return;
      const _db = structuredClone(db);
      const expectedObject = structuredClone(db);
      if (!Array.isArray(metadata)) (metadata as any) = [metadata];

      convertToObject(expected, expectedObject);
      if (
        expected === "user" ||
        (Array.isArray(expected) && (expected as string[]).includes("user"))
      )
        expectedObject["__metadata__"] = [];
      expectedObject["__metadata__"].push(...(metadata as any));

      mockLoadData.mockResolvedValue(_db);
      await orm.createCollection(collections as string, force);

      expect(mockSaveData).toHaveBeenNthCalledWith(1, path_db, expectedObject);
    }
  );

  const table4 = [undefined, "user", "__metadata__"];

  it.each(table4)(
    "should throw an error when creating collection",
    async (collection) => {
      const _db = structuredClone(db);
      mockLoadData.mockResolvedValue(_db);
      await expect(
        orm.createCollection(collection as string)
      ).rejects.toThrow();
    }
  );

  const table5 = ["user", ["user", "student", "teacher"]];
  it.each(table2)(
    "should return undefined when removing collection from database which has no collection",
    async (collection) => {
      const _collection = structuredClone(collection);
      if (!Array.isArray(collection)) collection = [collection];

      const metadata = collection.map((el) => ({
        collectionName: el,
        unique: [],
      }));
      const db = convertToObject(collection);
      db["__metadata__"] = metadata;

      mockLoadData.mockResolvedValue({});

      if (Array.isArray(_collection)) await orm.createCollections(_collection);
      else await orm.createCollection(_collection as string);

      expect(mockSaveData).toHaveBeenNthCalledWith(1, path_db, db);
    }
  );
});

/**
 * COLLECTION INSTANCE
 */

describe("creation collection", () => {
  it("should return a created collection", async () => {
    await expect(createCollection("collection1")).resolves.toBe("collection1");
  });

  it("should return a created collections", async () => {
    await expect(
      createCollection(["collection2", "collection3"])
    ).resolves.toEqual(["collection2", "collection3"]);
  });

  it("should create a new collection instance", async () => {
    mockLoadData.mockResolvedValue(db);
    await expect(orm.collection("user")).resolves.toBeInstanceOf(Collection);
  });
});
