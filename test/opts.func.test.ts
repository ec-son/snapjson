import { getOpts } from "../src/utils/opts.func";

/**
 * getEnvBoolean
 * getOpts
 */

describe("opts", () => {
  it("should return opts set to env", () => {
    process.env.SNAPJSON_PATH_DB = "db";
    process.env.NODE_ENV = "env";
    process.env.SNAPJSON_SPLITFILE = "true";
    process.env.SNAPJSON_ENCRYPTED = "false";
    process.env.SNAPJSON_SECRETKEY = "";
    process.env.SNAPJSON_SALT = "salt";

    const expected = {
      path_db: "db",
      mode: "dev",
      splitFile: true,
      encrypted: false,
      secretKey: "",
      salt: "salt",
    };

    expect(getOpts()).toEqual(expected);
  });

  it("should return opts got from opts arg", () => {
    const expected = {
      path_db: "database",
      mode: "prod",
      splitFile: false,
      encrypted: false,
      secretKey: "0f08ff183412",
      salt: "20832294-afea-48b9-a4be-0f08ff183412",
    };

    expect(getOpts(expected as any)).toEqual(expected);
  });

  it("should return opts got from opts arg in lieu of env", () => {
    process.env.SNAPJSON_PATH_DB = "db";
    process.env.NODE_ENV = "env";
    process.env.SNAPJSON_SPLITFILE = "true";
    process.env.SNAPJSON_ENCRYPTED = "false";
    process.env.SNAPJSON_SECRETKEY = "";
    process.env.SNAPJSON_SALT = "";

    const expected = {
      path_db: "database",
      mode: "prod",
      splitFile: false,
      encrypted: true,
      secretKey: "0f08ff183412",
      salt: "20832294-afea-48b9-a4be-0f08ff183412",
    };

    expect(getOpts(expected as any)).toEqual(expected);
  });

  it("should return opts got from opts arg and from env", () => {
    process.env.SNAPJSON_PATH_DB = "db";
    process.env.NODE_ENV = "env";
    process.env.SNAPJSON_SPLITFILE = "true";
    process.env.SNAPJSON_ENCRYPTED = "false";
    process.env.SNAPJSON_SECRETKEY = "";
    process.env.SNAPJSON_SALT = "";

    const expected = {
      path_db: "database",
      mode: "dev",
      splitFile: true,
      encrypted: false,
      secretKey: "",
      salt: "",
    };

    expect(getOpts({ path_db: "database" })).toEqual(expected);
  });

  it("should return a default opts", () => {
    const expected = {
      path_db: "db",
      mode: "dev",
      splitFile: true,
      encrypted: false,
      secretKey: "",
      salt: "",
    };

    expect(getOpts()).toEqual(expected);
  });
});
