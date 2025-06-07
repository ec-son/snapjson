import { DatabaseInfoOptionType } from "src/types/orm.type";

function getEnvBoolean(key: any, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  return value === undefined ? defaultValue : value === "true";
}

export function getOpts(
  opt: Partial<
    Pick<DatabaseInfoOptionType, Exclude<keyof DatabaseInfoOptionType, "flag">>
  > = {}
): Pick<DatabaseInfoOptionType, Exclude<keyof DatabaseInfoOptionType, "flag">> {
  const t = {
    path_db: opt.path_db || process.env.SNAPJSON_PATH_DB || "db",
    mode: opt.mode || (process.env?.NODE_ENV === "production" ? "prod" : "dev"),
    splitFile: opt.splitFile || getEnvBoolean("SNAPJSON_SPLITFILE"),
    encrypted: opt.encrypted || getEnvBoolean("SNAPJSON_ENCRYPTED"),
    secretKey: opt.secretKey || process.env.SNAPJSON_SECRETKEY,
    salt: opt.salt || process.env.SNAPJSON_SALT,
  } as Pick<
    DatabaseInfoOptionType,
    Exclude<keyof DatabaseInfoOptionType, "flag">
  >;
  return t;
}
