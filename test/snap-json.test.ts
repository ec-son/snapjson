import { SnapJson } from "../src/lib/snapjson";
import { Collection } from "../src/lib/collection";
import { loadData } from "../src/utils/load-data";
import { saveData } from "../src/utils/save-data";
import { DatabaseInfoOptionType } from "../src/types/orm.type";
import { sizeFile } from "../src/utils/utils.func";

jest.mock("src/utils/load-data", () => ({
  loadData: jest.fn(),
}));

jest.mock("src/utils/save-data", () => ({
  saveData: jest.fn(),
}));

jest.mock("../src/utils/utils.func");

/**
 * getCollections
 * isExistCollection
 * pathDB
 *
 * createCollection
 * createCollections
 * removeCollection
 * collection
 * size
 */

describe("saveData()", () => {
  const mockDataBase = {
    databaseInfo: { splitFile: false },
    collectionInfo: [{ collectionName: "student", unique: [] }],
    collectionData: [
      { __id: 1, name: "Test Item 1" },
      { __id: 2, name: "Test Item 2" },
    ],
  };
  const mockOpts = {
    path_db: "db",
    mode: "dev",
    encrypted: false,
    splitFile: false,
  } as Partial<
    Pick<DatabaseInfoOptionType, Exclude<keyof DatabaseInfoOptionType, "flag">>
  >;

  let snapjson;
  beforeEach(() => {
    snapjson = new SnapJson(mockOpts);
    (loadData as jest.Mock).mockClear();
    (saveData as jest.Mock).mockClear();
    (loadData as jest.Mock).mockImplementation(
      jest.fn(({ flag }) => {
        if (flag === "orm-info")
          return structuredClone(mockDataBase.databaseInfo);
        else if (flag === "collection-info")
          return structuredClone(mockDataBase.collectionInfo);
        else return structuredClone(mockDataBase.collectionData[flag]);
      })
    );
  });

  /**
   * TOOLS
   */
  describe("Tools", () => {
    it("should return path of database", () => {
      expect(snapjson.pathDB).toEqual(mockOpts.path_db);
    });

    it("should return a default path of database", () => {
      const orm = new SnapJson();
      expect(orm.pathDB).toEqual("db");
    });

    it("should return database size", async () => {
      (sizeFile as jest.Mock).mockResolvedValue("1 KB");
      await expect(snapjson.size()).resolves.toBe("1 KB");
      expect(sizeFile as jest.Mock).toBeCalledWith({
        encrypted: false,
        flag: "orm-info",
        mode: "dev",
        path_db: "db",
        salt: undefined,
        secretKey: undefined,
        splitFile: false,
      });
    });
  });

  /**
   * COLLECTION
   */

  describe.only("Collection", () => {
    it("should create a new collection instance", async () => {
      await expect(snapjson.collection("student")).resolves.toBeInstanceOf(
        Collection
      );
    });

    it("shouldn't throw an error when creating a new collection instance with force to true if collection doesn't exist", async () => {
      (loadData as jest.Mock).mockResolvedValueOnce([
        { collectionName: "student", unique: [] },
      ]);
      (loadData as jest.Mock).mockResolvedValueOnce([
        { collectionName: "student", unique: [] },
      ]);
      (loadData as jest.Mock).mockResolvedValueOnce([
        { collectionName: "student", unique: [] },
        { collectionName: "user", unique: [] },
      ]);

      await expect(snapjson.collection("user", true)).resolves.toBeInstanceOf(
        Collection
      );
    });

    it("should throw an error when creating a new collection instance if collection doesn't exist", async () => {
      await expect(snapjson.collection("user")).rejects.toThrow();
    });

    it("should create a new collection", async () => {
      (loadData as jest.Mock).mockResolvedValueOnce([
        { collectionName: "student", unique: [] },
      ]);
      (loadData as jest.Mock).mockResolvedValueOnce([
        { collectionName: "student", unique: [] },
        { collectionName: "user", unique: [] },
      ]);

      const result = await snapjson.createCollection("user");
      expect(result).toBeInstanceOf(Collection);
    });

    it("shouldn't throw an error when creating a new collection instance with force to true if collection already exist", async () => {
      const result = await snapjson.createCollection("student", true);
      expect(result).toBeInstanceOf(Collection);
    });

    it("should throw an error when creating a new collection instance if collection already exist", async () => {
      await expect(snapjson.createCollection("student")).rejects.toThrow();
    });

    it("should remove collection from database", async () => {
      (loadData as jest.Mock).mockImplementation(({ flag }) => {
        if (flag === "collection-info")
          return [{ collectionName: "user", unique: [] }];
        else return [];
      });

      const result = await snapjson.removeCollection("user");

      expect(result).toEqual("user");
      expect(saveData as jest.Mock).toHaveBeenCalledWith([], {
        path_db: "db",
        mode: "dev",
        splitFile: false,
        encrypted: false,
        secretKey: undefined,
        salt: undefined,
        flag: "collection-info",
      });
    });

    it("should remove many collections from database", async () => {
      (loadData as jest.Mock).mockImplementation(({ flag }) => {
        if (flag === "collection-info")
          return [
            { collectionName: "user", unique: [] },
            { collectionName: "action", unique: [] },
          ];
        else return [];
      });

      const result = await snapjson.removeCollection(["user", "action"]);

      expect(result).toEqual(["user", "action"]);
    });

    it("should throw an error when removing collection having data", async () => {
      (loadData as jest.Mock).mockImplementation(({ flag }) => {
        if (flag === "collection-info")
          return [{ collectionName: "user", unique: [] }];
        else return [{ __id: 1, name: "smith" }];
      });

      await expect(snapjson.removeCollection("user")).rejects.toThrow();
    });

    it("should add collection even if it has data", async () => {
      (loadData as jest.Mock).mockImplementation(({ flag }) => {
        if (flag === "collection-info")
          return [{ collectionName: "user", unique: [] }];
        else return [{ __id: 1, name: "smith" }];
      });

      const result = await snapjson.removeCollection("user", true);

      expect(result).toEqual("user");
    });

    it("should return an array collection names", async () => {
      await expect(snapjson.getCollections()).resolves.toEqual(["student"]);
    });

    it("should return true if collection exists", async () => {
      await expect(snapjson.isExistCollection("user")).resolves.toBeFalsy();
    });
  });
});
