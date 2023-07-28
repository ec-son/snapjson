import { EcEntity } from "../src/ec_entity";
import {EcOrmJson } from "../src/ec_orm_json";
import { EcDbType, EcMetadata, EcOp } from "../src/ec_type";
import * as utilsFun from "../src/utils/utils.func";

const mockLoadData = jest.spyOn(utilsFun, "loadData");
const mockSaveData = jest.spyOn(utilsFun, "saveData");
const mockIsExistFile = jest.spyOn(utilsFun, "isExistFile");

interface userType {
  __id: number;
  firstName: string;
  email: string;
  age?: number;
}

interface queryType extends EcOp<Partial<userType>> {
  id?: number | number[];
}

const path_db = "path/db.json";
const orm = new EcOrmJson(path_db);
let user: EcEntity<Pick<userType, Exclude<keyof userType, "__id">>>;
const db: EcDbType = {
  user: [
    {
      __id: 1,
      firstName: "John",
      email: "john@example.com",
      age: 21,
    },
    {
      __id: 2,
      firstName: "Rick",
      email: "rick@example.com",
      age: 18,
    },
    {
      __id: 3,
      firstName: "Carl",
      email: "carl@example.com",
      age: 25,
    },
    {
      __id: 4,
      firstName: "Crowly",
      email: "crowly@example.com",
      age: 15,
    },
    {
      __id: 5,
      firstName: "Betty",
      email: "betty@example.com",
      age: 21,
    },
  ],
  __metadata__: [
    {
      entity: "user",
      unique: ["email"],
    },
  ] as EcMetadata<userType>[],
};

mockIsExistFile.mockResolvedValue(true);
mockLoadData.mockResolvedValue(db);
mockSaveData.mockResolvedValue(void 0);

/**
 * lastIdInsert
 *
 * findById
 * findOne
 * findMany
 *
 * add
 * create
 * inserOne
 * inserMany
 *
 * updateOne
 * updateMany
 *
 * deleteOne
 * deleteMany
 */

beforeAll(async () => {
  user = await orm.createEntity<
    Pick<userType, Exclude<keyof userType, "__id">>
  >("user");
});

beforeEach(() => {
  mockLoadData.mockResolvedValue(structuredClone(db));
  mockSaveData.mockClear();
  mockSaveData.mockImplementationOnce((path_id, data) =>
    Promise.resolve<any>(data)
  );
});

/**
 * TOOLS
 */

describe("tools methods of entity", () => {
  it("should return a last id", async () => {
    await expect(user.lastIdInsert()).resolves.toBe(5);
  });

  it("should return database file path", () => {
    expect(user.pathDB).toEqual(path_db);
  });

  it("should return entity name", () => {
    expect(user.entity).toEqual("user");
  });
});

/**
 * SELECT
 */

describe("selecting entities from database", () => {
  it("should select entity by id", async () => {
    await expect(user.findById(3)).resolves.toHaveProperty("__id", 3);
  });

  it("should not return an object with firstName property", async () => {
    await expect(
      user.findById(1, { select: ["__id"] })
    ).resolves.not.toHaveProperty("firstName", 1);
  });

  it("should not return an object with firstName property", async () => {
    await expect(
      user.findOne({ eq: { __id: 1 } }, { select: ["__id"] })
    ).resolves.not.toHaveProperty("firstName", 1);
  });

  const table1: queryType[] = [
    { eq: { __id: 1, firstName: "John", email: "john@example.com" }, id: 1 },
    { gt: { __id: 1 }, id: 2 },
    { gte: { __id: 2 }, id: 2 },
    { lt: { __id: 5 }, id: 1 },
    { lte: { __id: 5 }, id: 1 },
    { gt: { __id: 1 }, lt: { __id: 5 }, id: 2 },
    { not: { email: "john@example.com" }, id: 2 },
    { or: [{ eq: { age: 18 } }, { eq: { age: 25 } }], id: 2 },
  ];

  it.each(table1)("should return the correct entity", async (query) => {
    const expected = structuredClone(
      (db["user"] as Array<userType>).find((el) => el.__id === query.id)
    );
    await expect(user.findOne(query)).resolves.toEqual(expected);
  });

  const table2: queryType[] = [
    { eq: { age: 21 }, id: [1, 5] },
    { gte: { age: 15 }, lt: { age: 20 }, id: [2, 4] },
    {
      or: [
        { gt: { age: 21 } },
        { lte: { age: 15 } },
        { eq: { firstName: "Betty" } },
      ],
      id: [3, 4, 5],
    },
  ];

  it.each(table2)(
    "should return an array or created entities",
    async (query) => {
      const expected = (db["user"] as Array<userType>).filter((el) => {
        return (query.id as Array<number>).includes(el.__id);
      });

      await expect(user.findMany(query)).resolves.toEqual(expected);
    }
  );

  it("should return an sorted array of entities", async () => {
    const expected = [
      { __id: 5 },
      { __id: 4 },
      { __id: 3 },
      { __id: 2 },
      { __id: 1 },
    ];
    await expect(
      user.findMany(
        {
          or: [{ eq: { age: 25 } }, { lte: { age: 20 } }, { eq: { age: 21 } }],
        },
        { select: ["__id"], sort: { flag: "desc" } }
      )
    ).resolves.toEqual(expected);
  });
});

/**
 * INSERT
 */

