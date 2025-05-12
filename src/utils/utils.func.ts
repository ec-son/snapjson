import { join } from "path";
import { stat, rm } from "node:fs/promises";
import { CollectionInfoType, DatabaseInfoOptionType } from "../types/orm.type";
import { decrypt, encrypt } from "./cryptoUtil";
import { loadData } from "./load-data";

export async function encodeData(
  data: any,
  opt: DatabaseInfoOptionType
): Promise<string> {
  if (opt.encrypted)
    return encrypt(JSON.stringify(data), opt.secretKey, opt.salt);
  else
    return opt.mode === "dev"
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
}

export async function decodeData(
  data: any,
  opt: DatabaseInfoOptionType
): Promise<any> {
  const reviver = (key: string, value: string) => {
    const dateRegex = new RegExp(
      "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}",
      "m"
    );
    if (typeof value == "string" && dateRegex.test(value)) {
      return new Date(value);
    }
    return value;
  };

  if (opt.encrypted) {
    if (data.startsWith("enc::"))
      return JSON.parse(decrypt(data, opt.secretKey, opt.salt), reviver);
    return JSON.parse(data, reviver);
  } else {
    if (data.startsWith("enc::"))
      throw new Error(
        "Decryption error: the data appears to be encrypted but 'encrypted' option is false. Set 'ecrypted: true' to decrypt properly."
      );
    return JSON.parse(data, reviver);
  }
}

export function getPath(opt: DatabaseInfoOptionType): string {
  let path_db = "";
  if (opt.splitFile) {
    if (opt.flag === "orm-info" || opt.flag === "collection-info")
      path_db = join(opt.path_db, "__metadata__.json");
    else path_db = join(opt.path_db, opt.flag + ".json");
  } else path_db = join(opt.path_db, "db.json");

  return path_db;
}

export async function removeFile(path: string) {
  await rm(path);
}

/**
 * Calulates the size of the database and return the size.
 * @param path_db path to the database file.
 * @returns Returns size of the database file.
 */
async function sizeFile(opt?: DatabaseInfoOptionType): Promise<string> {
  if (!opt) {
    opt = {
      path_db: "db",
      flag: "orm-info",
      splitFile: false,
    };
  } else opt.flag = "orm-info";

  try {
    if (!opt.splitFile) {
      const path_db = getPath(opt);
      const statFile = await stat(path_db);
      return formatSize(statFile.size);
    }

    const collectionTab = (
      (await loadData({
        ...opt,
        flag: "collection-info",
      })) as CollectionInfoType[]
    ).map((el) => el.collectionName);
    let size = (await stat(getPath(opt))).size;

    for (const collectionName of collectionTab) {
      try {
        size += (await stat(getPath({ ...opt, flag: collectionName }))).size;
      } catch (error) {}
    }

    return formatSize(size);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return "0 B";
    }

    throw error;
  }
}

function convertToObject(tab: string | Array<string>, _obj?: {}) {
  if (!Array.isArray(tab)) tab = [tab];
  const obj: Record<string, Array<{}>> = _obj || {};
  tab.forEach((el) => {
    obj[el] = [];
  });

  return obj;
}

/**
 * Format size.
 * @param sizeInBytes size in octets
 * @returns Returns the size formatted.
 */
function formatSize(sizeInBytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = sizeInBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${parseFloat(size.toFixed(1))} ${units[unitIndex]}`;
}

/**
 * Compare two values.
 * @param a
 * @param b
 * @returns Returns true if they are equal, false otherwise
 * @example
 *  console.log(isEqual(1, 2)); // true
 *  console.log(isEqual("hello", "hello")); // true
 *  console.log(isEqual(new Date(), new Date())); // true
 *  console.log(isEqual([1, 3, 2], [2, 1, 3])); // true
 */
function isEqual(a: any, b: any) {
  if (a === b) return true;

  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length || !a.every((v, i) => isEqual(v, b[i])))
      return false;
    return true;
  }

  return false;
}

/**
 * Compares two values (namber or string, Date).
 * @param a
 * @param b
 * @param op operator, gt, gte, lt, lte
 * @returns returns a boolean, true or false
 * @example
 * console.log(compare(2, 1, "gt")); // true
 * console.log(compare(1, 2, "gt")); // false
 * console.log(compare("world", "hello", "gt")); // true
 * console.log(compare("hello", "world", "gt")); // false
 * console.log(compare(new Date(2000, 1, 5), new Date(2000, 1, 1), "gt")); // true
 * console.log(compare(new Date(2000, 1, 1), new Date(2000, 1, 5), "gt")); // false
 */
function compare(
  a: number | string | Date,
  b: number | string | Date,
  op: "gt" | "gte" | "lt" | "lte"
): boolean {
  if (typeof a === "number" && typeof b === "number") {
    switch (op) {
      case "gt":
        return a > b;
      case "gte":
        return a === b || a > b;
      case "lt":
        return a < b;
      case "lte":
        return a === b || a < b;
      default:
        return false;
    }
  } else if (typeof a === "string" && typeof b === "string")
    return compare(a.localeCompare(b), b.localeCompare(a), op);
  else if (a instanceof Date && b instanceof Date)
    return compare(a.getTime(), b.getTime(), op);
  return false;
}

export { sizeFile, convertToObject, formatSize, isEqual, compare };
