import * as utilsFun from "../src/utils/utils.func";
import { Collection } from "../src/lib/collection";
import { SnapJson, defineCollection } from "../src/lib/snapjson";
import { DataBaseType, MetadataType, QueryType } from "../src/types/orm.type";

const mockLoadData = jest.spyOn(utilsFun, "loadData");
const mockSaveData = jest.spyOn(utilsFun, "saveData");

const factoryDocument = (
  document:
    | userType
    | Partial<userType>
    | Array<userType>
    | Array<Partial<userType>>,
  path?: string
) => utilsFun.defineDocument(document, path || path_db, "user");

interface userType {
  __id: number;
  firstName: string;
  email: string;
  age?: number;
}

interface queryType extends QueryType<Partial<userType>> {
  id?: number | number[];
}

const path_db = "path/db.json";
const orm = new SnapJson(path_db);
let user: Collection<Pick<userType, Exclude<keyof userType, "__id">>>;
const db: DataBaseType = {
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
      collectionName: "user",
      unique: ["email"],
    },
  ] as MetadataType<userType>[],
};

mockLoadData.mockResolvedValue(db);
mockSaveData.mockResolvedValue(void 0);

/**
 * Collection class
 *
 * lastIdInsert
 * size
 *
 * findById
 * findOne
 * find
 *
 * add
 * create
 * inserOne
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

beforeAll(async () => {
  user = await orm.collection<Pick<userType, Exclude<keyof userType, "__id">>>(
    "user"
  );
});

beforeEach(() => {
  mockLoadData.mockResolvedValue(structuredClone(db));
  mockSaveData.mockClear();
  mockSaveData.mockImplementationOnce((path_id, data) =>
    Promise.resolve<any>(data)
  );
});

/**
 * COLLECTION CLASS
 */

describe("collection instance", () => {
  it("should return a collection instance", async () => {
    const _user = await defineCollection("user", path_db);
    expect(new Collection("user", path_db)).toEqual(_user);
  });

  const table1 = [undefined, "", "collectionNotFound"];

  it.each(table1)(
    "throw an error when collection do not exist",
    async (collectionName) => {
      const collection = new Collection(collectionName as string, path_db);
      await expect(collection.count()).rejects.toThrow();
    }
  );

  it("should create a new collection withput suppliying the path", () => {
    const collection = new Collection("user");
    expect(collection.pathDB).toBe("db/db.json");
  });
});

/**
 * TOOLS
 */

describe("tools methods of collection", () => {
  it("should return a last id", async () => {
    await expect(user.lastIdInsert()).resolves.toBe(5);
  });

  it("should return path of database", async () => {
    const path = "root/db.json";
    const _user = await defineCollection("user", path);
    expect(_user.pathDB).toEqual(path);
  });

  it("should return a default path of database", () => {
    expect(user.pathDB).toEqual(path_db);
  });

  it("should return collection name", () => {
    expect(user.collectionName).toEqual("user");
  });

  it("should return collection size", async () => {
    await expect(user.size()).resolves.toBe("337 B");
  });

  it("should return number of documents", async () => {
    await expect(user.count()).resolves.toBe(5);
  });
});

/**
 * SELECT
 */

describe("selecting documents from database", () => {
  it("should select document by id", async () => {
    await expect(user.findById(3)).resolves.toHaveProperty("__id", 3);
  });

  const table1: queryType[] = [
    { __id: 1, firstName: "John", email: "john@example.com", id: 1 },
    { __id: { $gt: 1 }, id: 2 },
    { __id: { $gte: 2 }, id: 2 },
    { __id: { $lt: 5 }, id: 1 },
    { __id: { $lte: 5 }, id: 1 },
    { __id: { $gt: 1, $lt: 5 }, id: 2 },
    { email: { $ne: "john@example.com" }, id: 2 },
    { email: /ly@ex/, id: 4 },
    { $and: [{ age: 21 }, { email: { $eq: /tty/ } }], id: 5 },
    { $or: [{ age: 18 }, { age: 25 }], id: 2 },
  ];

  it.each(table1)("should return the correct document", async (opts) => {
    const { id, ...query } = opts;
    const expected = structuredClone(
      (db["user"] as Array<userType>).find((el) => el.__id === id)
    );
    await expect(user.findOne(query)).resolves.toEqual(
      factoryDocument(expected!)
    );
  });

  const table2: queryType[] = [
    { age: 21, id: [1, 5] },
    { age: { $gte: 15, $lt: 20 }, id: [2, 4] },
    {
      $or: [
        { age: { $gt: 21 } },
        { age: { $lte: 15 } },
        { firstName: { $eq: "Betty" } },
      ],
      id: [3, 4, 5],
    },
  ];

  it.each(table2)(
    "should return an array of entities that match the given query",
    async (opts) => {
      const { id, ...query } = opts;
      const expected = (db["user"] as Array<userType>).filter((el) => {
        return (id as Array<number>).includes(el.__id);
      });

      await expect(user.find(query)).resolves.toEqual(
        factoryDocument(expected)
      );
    }
  );

  it("should return an object with firstName property only", async () => {
    const document = (
      await user.findOne({ __id: 1 }, { select: ["firstName"] })
    )?.toObject();
    expect(document).toEqual({ firstName: "John" });
  });

  it("should return an sorted array of documents", async () => {
    const expected = [
      { age: 25 },
      { age: 21 },
      { age: 21 },
      { age: 18 },
      { age: 15 },
    ];
    await expect(
      user.find(
        { $or: [{ age: { $in: [25, 21] } }, { age: { $lte: 20 } }] },
        { select: ["age"], sort: { flag: "desc", property: "age" } }
      )
    ).resolves.toEqual(factoryDocument(expected));
  });

  it("should return 3 documents", async () => {
    const length = (await user.find({}, { limit: 3 })).length;
    expect(length).toBe(3);
  });

  it("should begin to search from 4th document", async () => {
    const documents = (await user.find({}, { offset: 3 })).map((el) =>
      el.toObject()
    );

    const expected = [
      { __id: 4, age: 15, email: "crowly@example.com", firstName: "Crowly" },
      { __id: 5, age: 21, email: "betty@example.com", firstName: "Betty" },
    ];
    expect(documents).toEqual(expected);
  });
});

