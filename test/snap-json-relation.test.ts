import { DatabaseInfoOptionType } from "../src/types/orm.type";
import { loadData } from "../src/utils/load-data";
import { saveData } from "../src/utils/save-data";
import { SnapJson } from "../src/lib/snapjson";

jest.mock("src/utils/load-data", () => ({
  loadData: jest.fn(),
}));

jest.mock("src/utils/save-data", () => ({
  saveData: jest.fn(),
}));

jest.mock("../src/utils/utils.func");

describe("snapJson relation", () => {
  const mockDataBase = {
    databaseInfo: { splitFile: false },
    collectionInfo: [],
    collectionData: [],
  };
  const mockOpts = {
    path_db: "db",
    mode: "dev",
    encrypted: false,
    splitFile: false,
  } as Partial<
    Pick<DatabaseInfoOptionType, Exclude<keyof DatabaseInfoOptionType, "flag">>
  >;

  let snapjson: any;
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

  it("should create collection with relation type hasOne", async () => {
    const expected = {
      collectionName: "marks",
      localKey: "studentId",
      foreignKey: "__id",
      as: "marks",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
      relationType: "hasOne",
    };

    (loadData as jest.Mock).mockResolvedValueOnce([]);

    (loadData as jest.Mock).mockResolvedValue([
      { collectionName: "student", unique: [] },
      { collectionName: "marks", unique: [] },
    ]);

    await (snapjson as SnapJson).createCollections([
      {
        collectionName: "student",
        relations: [{ collectionName: "marks" }],
      },
      { collectionName: "marks" },
    ]);

    expect((saveData as jest.Mock).mock.calls[0][0][0].relations[0]).toEqual(
      expected
    );
  });

  it("should create collection with relation type belongsTo", async () => {
    const expected = {
      collectionName: "student",
      localKey: "studentId",
      foreignKey: "__id",
      as: "student",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
      relationType: "belongsTo",
    };

    (loadData as jest.Mock).mockResolvedValueOnce([
      { collectionName: "student", unique: [] },
    ]);

    (loadData as jest.Mock).mockResolvedValue([
      { collectionName: "student", unique: [] },
      { collectionName: "marks", unique: [] },
    ]);

    await (snapjson as SnapJson).createCollections([
      {
        collectionName: "marks",
        relations: [
          {
            collectionName: "student",
            relationType: "belongsTo",
          },
        ],
      },
    ]);

    expect((saveData as jest.Mock).mock.calls[0][0][1].relations[0]).toEqual(
      expected
    );
  });

  it("should create collection with relation type belongsTo", async () => {
    const expected = {
      collectionName: "student",
      localKey: "foreignID",
      foreignKey: "id",
      as: "data",
      onDelete: "NO ACTION",
      onUpdate: "CASCADE",
      relationType: "belongsTo",
    };

    (loadData as jest.Mock).mockResolvedValueOnce([
      { collectionName: "student", unique: [] },
    ]);

    (loadData as jest.Mock).mockResolvedValue([
      { collectionName: "student", unique: [] },
      { collectionName: "marks", unique: [] },
    ]);

    await (snapjson as SnapJson).createCollections([
      {
        collectionName: "marks",
        relations: [
          {
            collectionName: "student",
            localKey: "foreignID",
            foreignKey: "id",
            as: "data",
            onDelete: "NO ACTION",
            onUpdate: "CASCADE",
            relationType: "belongsTo",
          },
        ],
      },
    ]);

    expect((saveData as jest.Mock).mock.calls[0][0][1].relations[0]).toEqual(
      expected
    );
  });

  it("should create collection with relation type hasMany", async () => {
    const expected = {
      collectionName: "marks",
      localKey: "studentId",
      foreignKey: "__id",
      as: "marks",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
      relationType: "hasMany",
    };

    (loadData as jest.Mock).mockResolvedValueOnce([
      { collectionName: "marks", unique: [] },
    ]);

    (loadData as jest.Mock).mockResolvedValue([
      { collectionName: "student", unique: [] },
      { collectionName: "marks", unique: [] },
    ]);

    await (snapjson as SnapJson).createCollections([
      {
        collectionName: "student",
        relations: [
          {
            collectionName: "marks",
            relationType: "hasMany",
          },
        ],
      },
    ]);

    expect((saveData as jest.Mock).mock.calls[0][0][1].relations[0]).toEqual(
      expected
    );
  });

  it("should return no relation when create relation with oneself", async () => {
    (loadData as jest.Mock).mockResolvedValueOnce([]);

    (loadData as jest.Mock).mockResolvedValue([
      { collectionName: "student", unique: [] },
      { collectionName: "marks", unique: [] },
    ]);

    await (snapjson as SnapJson).createCollections([
      {
        collectionName: "student",
        relations: [{ collectionName: "student" }],
      },
      { collectionName: "marks" },
    ]);

    expect((saveData as jest.Mock).mock.calls[0][0][0].relations).toEqual([]);
  });

  it("should throw an error when creating relation with undefine collection.", async () => {
    (loadData as jest.Mock).mockResolvedValueOnce([]);

    await expect(
      (snapjson as SnapJson).createCollection({
        collectionName: "student",
        relations: [{ collectionName: "marks" }],
      })
    ).rejects.toThrow("Collection 'marks' doesn't exist.");
  });
});