describe("inserting entities into database", () => {
  const table1 = [
    { firstName: "item1", email: "item1@example.com", age: 36 },
    { firstName: "item2", email: "item2@example.com" },
  ];

  it.each(table1)("should return created entity", async (entity) => {
    await expect(user.insertOne(entity)).resolves.toEqual({
      ...entity,
      __id: (await user.lastIdInsert()) + 1,
    });
  });

  const table2 = ["insertOne", "add", "create"] as const;
  it.each(table2)("should insert entity into database", async (method) => {
    const entity = {
      firstName: "item3",
      email: `${method}@example.com`,
      age: 36,
    };
    await user[method](entity);
    expect(mockSaveData.mock.calls[0][1]["user"]).toContainEqual({
      ...entity,
      __id: await user.lastIdInsert(),
    });
  });

  it("should throw error when creating a new entity, constrain", async () => {
    const entity = { firstName: "John", email: "john@example.com" };
    await expect(user.insertOne(entity)).rejects.toThrow();
  });

  it("should return created entities", async () => {
    const items: Pick<userType, Exclude<keyof userType, "__id">>[] = [
      { firstName: "item6", email: "item6@example.com", age: 36 },
      { firstName: "item7", email: "item7@example.com" },
    ];
    await expect(user.inserMany(items)).resolves.toContainEqual({
      ...items[1],
      __id: 7,
    });
  });

  it("should insert multiple entities", async () => {
    let __id = await user.lastIdInsert();
    const items: Pick<userType, Exclude<keyof userType, "__id">>[] = [
      { firstName: "item7", email: "item7@example.com" },
      { firstName: "item8", email: "item8@example.com", age: 36 },
    ];

    const expected = items.map<Record<string, any>>((el) => {
      __id++;
      return { ...el, __id };
    });

    await user.inserMany(items);
    expect(mockSaveData.mock.calls[0][1]["user"]).toContainEqual(expected[1]);
  });
});

/**
 * UPDATE
 */

describe("updating entities from database", () => {
  const table1: queryType[] = [
    { eq: { __id: 1, firstName: "John", email: "john@example.com" }, id: 1 },
    { not: { email: "john@example.com" }, id: 2 },
  ];

  it.each(table1)("should return updated entity", async (query) => {
    const expected = structuredClone(
      (db["user"] as Array<userType>).find((el) => el.__id === query.id)
    );

    expected!.age = 30;
    await expect(user.updateOne({ age: 30 }, query)).resolves.toEqual(expected);
  });

  it("should update entity from database", async () => {
    const expected = {
      __id: 4,
      firstName: "Crowly",
      email: "crowly@example.com",
      age: 35,
    };

    await user.updateOne({ age: 35 }, { eq: { __id: 4 } });
    expect(mockSaveData.mock.calls[0][1]["user"]).toContainEqual(expected);
  });

  it("should throw an error when update, constrain", async () => {
    await expect(
      user.updateOne({ email: "rick@example.com" }, { eq: { __id: 1 } })
    ).rejects.toThrow();
  });

  it("should return updated entities", async () => {
    const age = 30;
    const expected = [
      { __id: 3, firstName: "Carl", email: "carl@example.com", age },
      {
        __id: 4,
        firstName: "Crowly",
        email: "crowly@example.com",
        age,
      },
    ];

    await expect(
      user.updateMany(
        { age },
        { or: [{ eq: { age: 25 } }, { eq: { age: 15 } }] }
      )
    ).resolves.toEqual(expected);
  });

  it("should update entities from database", async () => {
    const age = 50;
    const expected = [
      { __id: 3, firstName: "Carl", email: "carl@example.com", age },
      {
        __id: 4,
        firstName: "Crowly",
        email: "crowly@example.com",
        age,
      },
    ];

    await user.updateMany(
      { age },
      { or: [{ eq: { age: 25 } }, { eq: { age: 15 } }] }
    );
    expect(mockSaveData.mock.calls[0][1]["user"]).toContainEqual(expected[1]);
  });
});

/**
 * DELETE
 */

describe("deleting entities from database", () => {
  const table1: queryType[] = [
    { eq: { __id: 1, firstName: "John", email: "john@example.com" }, id: 1 },
    { not: { email: "john@example.com" }, id: 2 },
  ];

  it.each(table1)("should return deleted  entity", async (query) => {
    const expected = structuredClone(
      (db["user"] as Array<userType>).find((el) => el.__id === query.id)
    );

    await expect(user.deleteOne(query)).resolves.toEqual(expected);
  });

  it("should delete entity from database", async () => {
    const expected = {
      __id: 4,
      age: 15,
      email: "crowly@example.com",
      firstName: "Crowly",
    };
    await user.deleteOne({ eq: { __id: 4 } });
    expect(mockSaveData.mock.calls[0][1]["user"]).not.toContainEqual(expected);
  });

  it("should return deleted entities", async () => {
    const expected = [
      { __id: 1, age: 21, email: "john@example.com", firstName: "John" },
      { __id: 5, age: 21, email: "betty@example.com", firstName: "Betty" },
    ];
    await expect(user.deleteMany({ eq: { age: 21 } })).resolves.toEqual(
      expected
    );
  });

  it("should delete entities from database", async () => {
    const expected = {
      __id: 5,
      firstName: "Betty",
      email: "betty@example.com",
      age: 21,
    };

    await user.deleteMany({ eq: { age: 21 } });
    expect(mockSaveData.mock.calls[0][1]["user"]).not.toContainEqual(expected);
  });
});
