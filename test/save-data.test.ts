import { saveData } from "../src/utils/save-data";
import * as fs from "node:fs/promises";
import * as utils from "../src/utils/utils.func";
import * as loadDataModule from "../src/utils/load-data";
import { DatabaseInfoOptionType } from "../src/types/orm.type";

jest.mock("node:fs/promises");
jest.mock("../src/utils/utils.func");
jest.mock("../src/utils/load-data");
describe("saveData", () => {
  const mockOptions = {
    path_db: "/mock",
    encrypted: false,
    salt: "",
    secretKey: "",
    mode: "dev",
    splitFile: false,
    flag: "orm-info",
  } as DatabaseInfoOptionType;
  const mockFD = { writeFile: jest.fn(), close: jest.fn() };

  beforeEach(() => {
    (utils.getPath as jest.Mock).mockReturnValue("/mock/db.json");
    (fs.open as jest.Mock).mockResolvedValue(mockFD);
    (utils.encodeData as jest.Mock).mockResolvedValue("encoded-data");
  });
  it("should save orm-info into databaseInfo field", async () => {
    (loadDataModule.loadData as jest.Mock).mockResolvedValue({});
    await saveData([{ name: "My ORM" }], mockOptions);
    expect(mockFD.writeFile).toHaveBeenCalledWith("encoded-data", {
      encoding: "utf-8",
    });
    expect(mockFD.close).toHaveBeenCalled();
  });
  it("should create file path if ENOENT error occurs", async () => {
    (fs.open as jest.Mock).mockRejectedValueOnce({ code: "ENOENT" });
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.open as jest.Mock).mockResolvedValueOnce(mockFD);
    (loadDataModule.loadData as jest.Mock).mockResolvedValue({});
    await saveData([{ name: "Fallback ORM" }], mockOptions);
    expect(fs.mkdir).toHaveBeenCalled();
    expect(mockFD.writeFile).toHaveBeenCalledWith("encoded-data", {
      encoding: "utf-8",
    });
  });
  it("should save collection-info properly when splitFile is true", async () => {
    const options = {
      ...mockOptions,
      splitFile: true,
      flag: "collection-info",
    };
    (loadDataModule.loadData as jest.Mock).mockResolvedValue([]);
    await saveData([{ name: "coll" }], options);
    expect(mockFD.writeFile).toHaveBeenCalled();
  });
});
