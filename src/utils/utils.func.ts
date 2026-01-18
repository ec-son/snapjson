import { join } from "path";
import { stat, rm } from "node:fs/promises";
import {
  CollectionInfoType,
  DatabaseInfoOptionType,
  RelationType,
} from "../types/orm.type";
import { decrypt, encrypt } from "./cryptoUtil";
import { loadData } from "./load-data";

/**
 * Encodes the given data according to the options.
 * If the data is to be encrypted, it will be encrypted using the secret key and salt.
 * Otherwise, it will be converted to a JSON string.
 * If the mode is "dev", the JSON string will be formatted with indentation of 2 spaces.
 * @param {any} data - The data to be encoded.
 * @param {DatabaseInfoOptionType} opt - The options for encoding the data.
 * @returns {Promise<string>} The encoded data as a string.
 */
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

/**
 * Decodes the given data according to the options.
 * If the data is encrypted, it will be decrypted using the secret key and salt.
 * If the mode is "dev", the JSON string will be formatted with indentation of 2 spaces.
 * If the data contains Date objects, they will be converted to ISO strings.
 * @param {any} data - The data to be decoded.
 * @param {DatabaseInfoOptionType} opt - The options for decoding the data.
 * @returns {Promise<any>} The decoded data as a JSON object.
 */
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

/**
 * Returns the path of the database file.
 * If splitFile is true, the path will be determined according to the flag option.
 * If flag is "orm-info" or "collection-info", the path will be "<path_db>/__metadata__.json".
 * Otherwise, the path will be "<path_db>/<flag>.json".
 * If splitFile is false, the path will be "<path_db>/db.json".
 * If encrypted is true, the path will have ".crypt" appended to the end.
 * @param {DatabaseInfoOptionType} opt - The options for getting the path of the database file.
 * @returns {string} The path of the database file.
 */
export function getPath(opt: DatabaseInfoOptionType): string {
  let path_db = "";
  if (opt.splitFile) {
    if (opt.flag === "orm-info" || opt.flag === "collection-info")
      path_db = join(opt.path_db, "__metadata__.json");
    else path_db = join(opt.path_db, opt.flag + ".json");
  } else path_db = join(opt.path_db, "db.json");

  if (opt.encrypted) path_db += ".crypt";
  return path_db;
}

/**
 * Removes the file at the specified path.
 * @param {string} path - Path to the file to be removed.
 * @returns {Promise<void>} A promise that resolves when the file has been removed.
 * @throws {Error} If the file does not exist or the removal fails.
 */
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
 * Formats the file size with the appropriate unit.
 * @param sizeInBytes - Size in bytes
 * @returns Returns the formatted size string (e.g., "1.5 MB")
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
 * Compares two values for deep equality.
 * Supports primitives, Date objects, and arrays.
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns Returns true if values are deeply equal, false otherwise
 * @example
 *  console.log(isEqual(1, 2)); // false
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
 * Compares two values (number, string, or Date) using the specified operator.
 * @param a - First value to compare
 * @param b - Second value to compare
 * @param op - Operator: "gt" (greater than), "gte" (greater or equal), "lt" (less than), "lte" (less or equal)
 * @returns Returns true if the condition is met, false otherwise
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
