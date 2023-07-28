import { EcEntity } from "../src/ec_entity";
import { EcOrmJson } from "../src/ec_orm_json";
import { EcDbType, EcMetadata } from "../src/ec_type";
import { convertToObject } from "../src/utils/convert_to_object";
import * as utilsFun from "../src/utils/utils.func";

const mockLoadData = jest.spyOn(utilsFun, "loadData");
const mockSaveData = jest.spyOn(utilsFun, "saveData");
const mockIsExistFile = jest.spyOn(utilsFun, "isExistFile");

const path_db = "path/db.json";
const orm = new EcOrmJson(path_db);
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
      entity: "user",
      unique: ["email"],
    },
  ] as EcMetadata<{ fullname: string; email: string; age: number }>[],
};

mockLoadData.mockResolvedValue(db);
mockSaveData.mockResolvedValue(void 0);

/***
 * geEntities
 * isExistEntity
 * testDatabase
 * pathDB
 *
 * addEntity
 * addEntities
 * removeEntity
 * createEntity
 */
describe("data base", () => {
  it("should return entities array", async () => {
    await expect(orm.geEntities()).resolves.toEqual(Object.keys(db));
  });

  it("should return true if entiy exists", async () => {
    await expect(orm.isExistEntity("user")).resolves.toBeTruthy();
  });

  it("should return false if entiy doesn't exist", async () => {
    await expect(orm.isExistEntity("student")).resolves.toBeFalsy();
  });

  it("should return true is database file exists", async () => {
    mockIsExistFile.mockResolvedValue(true);
    await expect(orm.testDatabase()).resolves.toBeTruthy();
  });

  it("should return false is database file doesn't exist", async () => {
    mockIsExistFile.mockResolvedValue(false);
    await expect(orm.testDatabase("db.json")).resolves.toBeFalsy();
  });

  it("should return database file path", () => {
    expect(orm.pathDB).toEqual(path_db);
  });

  it("should call loadData function once", async () => {
    expect(mockLoadData).toBeCalledTimes(1);
  });
});

describe("Entity", () => {
  beforeEach(() => {
    mockSaveData.mockClear();
    mockSaveData.mockImplementationOnce((path_id, data) =>
      Promise.resolve<any>(data)
    );
  });

  /**
   * REMOVING ENTITY FROM DATABASE
   */

  const table1 = [
    {
      entities: "student1",
      expected: "student1",
      metadata: { entity: "student1" },
    },
    { entities: "student", data: [], expected: undefined },
    { entities: "__metadata__", data: [], expected: undefined },
    { entities: "user", data: [], force: true, expected: "user" },
    {
      entities: ["student1", "student2"],
      expected: ["student1", "student2"],
    },
    {
      entities: ["student1", "student2", "student3"],
      data: ["student1", "student3"],
      expected: ["student1", "student3"],
      metadata: [{ entity: "student2" }, { entity: "student3" }],
    },
    {
      entities: ["student1"],
      expected: ["student1"],
    },
  ];
  it.each(structuredClone(table1))(
    "should remove entity from database",
    async ({ entities, expected, data, force, metadata }) => {
      if (!Array.isArray(metadata)) metadata = metadata ? [metadata] : [];
      const _db = structuredClone(db);
      _db["__metadata__"].push(...metadata);

      convertToObject(data || entities, _db);
      mockLoadData.mockResolvedValue(_db);
      await expect(orm.removeEntity(entities, force)).resolves.toEqual(
        expected
      );
    }
  );

  it.each(structuredClone(table1))(
    "should return a correct db after removing entities",
    async ({ entities, expected, data, force, metadata }) => {
      if (!expected) return;
      if (!Array.isArray(metadata)) metadata = metadata ? [metadata] : [];
      const _db = structuredClone(db);
      _db["__metadata__"].push(...metadata);

      convertToObject(data || entities, _db);

      mockLoadData.mockResolvedValue(_db);
      await orm.removeEntity(entities, force);
      expect(mockSaveData).toHaveBeenNthCalledWith(1, path_db, _db);
    }
  );

  it("should throw an error when removing entity which has items", async () => {
    await expect(orm.removeEntity("user")).rejects.toThrow();
  });

  const table2 = ["user", ["user", "student", "teacher"]];
  it.each(table2)(
    "should return undefined when removing entity from database which has no entity",
    async (entity) => {
      const expected = Array.isArray(entity) ? [] : undefined;
      mockLoadData.mockResolvedValue({});
      await expect(orm.removeEntity(entity)).resolves.toEqual(expected);
    }
  );

  /**
   * ADDING ENTITY FROM DATABASE
   */

  const table3 = [
    {
      entities: "user",
      expected: "user",
      force: true,
      metadata: { entity: "user", unique: [] },
    },
    {
      entities: { name: "student", unique: ["email"] },
      expected: "student",
      metadata: { entity: "student", unique: [] },
    },
    {
      entities: ["user", "teacher", "teacher"],
      force: true,
      expected: ["user", "teacher"],
      metadata: [
        { entity: "user", unique: [] },
        { entity: "teacher", unique: [] },
      ],
    },
    { entities: [], expected: [] },
    {
      entities: [
        { name: "student", uniqueProperties: ["email", "name"] },
        { name: "student", uniqueProperties: ["email", "name"] },
        { name: "teacher", uniqueProperties: ["email"] },
        { name: "patient" },
      ],
      metadata: [
        { entity: "student", unique: ["email", "name"] },
        { entity: "teacher", unique: ["email"] },
        { entity: "patient", unique: [] },
      ],
      expected: ["student", "teacher", "patient"],
    },
  ];

  it.each(structuredClone(table3))(
    "should return the created entitied",
    async ({ entities, expected, force }) => {
      const _db = structuredClone(db);
      mockLoadData.mockResolvedValue(_db);
      if (Array.isArray(entities))
        await expect(
          orm.addEntities(entities as string[], force)
        ).resolves.toEqual(expected);
      else
        await expect(orm.addEntity(entities as string, force)).resolves.toEqual(
          expected
        );
    }
  );

  it.each(structuredClone(table3))(
    "should return a correct object after adding a new entity",
    async ({ entities, force, metadata, expected }) => {
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
      await orm.addEntity(entities as string, force);

      expect(mockSaveData).toHaveBeenNthCalledWith(1, path_db, expectedObject);
    }
  );

  const table4 = [undefined, "user", "__metadata__"];

  it.each(table4)(
    "should throw an error when creating entity",
    async (entity) => {
      const _db = structuredClone(db);
      mockLoadData.mockResolvedValue(_db);
      await expect(orm.addEntity(entity as string)).rejects.toThrow();
    }
  );

  const table5 = ["user", ["user", "student", "teacher"]];
  it.each(table2)(
    "should return undefined when removing entity from database which has no entity",
    async (entity) => {
      const _entity = structuredClone(entity);
      if (!Array.isArray(entity)) entity = [entity];

      const metadata = entity.map((el) => ({ entity: el, unique: [] }));
      const db = convertToObject(entity);
      db["__metadata__"] = metadata;

      mockLoadData.mockResolvedValue({});

      if (Array.isArray(_entity)) await orm.addEntities(_entity);
      else await orm.addEntity(_entity as string);

      expect(mockSaveData).toHaveBeenNthCalledWith(1, path_db, db);
    }
  );
});

/**
 * ENTITY INSTANCE
 */

describe("addEntity", () => {
  it("should create a new entity instance", async () => {
    mockLoadData.mockResolvedValue(db);
    await expect(orm.createEntity("user")).resolves.toBeInstanceOf(EcEntity);
  });
});
