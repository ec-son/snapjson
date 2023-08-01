import { open, readFile, stat, mkdir } from "node:fs/promises";
import {
  defineDocument,
  formatSize,
  loadData,
  saveData,
  sizeFile,
} from "../src/utils/utils.func";
import { EcDbType } from "../src/type/ec_type";

// jest.mock("util", () => {
//   return {
//     ...jest.requireActual("util"),
//     promisify: jest.fn((fn) => {
//       return fn;
//     }),
//   };
// });

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
 */
describe("saving data into database", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const data: EcDbType = {} as EcDbType;

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
      await saveData(path, data as EcDbType);
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

// describe("checking if a file exists", () => {
//   it("should return true if the file exists", async () => {
//     await expect(isExistFile(path_db)).resolves.toBeTruthy();
//   });

//   const table2 = [
//     { path_db: undefined, return_mock: true },
//     { path_db, return_mock: false },
//   ];

//   it.each(table2)(
//     "should return false if the file does not exist",
//     async ({ path_db, return_mock }) => {
//       (stat as unknown as jest.Mock).mockResolvedValue({
//         isFile: () => return_mock,
//       });
//       await expect(isExistFile(path_db as string)).resolves.toBeFalsy();
//     }
//   );
// });

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