/**
 * INSERT
 */

describe("inserting documents into database", () => {
  const table1 = [
    { firstName: "item1", email: "item1@example.com", age: 36 },
    { firstName: "item2", email: "item2@example.com" },
  ];

  it.each(table1)("should return created document", async (document) => {
    await expect(user.insertOne(document)).resolves.toEqual(
      factoryDocument({ ...document, __id: (await user.lastIdInsert()) + 1 })
    );
  });

  const table2 = ["insertOne", "add", "create"] as const;
  it.each(table2)("should insert document into database", async (method) => {
    const document = {
      firstName: "item3",
      email: `${method}@example.com`,
      age: 36,
    };
    await user[method](document);
    expect(mockSaveData.mock.calls[0][1]["user"]).toContainEqual({
      ...document,
      __id: await user.lastIdInsert(),
    });
  });

  it("should throw error when creating a new document, constrain", async () => {
    const document = { firstName: "John", email: "john@example.com" };
    await expect(user.insertOne(document)).rejects.toThrow();
  });

  it("should return created entities", async () => {
    const items: Pick<userType, Exclude<keyof userType, "__id">>[] = [
      { firstName: "item6", email: "item6@example.com", age: 36 },
      { firstName: "item7", email: "item7@example.com" },
    ];
    await expect(user.insertMany(items)).resolves.toContainEqual(
      factoryDocument({ ...items[1], __id: 7 })
    );
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

    await user.insertMany(items);
    expect(mockSaveData.mock.calls[0][1]["user"]).toContainEqual(expected[1]);
  });
});

/**
 * UPDATE
 */

describe("updating entities from database", () => {
  const table1: queryType[] = [
    { __id: 1, firstName: "John", email: "john@example.com", id: 1 },
    { email: { $ne: "john@example.com" }, id: 2 },
  ];

  it.each(table1)("should return updated document", async (opts) => {
    const { id, ...query } = opts;
    const expected = structuredClone(
      (db["user"] as Array<userType>).find((el) => el.__id === id)
    );

    expected!.age = 30;
    await expect(user.updateOne({ age: 30 }, query)).resolves.toEqual(
      factoryDocument(expected!)
    );
  });

  it("should update document from database", async () => {
    const expected = {
      __id: 4,
      firstName: "Crowly",
      email: "crowly@example.com",
      age: 35,
    };

    await user.updateOne({ age: 35 }, { __id: 4 });
    expect(mockSaveData.mock.calls[0][1]["user"]).toContainEqual(expected);
  });

  it("should throw an error when update, constrain", async () => {
    await expect(
      user.updateOne({ email: "rick@example.com" }, { __id: 1 })
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
      user.updateMany({ age }, { age: { $in: [25, 15] } })
    ).resolves.toEqual(factoryDocument(expected));
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

    await user.updateMany({ age }, { age: { $in: [25, 15] } });
    expect(mockSaveData.mock.calls[0][1]["user"]).toContainEqual(expected[1]);
  });
});

/**
 * DELETE
 */

