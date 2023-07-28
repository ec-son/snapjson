import { promisify } from "util";
import { readFile, writeFile, stat } from "fs";
import { EcDbType } from "../ec_type";

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);
const statAsync = promisify(stat);

async function isExistFile(
  path_db: string,
  isThrow: boolean = false
): Promise<boolean> {
  try {
    if (!path_db) return false;
    const statFile = statAsync(path_db);
    return (await statFile).isFile();
  } catch (error) {
    if (isThrow) throw error;
    return false;
  }
}

async function loadData(path_db: string): Promise<EcDbType> {
  let data = "";
  try {
    if (!(await isExistFile(path_db, true))) throw new Error();
    data = await readFileAsync(path_db, { encoding: "utf8" });

    data = /^\W*\{.*\}\W*$/.test(data) ? data : "{}";
  } catch (error: any) {
    throw new Error(`Unable to find database file: ${error.message}`);
  }

  try {
    return JSON.parse(data);
  } catch (error: any) {
    throw new Error(
      `Unable to convert JSON into JavaScript Object: ${error.message}`
    );
  }
}

async function saveData(path_db: string, data: EcDbType) {
  try {
    if (!data) data = {};
    if (!(await isExistFile(path_db, true))) throw new Error("error");
    await writeFileAsync(path_db, JSON.stringify(data, null, 2), {
      encoding: "utf8",
    });
  } catch (error: any) {
    throw new Error(`Unable to find database file: ${error.message}`);
  }
}

export { loadData, saveData, isExistFile };
