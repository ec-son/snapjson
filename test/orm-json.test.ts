import { Collection } from "../src/lib/collection";
import {
  SnapJson,
  createCollection,
  defineCollection,
  removeCollection,
} from "../src/lib/snapjson";
import { DataBaseType, MetadataType } from "../src/types/orm.type";
import * as utilsFun from "../src/utils/utils.func";
import { convertToObject } from "../src/utils/utils.func";

const mockLoadData = jest.spyOn(utilsFun, "loadData");
const mockSaveData = jest.spyOn(utilsFun, "saveData");

const path_db = "path/db.json";
const orm = new SnapJson(path_db);
const db: DataBaseType = {
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
 * createCollection helper
 * createCollections
 * removeCollection
 * removeCollection helper
 * collection
 * defineCollection helper
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

  it("should return path of database", () => {
    const path = "root/db.json";
    const _orm = new SnapJson(path);
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
   * DEFINING COLLECTION
   */

  it("should create a new collection instance", async () => {
    const expected = new Collection("user", path_db);
    await expect(orm.collection("user")).resolves.toEqual(expected);
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

      mockLoadData.mockResolvedValueOnce(structuredClone(_db));
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

      mockLoadData.mockResolvedValueOnce(structuredClone(_db));
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
      mockLoadData.mockResolvedValueOnce({});
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
      collections: { collectionName: "student", unique: ["email"] },
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
        { collectionName: "student", uniqueKeys: ["email", "name"] },
        { collectionName: "student", uniqueKeys: ["email", "name"] },
        { collectionName: "teacher", uniqueKeys: ["email"] },
        { collectionName: "patient" },
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
      mockLoadData.mockResolvedValueOnce(_db);
      if (Array.isArray(collections)) {
        const _expected = (expected as Array<string>).map(
          (el) => new Collection(el, path_db)
        );
        await expect(
          orm.createCollections(collections as string[], force)
        ).resolves.toEqual(_expected);
      } else
        await expect(
          orm.createCollection(collections as string, force)
        ).resolves.toEqual(new Collection(expected as string, path_db));
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

      mockLoadData.mockResolvedValueOnce(_db);
      await orm.createCollection(collections as string, force);

      expect(mockSaveData).toHaveBeenNthCalledWith(1, path_db, expectedObject);
    }
  );

  const table4 = [undefined, "user", "__metadata__"];

  it.each(table4)(
    "should throw an error when creating collection",
    async (collection) => {
      const _db = structuredClone(db);
      mockLoadData.mockResolvedValueOnce(_db);
      await expect(
        orm.createCollection(collection as string)
      ).rejects.toThrow();
    }
  );

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

      mockLoadData.mockResolvedValueOnce({});

      if (Array.isArray(_collection)) await orm.createCollections(_collection);
      else await orm.createCollection(_collection as string);

      expect(mockSaveData).toHaveBeenNthCalledWith(1, path_db, db);
    }
  );
});

/**
 * MANAGEMENT COLLECTION WITH HELPER FUNCTION
 */

describe("management collection with helper function", () => {
  it("should return a created collection as instance", async () => {
    const expected = new Collection("collection1", path_db);
    await expect(createCollection("collection1", path_db)).resolves.toEqual(
      expected
    );
  });

  it("should return a created collections as array of instance", async () => {
    const expected = [
      new Collection("collection2", path_db),
      new Collection("collection3", path_db),
    ];
    await expect(
      createCollection(["collection2", "collection3"], path_db)
    ).resolves.toEqual(expected);
  });

  it("should create a new collection instance", async () => {
    const expected = new Collection("user", path_db);
    await expect(defineCollection("user", path_db)).resolves.toEqual(expected);
  });

  const table1 = ["collection", ["collection1", "collection2"]];
  it.each(table1)("should return a deleted collection", async (opt) => {
    let collection = opt;
    const expected = structuredClone(opt);
    if (!Array.isArray(collection)) collection = [opt] as any;
    const _col = {} as any;
    (collection as Array<string>).forEach((element) => {
      _col[element] = [];
    });
    const _db: DataBaseType = {
      ..._col,
      __metadata__: (collection as Array<string>).map((collectionName) => ({
        collectionName,
        unique: [],
      })),
    };

    mockLoadData.mockResolvedValueOnce(_db);
    await expect(removeCollection(opt)).resolves.toEqual(expected);
  });
});
