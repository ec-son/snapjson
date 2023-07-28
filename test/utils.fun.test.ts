import { writeFile, stat, readFile } from "fs";
import { isExistFile, loadData, saveData } from "../src/utils/utils.func";

import { EcDbType } from "../src/ec_type";

jest.mock("util", () => {
  return {
    ...jest.requireActual("util"),
    promisify: jest.fn((fn) => {
      return fn;
    }),
  };
});

jest.mock("fs", () => {
  return {
    ...jest.requireActual("fs"),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn().mockResolvedValue({ isFile: () => true }),
  };
});

const path_db = "db.json";

/**
 * saveData
 * loadData
 * isExistFile
 */
describe("saving data into database", () => {
  const data = {};

  const table = [
    {
      nth: 1,
      path: path_db,
      data: {},
      expected: [path_db, JSON.stringify(data), { encoding: "utf8" }],
    },
    {
      nth: 2,
      path: path_db,
      data: undefined,
      expected: [path_db, JSON.stringify(data), { encoding: "utf8" }],
    },
  ];
  it.each(table)(
    "sould save data into database",
    async ({ path, data, expected, nth }) => {
      await saveData(path, data as EcDbType);
      expect(writeFile).toHaveBeenNthCalledWith(nth, ...expected);
    }
  );

  it("should throw when saving", async () => {
    (writeFile as unknown as jest.Mock).mockRejectedValue(
      new Error("Async error")
    );
    await expect(saveData(path_db, data)).rejects.toThrow();
  });
});

describe("loading data from database", () => {
  const table1 = [
    { data: '{"user" : []}', expected: { user: [] } },
    { data: undefined, expected: {} },
    { data: "", expected: {} },
    { data: "data", expected: {} },
  ];
  it.each(table1)(
    "should load data from database",
    async ({ data, expected }) => {
      (readFile as unknown as jest.Mock).mockResolvedValue(data);
      await expect(loadData(path_db)).resolves.toEqual(expected);
    }
  );

  it("should throw when loading", async () => {
    (readFile as unknown as jest.Mock).mockResolvedValue("{}");
    await expect(loadData("")).rejects.toThrow();
  });
});

describe("checking if a file exists", () => {
  it("should return true if the file exists", async () => {
    await expect(isExistFile(path_db)).resolves.toBeTruthy();
  });

  const table2 = [
    { path_db: undefined, return_mock: true },
    { path_db, return_mock: false },
  ];

  it.each(table2)(
    "should return false if the file does not exist",
    async ({ path_db, return_mock }) => {
      (stat as unknown as jest.Mock).mockResolvedValue({
        isFile: () => return_mock,
      });
      await expect(isExistFile(path_db as string)).resolves.toBeFalsy();
    }
  );
});
