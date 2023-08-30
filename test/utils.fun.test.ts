import { open, readFile, stat } from "node:fs/promises";
import {
  compare,
  defineDocument,
  formatSize,
  isEqual,
  loadData,
  saveData,
  sizeFile,
} from "../src/utils/utils.func";
import { DataBaseType } from "../src/types/orm.type";

jest.mock("node:fs/promises", () => {
  return {
    ...jest.requireActual("fs"),
    open: jest.fn(),
    readFile: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn().mockResolvedValue({ isFile: () => true }),
  };
});

const mockWriteFile = jest.fn();
const mockClose = jest.fn();
(open as unknown as jest.Mock).mockResolvedValue({
  writeFile: mockWriteFile,
  close: mockClose,
});

const path_db = "db.json";

/**
 * saveData
 * loadData
 * defineDocument
 * sizeFile
 * formatSize
 * isEqual
 * compare
 */
describe("saving data into database", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const data: DataBaseType = {} as DataBaseType;

  const table = [
    {
      path: path_db,
      data,
      expected: [JSON.stringify(data), { encoding: "utf-8" }],
    },
    {
      path: path_db,
      data: undefined,
      expected: [JSON.stringify(data), { encoding: "utf-8" }],
    },
  ];
  it.each(table)(
    "should save data into database",
    async ({ path, data, expected }) => {
      await saveData(path, data as DataBaseType);
      expect(mockWriteFile).toHaveBeenNthCalledWith(1, ...expected);
    }
  );

  it("should create path if it does not exist", async () => {
    (open as unknown as jest.Mock).mockRejectedValueOnce({ code: "ENOENT" });
    await saveData(path_db, data);
    expect(mockWriteFile).toHaveBeenNthCalledWith(1, JSON.stringify(data), {
      encoding: "utf-8",
    });
  });

  it("should close the file after writing", async () => {
    await saveData(path_db, data);
    expect(mockClose).toBeCalled();
  });

  it("should throw when saving", async () => {
    (open as unknown as jest.Mock).mockRejectedValue(new Error("Async error"));
    await expect(saveData(path_db, data)).rejects.toThrow();
  });
});

describe("loading data from database", () => {
  const table1 = [
    { data: '{"user" : []}', expected: { user: [] } },
    { data: undefined },
    { data: "" },
    { data: "   " },
    {
      data: `
    
    `,
    },
    {
      data: `
    
    {}

    `,
    },
  ];
  it.each(table1)(
    "should load data from database",
    async ({ data, expected }) => {
      if (!expected) {
        (expected as any) = {};
      }
      (readFile as unknown as jest.Mock).mockResolvedValue(data);
      await expect(loadData(path_db)).resolves.toEqual(expected);
    }
  );

  it("should throw an error when data is not valid JSON", async () => {
    (readFile as unknown as jest.Mock).mockResolvedValue("data");
    await expect(loadData(path_db)).rejects.toThrow();
  });
});

describe("define document", () => {
  it("should return an object with specified properties", () => {
    const document = { __id: 1, name: "name", age: 12 };
    const expected = defineDocument<typeof document>(document, path_db, "user");
    expect(defineDocument(document, path_db, "user")).toEqual(expected);
  });

  it("should return an object with specified properties", () => {
    const document = [
      { __id: 1, name: "name1", age: 17 },
      { __id: 2, name: "name2", age: 18 },
      { __id: 3, name: "name3", age: 19 },
    ];
    const expected = defineDocument<typeof document>(document, path_db, "user");
    expect(defineDocument(document, path_db, "user")).toEqual(expected);
  });
});

describe("format size", () => {
  const table1 = [
    { size: 100, expected: "100 B" },
    { size: 1050, expected: "1 KB" },
    { size: 19050, expected: "18.6 KB" },
    { size: 1905083, expected: "1.8 MB" },
    { size: 1990005083, expected: "1.9 GB" },
    { size: 1900900500083, expected: "1.7 TB" },
    { size: 1900900500083987, expected: "1728.9 TB" },
  ];

  it.each(table1)("should a format size", ({ size, expected }) => {
    expect(formatSize(size)).toBe(expected);
  });

  it("should rteurn database size", async () => {
    (stat as unknown as jest.Mock).mockResolvedValue({ size: 100234 });
    await expect(sizeFile(path_db)).resolves.toBe("97.9 KB");
  });

  it("should return O B when database file does not exist", async () => {
    (stat as unknown as jest.Mock).mockRejectedValueOnce({ code: "ENOENT" });
    await expect(sizeFile(path_db)).resolves.toBe("0 B");
  });

  it("should throw when getting database size", async () => {
    (stat as unknown as jest.Mock).mockRejectedValueOnce(
      new Error("Unknown error")
    );
    await expect(sizeFile(path_db)).rejects.toThrow();
  });
});

describe("isEqual function", () => {
  const table1 = [
    { a: 1, b: 2, expected: false },
    { a: 1, b: 1, expected: true },
    { a: "yes", b: "no", expected: false },
    { a: new Date("2013/05/12"), b: new Date("2013/05/12"), expected: true },
    { a: [1, 2, 3], b: [1, 2, 3], expected: true },
    { a: [1, 2, 3], b: [3, 2, 1], expected: false },
    { a: [1, 2, [3]], b: [1, 2, [3]], expected: true },
  ];

  it.each(table1)(
    "should return boolean showing equality",
    ({ a, b, expected }) => {
      expect(isEqual(a, b)).toBe(expected);
    }
  );
});

describe("compare function", () => {
  const table2 = [
    { a: 1, b: 2, op: "gt", expected: false },
    { a: 2, b: 1, op: "gt", expected: true },
    { a: 1, b: 2, op: "gte", expected: false },
    { a: 2, b: 1, op: "gte", expected: true },
    { a: 1, b: 2, op: "lt", expected: true },
    { a: 2, b: 1, op: "lt", expected: false },
    { a: 1, b: 2, op: "lte", expected: true },
    { a: 2, b: 1, op: "lte", expected: false },
    { a: "yes", b: "no", op: "gt", expected: true },
    {
      a: new Date("2013/05/10"),
      op: "lt",
      b: new Date("2013/05/12"),
      expected: true,
    },
  ];

  it.each(table2)(
    "should return boolean showing comparaison",
    ({ a, b, op, expected }) => {
      expect(compare(a, b, op as any)).toBe(expected);
    }
  );
});
