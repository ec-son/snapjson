import { readFile } from "node:fs/promises";
import {
  CollectionInfoType,
  CollectionType,
  DatabaseInfoOptionType,
  OrmInfoType,
} from "../types/orm.type";
import { decodeData, getPath } from "./utils.func";

/**
 * Loads data from database file.
 * @param opt
 * @returns Returns data.
 */
export async function loadData(
  opt: DatabaseInfoOptionType,
  loadAll: boolean = false
): Promise<OrmInfoType | CollectionInfoType[] | CollectionType<any>> {
  let { splitFile = false, flag = "orm-info" } = opt;
  const path_db = getPath(opt);

  let data = "";
  try {
    data = await readFile(path_db, { encoding: "utf-8" });
    if (!data || /^\s+$/.test(data)) {
      if (loadAll && !splitFile) return {} as OrmInfoType;
      if (flag === "orm-info") return {} as OrmInfoType;
      else return [] as CollectionInfoType[];
    }
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
    if (loadAll && !splitFile) return {} as OrmInfoType;
    if (flag === "orm-info") return {} as OrmInfoType;
    else return [] as CollectionInfoType[];
  }

  try {
    const DataParsed = await decodeData(data, opt);

    if (splitFile) {
      if (flag === "orm-info")
        return (DataParsed.databaseInfo as OrmInfoType) || ({} as OrmInfoType);
      else if (flag === "collection-info")
        return (
          (DataParsed.collectionInfo as CollectionInfoType[]) ||
          ([] as CollectionInfoType[])
        );
      else return (DataParsed as CollectionType<any>) || [];
    } else {
      if (loadAll) return DataParsed;
      else if (flag === "orm-info")
        return (DataParsed.databaseInfo as OrmInfoType) || ({} as OrmInfoType);
      else if (flag === "collection-info") {
        return (DataParsed.collectionInfo as CollectionInfoType[]) || [];
      } else
        return DataParsed.collectionData && DataParsed.collectionData[flag]
          ? (DataParsed.collectionData[flag] as CollectionType<any>)
          : [];
    }
  } catch (error: any) {
    throw new Error(`Can't Load Database: ${error.message}`);
  }
}
