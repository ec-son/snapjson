import { mkdir, open } from "node:fs/promises";
import { dirname } from "path";
import {
  CollectionInfoType,
  CollectionType,
  DatabaseInfoOptionType,
  OrmInfoType,
} from "../types/orm.type";
import { encodeData, getPath } from "./utils.func";
import { loadData } from "./load-data";

/**
 * Saves data to the database.
 * @param opt
 * @param data data to save to the database.
 */
export async function saveData(
  data: OrmInfoType | CollectionInfoType[] | CollectionType<any>,
  opt: DatabaseInfoOptionType
) {
  const write = async (data: any, opt: DatabaseInfoOptionType) => {
    const path_db = getPath(opt);

    let fd = null;
    try {
      fd = await open(path_db, "w");
    } catch (error: any) {
      if (error.code !== "ENOENT") throw error;
      const basepath = dirname(path_db);
      await mkdir(basepath, { recursive: true });
      fd = await open(path_db, "w");
    }

    try {
      const encoding = opt.mode === "prod" ? "" : "utf-8";
      await fd.writeFile(await encodeData(data, opt), { encoding });
    } finally {
      if (fd) await fd.close();
    }
  };

  const { flag = "orm-info" } = opt;

  if (opt.splitFile) {
    if (flag === "orm-info" || flag === "collection-info") {
      const dataToSave: {
        databaseInfo?: OrmInfoType;
        collectionInfo?: CollectionInfoType[];
      } = {};

      if (flag === "orm-info") {
        const db = await loadData({ ...opt, flag: "collection-info" });
        dataToSave.databaseInfo = data as OrmInfoType;
        dataToSave.collectionInfo = db as CollectionInfoType[];
      } else {
        const db = await loadData({ ...opt, flag: "orm-info" });
        dataToSave.collectionInfo = data as CollectionInfoType[];
        dataToSave.databaseInfo = db as OrmInfoType;
      }

      data = dataToSave as any;
    }
  } else {
    const db = (await loadData(opt, true)) as any;

    if (flag === "orm-info") db.databaseInfo = data;
    else if (flag === "collection-info") db.collectionInfo = data;
    else {
      if (!db.collectionData) db["collectionData"] = { [flag]: data };
      else db.collectionData[flag] = data;
    }
    data = db;
  }

  await write(data, opt);
}
