import { open, readFile, stat } from "node:fs/promises";
import {
  compare,
  encodeData,
  decodeData,
  formatSize,
  getPath,
  isEqual,
  sizeFile,
} from "../src/utils/utils.func";
import { loadData } from "../src/utils/load-data";
import { normalize } from "node:path";
import * as cryptoModule from "../src/utils/cryptoUtil";

jest.mock("../src/utils/cryptoUtil");
jest.mock("../src/utils/load-data");
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
 * encodeData
 * decodeData
 * getPath
 * sizeFile
 * formatSize
 * isEqual
 * compare
 */

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

  it("should retrn database size", async () => {
    (stat as unknown as jest.Mock).mockResolvedValue({ size: 100234 });
    await expect(sizeFile()).resolves.toBe("97.9 KB");
  });

  it("should return O B when database file doesn't exist", async () => {
    (stat as unknown as jest.Mock).mockRejectedValueOnce({ code: "ENOENT" });
    await expect(sizeFile()).resolves.toBe("0 B");
  });

  it("should throw when getting database size", async () => {
    (stat as unknown as jest.Mock).mockRejectedValueOnce(
      new Error("Unknown error")
    );
    await expect(sizeFile()).rejects.toThrow();
  });

  it("should return database size when splitfile is false", async () => {
    (stat as jest.Mock).mockResolvedValueOnce({ size: 10 });

    await expect(sizeFile()).resolves.toBe("10 B");
  });

  it("should return database size when splitfile is true", async () => {
    (loadData as jest.Mock).mockResolvedValueOnce([
      { collectionName: "student", unique: [] },
      { collectionName: "marks", unique: [] },
    ]);

    (stat as jest.Mock).mockImplementation((flag) => {
      if (flag === normalize("db/__metadata__.json")) return { size: 10 };
      else if (flag === normalize("db/student.json")) return { size: 10 };
      else if (flag === normalize("db/marks.json")) return { size: 10 };
    });

    await expect(
      sizeFile({ splitFile: true, flag: "orm-info", path_db: "db" })
    ).resolves.toBe("30 B");
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

describe("getPath", () => {
  it("should return __metadata__.json for orm-info", () => {
    expect(getPath({ splitFile: true, flag: "orm-info", path_db: "/db" })).toBe(
      normalize("/db/__metadata__.json")
    );
  });
  it("should return collection-info file path", () => {
    expect(
      getPath({ splitFile: true, flag: "collection-info", path_db: "/db" })
    ).toBe(normalize("/db/__metadata__.json"));
  });
  it("should return specific file path", () => {
    expect(getPath({ splitFile: true, flag: "users", path_db: "/db" })).toBe(
      normalize("/db/users.json")
    );
  });

  it("should return file path with .json.encrpt extention", () => {
    expect(
      getPath({
        splitFile: true,
        flag: "users",
        path_db: "/db",
        encrypted: true,
      })
    ).toBe(normalize("/db/users.json.crypt"));
  });

  it("should return single file db.json if not split", () => {
    expect(getPath({ splitFile: false, flag: "any", path_db: "/db" })).toBe(
      normalize("/db/db.json")
    );
  });
});

describe("encodeData", () => {
  const opt = {
    path_db: "/db",
    splitFile: false,
    flag: "any",
  };

  it("should return encrypted string if opt.encrypted is true", async () => {
    (cryptoModule.encrypt as jest.Mock).mockReturnValue("enc::mocked");
    const result = await encodeData(
      { name: "Alice" },
      { encrypted: true, secretKey: "key", salt: "salt", mode: "prod", ...opt }
    );
    expect(result).toBe("enc::mocked");
    expect(cryptoModule.encrypt).toHaveBeenCalled();
  });
  it("should stringify normally in prod mode if not encrypted", async () => {
    const result = await encodeData(
      { name: "Bob" },
      { encrypted: false, secretKey: "", salt: "", mode: "prod", ...opt }
    );
    expect(result).toBe(JSON.stringify({ name: "Bob" }));
  });
});

describe("decodeData", () => {
  const mockDecrypted =
    '{"name":"John","createdAt":"2024-01-01T00:00:00.000Z"}';
  const opt = {
    path_db: "/db",
    splitFile: false,
    flag: "any",
  };

  beforeEach(() => {
    (cryptoModule.decrypt as jest.Mock).mockReturnValue(mockDecrypted);
  });
  it("should decrypt if encrypted and prefixed with enc::", async () => {
    const result = await decodeData("enc::xxx", {
      encrypted: true,
      secretKey: "key",
      salt: "salt",
      mode: "prod",
      ...opt,
    });
    expect(result.name).toBe("John");
    expect(result.createdAt).toBeInstanceOf(Date);
  });
  it("should parse JSON if not encrypted", async () => {
    const raw = JSON.stringify({ name: "Test" });
    const result = await decodeData(raw, {
      encrypted: false,
      secretKey: "",
      salt: "",
      mode: "prod",
      ...opt,
    });
    expect(result.name).toBe("Test");
  });
  it("should throw error if encrypted is false but data is encrypted", async () => {
    await expect(
      decodeData("enc::xxx", {
        encrypted: false,
        secretKey: "",
        salt: "",
        mode: "prod",
        ...opt,
      })
    ).rejects.toThrow(/Decryption error/);
  });
});
