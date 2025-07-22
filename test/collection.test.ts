import { Collection } from "../src/lib/collection";
import { loadData } from "../src/utils/load-data";
import { saveData } from "../src/utils/save-data";
import { SnapJson } from "../src/lib/snapjson";
import * as shortcutFunc from "../src/utils/shortcutFunc";
import { DatabaseInfoOptionType } from "../src/types/orm.type";
import { Document } from "src/lib/document";

jest.mock("src/utils/load-data", () => ({
  loadData: jest.fn(),
}));

jest.mock("src/utils/save-data", () => ({
  saveData: jest.fn(),
}));

jest.mock("../src/lib/snapjson", () => ({
  SnapJson: jest.fn().mockImplementation(() => ({
    isExistCollection: jest.fn().mockReturnValue(true),
  })),
}));

/**
 * Collection class
 *
 * lastInsertId
 * size
 *
 * findById
 * findOne
 * find
 *
 * add
 * create
 * insertOne
 * insertMany
 *
 * updateOne
 * updateMany
 *
 * deleteOne
 * deleteMany
 *
 * getUniqueKeys
 * addUniqueKey
 * removeUniqueKey
 * removeAllUniqueKeys
 */

describe("Collection class", () => {
  const collectionName = "testCollection";
  const collectionInfo = [
    { collectionName: "testCollection", unique: [], relations: [] },
  ];
  const mockCollectionData = [
    { __id: 1, name: "Test Item 1" },
    { __id: 2, name: "Test Item 2" },
  ];
  const mockOpts = {
    path_db: "db",
    mode: "dev",
    encrypted: false,
    splitFile: false,
    flag: collectionName,
  } as Partial<
    Pick<DatabaseInfoOptionType, Exclude<keyof DatabaseInfoOptionType, "flag">>
  >;

  let collection;
  let defineDocument;
  const isNow = (date: string): boolean => {
    return (
      new Date(date).toISOString().split("T")[0] ===
      new Date().toISOString().split("T")[0]
    );
  };

  beforeEach(() => {
    collection = new Collection(collectionName, mockOpts);
    (loadData as jest.Mock).mockClear();
    (saveData as jest.Mock).mockClear();

    (loadData as jest.Mock).mockImplementation(
      jest.fn(({ flag }) => {
        if (flag === "orm-info") return structuredClone({ splitFile: false });
        else if (flag === "collection-info")
          return structuredClone(collectionInfo);
        else return structuredClone(mockCollectionData);
      })
    );

    defineDocument = jest.spyOn(shortcutFunc, "defineDocument");
    (defineDocument as jest.Mock).mockImplementation((t) => t);
  });

  /**
   * INSERTING
   */

  describe("Inserting", () => {
    const mockData = { name: "Test Item 3" };
    it("should insert data and return a document with add method", async () => {
      const result = await collection.add(mockData);

      expect(loadData).toHaveBeenCalledWith(mockOpts);
      expect(defineDocument).toHaveBeenCalled();
      expect(result).toEqual({ __id: "3", ...mockData });
      expect(saveData).toHaveBeenCalled();
    });

    it("should insert data and return a document with inserOne method", async () => {
      (loadData as jest.Mock).mockResolvedValueOnce([]);

      (loadData as jest.Mock).mockResolvedValueOnce([
        {
          collectionName: "testCollection",
          idStrategy: "uuid",
          unique: [],
          createdAt: true,
          relations: [],
        },
      ]);

      const result = await collection.insertOne(structuredClone(mockData));

      expect(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          result.__id
        )
      ).toBeTruthy();

      expect(isNow(result.createdAt)).toBeTruthy();
    });

    it("should insert data and return a document with create method", async () => {
      const result = await collection.create(mockData);
      expect(result).toEqual({ __id: "3", ...mockData });
    });

    it("should insert an array of data and return an array of document with insertMany method", async () => {
      const result = await collection.insertMany([mockData]);

      expect(result).toEqual([{ __id: "3", ...mockData }]);
    });

    it("should throw error when creating a new document, constrain", async () => {
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [
              {
                collectionName: "testCollection",
                unique: ["name"],
                relations: [],
              },
            ];
          return structuredClone(mockCollectionData);
        })
      );

      await expect(
        collection.insertOne({ name: "Test Item 1" })
      ).rejects.toThrowError("Connot duplicate 'name' field as unique key");
    });
  });

  /**
   * UPDATING
   */

  describe("Updating", () => {
    it("should update a document and return the updated document with updateOne method", async () => {
      (loadData as jest.Mock).mockResolvedValueOnce([
        { __id: 1, name: "Test Item 1" },
        { __id: 2, name: "Test Item 2" },
      ]);

      (loadData as jest.Mock).mockResolvedValueOnce([
        {
          collectionName: "testCollection",
          unique: [],
          updatedAt: true,
          relations: [],
        },
      ]);

      const mockData = { name: "Updated Item" };
      const result = await collection.updateOne(mockData, { __id: 1 });

      expect(result).toEqual({
        __id: 1,
        name: "Updated Item",
        updatedAt: result.updatedAt,
      });

      expect(isNow(result.updatedAt)).toBeTruthy();
    });

    it("should update an array of document and return an array of updated documents with updateMany method", async () => {
      const result = await collection.updateMany(
        { name: "Updated Item" },
        {
          __id: 1,
        }
      );

      expect(result).toEqual([{ __id: 1, name: "Updated Item" }]);
    });

    it("should throw error when update, constrain", async () => {
      const mockData = { name: "Test Item1" };
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [
              {
                collectionName: "testCollection",
                unique: ["name"],
                relations: [],
              },
            ];
          return structuredClone(mockCollectionData);
        })
      );

      await expect(
        collection.updateOne({ name: "Test Item 2" }, { __id: 1 })
      ).rejects.toThrowError("Connot duplicate 'name' field as unique key");
    });

    it("should return null if no document is found to update", async () => {
      (loadData as jest.Mock).mockResolvedValue([]);

      const result = await collection.updateOne(
        { name: "Updated Item" },
        { __id: 1 }
      );

      expect(result).toBeNull();
    });
  });

  /**
   * DELETING
   */

  describe("Deleting", () => {
    it("should delete a document and return it", async () => {
      (loadData as jest.Mock).mockResolvedValueOnce(
        structuredClone(mockCollectionData)
      );

      const result = await collection.deleteOne({ __id: 1 });

      expect(result).toEqual(mockCollectionData[0]);
    });

    it("should delete many documents and return them", async () => {
      (loadData as jest.Mock).mockResolvedValue(
        structuredClone(mockCollectionData)
      );

      const result = await collection.deleteMany({
        __id: { $lte: 2 },
      });

      expect(result).toEqual(mockCollectionData);
    });

    it("should return null if no document is found to delete", async () => {
      (loadData as jest.Mock).mockResolvedValue([]);

      const result = await collection.deleteOne({ __id: 1 });

      expect(result).toBeNull();
    });
  });

  /**
   * SELECTING
   */

  describe("Selecting", () => {
    it("should return document by id with findById method", async () => {
      (defineDocument as jest.Mock).mockRestore();
      (loadData as jest.Mock).mockResolvedValue(
        structuredClone(mockCollectionData)
      );
      const result = await collection.findById(1);
      expect(result).toBeInstanceOf(Document);
    });

    it("should return a document as json with findOne method", async () => {
      (loadData as jest.Mock).mockResolvedValue(
        structuredClone(mockCollectionData)
      );
      const result = await (collection as Collection<any>).findOne(
        { __id: { $lte: 2 } },
        { type: "json" }
      );

      expect(result).toEqual(JSON.stringify(mockCollectionData[0]));
    });

    it("should return many documents as object with find method", async () => {
      (loadData as jest.Mock).mockResolvedValue(
        structuredClone(mockCollectionData)
      );
      const result = await collection.find(
        { __id: { $lte: 2 } },
        { type: "object" }
      );

      expect(result).toEqual(mockCollectionData);
    });

    it("should return undefined if no document found", async () => {
      (loadData as jest.Mock).mockResolvedValue([]);

      const result = await collection.findById(1);

      expect(result).toBeUndefined();
    });
  });

  /**
   * TOOLS
   */

  describe("Tools", () => {
    it("should throw an error if collection doesn't exit when instantiating with force to true", async () => {
      (SnapJson as jest.Mock).mockImplementationOnce(() => ({
        isExistCollection: jest.fn().mockReturnValue(false),
      }));

      expect(() => new Collection("foo")).toThrowError(
        "Collection 'foo' doesn't exist."
      );
    });

    it("should return a default path of database", () => {
      expect(collection.pathDB).toEqual(mockOpts.path_db);
    });

    it("should return collection name", () => {
      expect(collection.collectionName).toEqual(collectionName);
    });

    it("should return collection size", async () => {
      await expect(collection.size()).resolves.toBe("65 B");
    });

    it("should return number of documents", async () => {
      await expect(collection.count()).resolves.toBe(2);
    });

    // it("should return a last id", async () => {
    //   await expect(collection.lastInsertId()).resolves.toBe(2);
    // });
  });

  /**
   * UNIQUE KEY
   */

  describe("Unique key", () => {
    it("should return unique keys", async () => {
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [{ collectionName: "testCollection", unique: ["name"] }];
          return structuredClone(mockCollectionData);
        })
      );
      await expect(collection.getUniqueKeys()).resolves.toEqual(["name"]);
    });

    it("should remove unique key", async () => {
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [{ collectionName: "testCollection", unique: ["name"] }];
          return structuredClone(mockCollectionData);
        })
      );
      const result = await collection.removeUniqueKey("name");

      expect(result).toEqual("name");
    });

    it("should remove all unique keys", async () => {
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [{ collectionName: "testCollection", unique: ["name"] }];
          return structuredClone(mockCollectionData);
        })
      );
      const result = await collection.removeAllUniqueKeys();

      expect(result).toEqual(["name"]);
      expect((saveData as jest.Mock).mock.calls[0][0][0]["unique"]).toEqual([]);
    });

    it("should add an unique key", async () => {
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [{ collectionName: "testCollection", unique: [] }];
          return structuredClone(mockCollectionData);
        })
      );

      const result = await collection.addUniqueKey("name");

      expect(result).toEqual("name");
      expect((saveData as jest.Mock).mock.calls[0][0][0]["unique"]).toEqual([
        "name",
      ]);
    });

    it("should add many unique keys", async () => {
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [{ collectionName: "testCollection", unique: [] }];
          return structuredClone(mockCollectionData);
        })
      );
      const result = await collection.addUniqueKey(["name"]);
      expect(result).toEqual(["name"]);
      expect((saveData as jest.Mock).mock.calls[0][0][0]["unique"]).toEqual([
        "name",
      ]);
    });

    it("should skip when unique keys is already added", async () => {
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [{ collectionName: "testCollection", unique: ["name"] }];
          return structuredClone(mockCollectionData);
        })
      );
      await collection.addUniqueKey("name");
      expect(saveData).not.toBeCalled();
    });

    it("should return undefined when a provided unique keys is not found", async () => {
      const result = await collection.removeUniqueKey("name");

      expect(result).toBeUndefined();
      expect(saveData).not.toBeCalled();
    });
  });
});