describe("deleting entities from database", () => {
  const table1: queryType[] = [
    { __id: 1, firstName: "John", email: "john@example.com", id: 1 },
    { email: { $ne: "john@example.com" }, id: 2 },
  ];

  it.each(table1)("should return deleted  document", async (opts) => {
    const { id, ...query } = opts;
    let expected = structuredClone(
      (db["user"] as Array<userType>).find((el) => el.__id === id)
    );

    expected = utilsFun.defineDocument(
      expected as queryType,
      path_db,
      "user"
    ) as any;
    await expect(user.deleteOne(query)).resolves.toEqual(expected);
  });

  it("should delete document from database", async () => {
    const expected = {
      __id: 4,
      age: 15,
      email: "crowly@example.com",
      firstName: "Crowly",
    };
    await user.deleteOne({ __id: 4 });
    expect(mockSaveData.mock.calls[0][1]["user"]).not.toContainEqual(expected);
  });

  it("should return deleted entities", async () => {
    let expected = [
      { __id: 1, age: 21, email: "john@example.com", firstName: "John" },
      { __id: 5, age: 21, email: "betty@example.com", firstName: "Betty" },
    ];

    expected = utilsFun.defineDocument(expected, path_db, "user") as any;
    await expect(user.deleteMany({ age: 21 })).resolves.toEqual(expected);
  });

  it("should delete entities from database", async () => {
    const expected = {
      __id: 5,
      firstName: "Betty",
      email: "betty@example.com",
      age: 21,
    };

    await user.deleteMany({ age: 21 });
    expect(mockSaveData.mock.calls[0][1]["user"]).not.toContainEqual(expected);
  });
});

describe("unique properties", () => {
  it("should return unique properties", async () => {
    await expect(user.getUniqueKeys()).resolves.toEqual(["email"]);
  });

  it("should return an empty array when no property found.", async () => {
    await user.removeAllUniqueKeys();
    await expect(user.getUniqueKeys()).resolves.toEqual([]);
  });

  // ADDING UNIQUE KEY

  it("should add an unique keys", async () => {
    const expected = {
      collectionName: "user",
      unique: ["email", "firstName"],
    };

    await user.addUniqueKey("firstName");
    expect(mockSaveData.mock.calls[0][1]["__metadata__"]).toContainEqual(
      expected
    );
  });

  const table1 = ["lastName", ["email", "firstName"]];

  it.each(structuredClone(table1))(
    "should add an unique keys / array",
    async (unique) => {
      if (!Array.isArray(unique)) unique = [unique];
      const expected = {
        collectionName: "user",
        unique,
      };

      await user.removeAllUniqueKeys();
      await user.addUniqueKey(unique as any);
      expect(mockSaveData.mock.calls[0][1]["__metadata__"]).toContainEqual(
        expected
      );
    }
  );

  it("should skip when unique keys is already added", async () => {
    await user.addUniqueKey("email");
    expect(mockSaveData).not.toBeCalled();
  });

  it("should return added unique keys", async () => {
    await expect(user.addUniqueKey("age")).resolves.toBe("age");
  });

  it.each(structuredClone(table1))(
    "should return added unique keys / array",
    async (unique) => {
      await expect(user.addUniqueKey(unique as any)).resolves.toEqual(unique);
    }
  );

  // REMOVING UNIQUE keys

  it("should remove an unique keys", async () => {
    const expected = {
      collectionName: "user",
      unique: [],
    };
    await user.removeUniqueKey("email");

    expect(mockSaveData.mock.calls[0][1]["__metadata__"]).toContainEqual(
      expected
    );
  });

  it.each(structuredClone(table1))(
    "should remove an unique keys / array",
    async (unique) => {
      await user.addUniqueKey(unique as any);
      if (!Array.isArray(unique)) unique = [unique];
      const expected = {
        collectionName: "user",
        unique: unique.includes("email") ? [] : ["email"],
      };

      await user.removeUniqueKey(unique as any);
      expect(mockSaveData.mock.calls[0][1]["__metadata__"]).toContainEqual(
        expected
      );
    }
  );

  it("should return deleted unique keys", async () => {
    await expect(user.removeUniqueKey("email")).resolves.toBe("email");
  });

  it.each(structuredClone(table1))(
    "should return deleted unique keys / array",
    async (unique) => {
      await user.addUniqueKey(unique as any);
      await expect(user.removeUniqueKey(unique as any)).resolves.toEqual(
        unique
      );
    }
  );

  it("should return undefined when a provided unique keys is not found", async () => {
    await expect(user.removeUniqueKey("age")).resolves.toBe(undefined);
  });

  it("should return all removed unique keys", async () => {
    const uniqueKeys = ["email", "age", "firstName"] as Array<
      keyof Pick<userType, Exclude<keyof userType, "__id">>
    >;
    await user.addUniqueKey(uniqueKeys);
    await expect(user.removeAllUniqueKeys()).resolves.toEqual(uniqueKeys);
  });

  it("should remove all unique keys", async () => {
    const expected = {
      collectionName: "user",
      unique: [],
    };

    await user.removeAllUniqueKeys();
    expect(mockSaveData.mock.calls[0][1]["__metadata__"]).toContainEqual(
      expected
    );
  });
});
