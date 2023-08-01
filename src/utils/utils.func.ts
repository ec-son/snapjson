// import { promisify } from "util";
// import { stat, mkdir } from "fs";
import { dirname } from "path";
import { EcDbType } from "../type/ec_type";
import { Document } from "../lib/document";
import { open, readFile, stat, mkdir } from "node:fs/promises";

// const readFileAsync = promisify(readFile);
// const writeFileAsync = promisify(writeFile);
// const statAsync = promisify(stat);
// const mkdirAsync = promisify(mkdir);
// const openAsync = promisify(open);

/**
 * Check if the database file exists.
 * @param path_db path to the database file.
 * @param isThrow [isThrow=true] when is set to false, it does not throw error but it returns false.
 * @returns returns true if the database file exists, false otherwise.
 */
// async function isExistFile(
//   path_db: string,
//   isThrow: boolean = false
// ): Promise<boolean> {
//   try {
//     if (!path_db) return false;
//     const statFile = await stat(path_db);
//     return statFile.isFile();
//   } catch (error) {
//     if (isThrow) throw error;
//     return false;
//   }
// }

/**
 * load data from database file.
 * @param path_db path to the database file.
 * @returns returns data
 */
async function loadData(path_db: string): Promise<EcDbType> {
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
 * Save data to the database.
 * @param path_db path to the database file.
 * @param data data to save to the database.
 */
async function saveData(path_db: string, data: EcDbType) {
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
 * calulate the size of the database and return the size.
 * @param path_db path to the database file.
 * @returns return size of the database file.
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
 * create instance of document.
 * @param documents one document or array of documents.
 * @param path_id path to the database file.
 * @param collectionName name of the collection.
 * @returns returns instance of document or an array of documents.
 */
function defineDocument<T extends Object>(
  documents: T | T[] | Partial<T> | Array<Partial<T>>,
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
 * format size
 * @param sizeInBytes size in octets
 * @returns return the size formatted.
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

export {
  // isExistFile,
  loadData,
  saveData,
  sizeFile,
  convertToObject,
  defineDocument,
  formatSize,
};
