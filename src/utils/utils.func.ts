import { dirname } from "path";
import { Document } from "../lib/document";
import { open, readFile, stat, mkdir } from "node:fs/promises";
import { DataBaseType } from "../type/orm.type";

/**
 * Loads data from database file.
 * @param path_db path to the database file.
 * @returns Returns data.
 */
async function loadData(path_db: string): Promise<DataBaseType> {
  let data = "";
  try {
    data = await readFile(path_db, { encoding: "utf-8" });
    if (!data || /^\s+$/.test(data)) return {};
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
    return {};
  }

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
  try {
    return JSON.parse(data, reviver);
  } catch (error: any) {
    throw new Error(`Can't Load Database: ${error.message}`);
  }
}

/**
 * Saves data to the database.
 * @param path_db path to the database file.
 * @param data data to save to the database.
 */
async function saveData(path_db: string, data: DataBaseType) {
  let fd = null;
  try {
    if (!data) data = {};
    fd = await open(path_db, "w");
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
    const basepath = dirname(path_db);
    await mkdir(basepath, { recursive: true });
    fd = await open(path_db, "w");
  }
  try {
    await fd.writeFile(JSON.stringify(data, null, 2), { encoding: "utf-8" });
  } finally {
    if (fd) await fd.close();
  }
}

/**
 * Calulates the size of the database and return the size.
 * @param path_db path to the database file.
 * @returns Returns size of the database file.
 */
async function sizeFile(path_db: string): Promise<string> {
  try {
    if (!path_db) throw new Error(`Unable to find database file`);
    const statFile = await stat(path_db);
    return formatSize(statFile.size);
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
 * Creates instance of document.
 * @param documents one document or array of documents.
 * @param path_id path to the database file.
 * @param collectionName name of the collection.
 * @returns Returns instance of document or an array of documents.
 */
function defineDocument<T extends Object>(
  documents: T | T[],
  path_id: string,
  collectionName: string
):
  | (Document<T> & T)
  | Array<Document<T> & T>
  | (Document<T> & Partial<T>)
  | Array<Document<T> & Partial<T>> {
  if (!Array.isArray(documents))
    return new Document<T>(
      structuredClone(documents),
      path_id,
      collectionName
    ) as (Document<T> & Partial<T>) | (Document<T> & T);
  else
    return documents.map(
      (el) =>
        new Document<T>(structuredClone(el), path_id, collectionName) as
          | (Document<T> & Partial<T>)
          | (Document<T> & Partial<T>)
    );
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

export {
  loadData,
  saveData,
  sizeFile,
  convertToObject,
  defineDocument,
  formatSize,
  isEqual,
  compare,
};
