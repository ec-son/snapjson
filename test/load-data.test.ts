import { loadData } from "../src/utils/load-data";
import * as fs from "node:fs/promises";
import * as utils from "../src/utils/utils.func";
import { DatabaseInfoOptionType } from "../src/types/orm.type";

jest.mock("node:fs/promises");
jest.mock("../src/utils/utils.func");
describe("loadData", () => {
  const mockPath = "/mock/db.json";
  const mockOptions = {
    path_db: "/mock",
    encrypted: false,
    salt: "",
    secretKey: "",
    mode: "dev",
    splitFile: false,
    flag: "orm-info",
  } as DatabaseInfoOptionType;
  beforeEach(() => {
    (utils.getPath as jest.Mock).mockReturnValue(mockPath);
  });
  it('should return empty object if file not found and flag is "orm-info"', async () => {
    (fs.readFile as jest.Mock).mockRejectedValue({ code: "ENOENT" });
    const result = await loadData(mockOptions);
    expect(result).toEqual({});
  });
  it("should return parsed data if file exists", async () => {
    const json = JSON.stringify({ databaseInfo: { name: "Test" } });
    (fs.readFile as jest.Mock).mockResolvedValue(json);
    (utils.decodeData as jest.Mock).mockResolvedValue(JSON.parse(json));
    const result = await loadData(mockOptions);
    expect(result).toEqual({ name: "Test" });
  });
  it("should throw if decoding fails", async () => {
    (fs.readFile as jest.Mock).mockResolvedValue("invalid json");
    (utils.decodeData as jest.Mock).mockRejectedValue(
      new Error("decode error")
    );
    await expect(loadData(mockOptions)).rejects.toThrow(
      "Can't Load Database: decode error"
    );
  });
});
