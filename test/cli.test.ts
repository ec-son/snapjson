import { SnapJsonCLI } from "../src/cli/cli";
import * as utils from "../src/cli/utils";
import { SnapJson } from "../src/lib/snapjson";
import { readFileSync, existsSync, unlinkSync, writeFileSync } from "fs";

/**
 * Mock modules
 */
jest.mock("../src/cli/utils", () => ({
  ...jest.requireActual("../src/cli/utils"),
  question: jest.fn(),
  showHelp: jest.fn(),
  showVersion: jest.fn(),
}));

jest.mock("../src/lib/snapjson");

describe("SnapJsonCLI", () => {
  let cli: SnapJsonCLI;
  const consoleSpy = jest.spyOn(console, "log").mockImplementation();
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

  beforeEach(() => {
    cli = new SnapJsonCLI();
    jest.clearAllMocks();
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();

    // Clean up .env file
    if (existsSync(".env")) {
      unlinkSync(".env");
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(".env")) {
      unlinkSync(".env");
    }
  });

  describe("help and version", () => {
    it("should show help with no arguments", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson"];

      await cli.run();

      expect(utils.showHelp).toHaveBeenCalled();

      process.argv = originalArgv;
    });

    it("should show help with -h flag", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "-h"];

      await cli.run();

      expect(utils.showHelp).toHaveBeenCalled();

      process.argv = originalArgv;
    });

    it("should show version with -v flag", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "-v"];

      await cli.run();

      expect(utils.showVersion).toHaveBeenCalled();

      process.argv = originalArgv;
    });
  });

  describe("error handling", () => {
    it("should handle unknown command", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "unknown"];

      await cli.run();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown command")
      );

      process.argv = originalArgv;
    });

    it("should show error for invalid create subcommand", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "create"];

      await cli.run();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid create subcommand")
      );

      process.argv = originalArgv;
    });

    it("should show error for invalid list flag", async () => {
      // Setup configured database
      writeFileSync(
        ".env",
        "SNAPJSON_PATH_DB=db\nNODE_ENV=development\nSNAPJSON_SPLITFILE=false\nSNAPJSON_ENCRYPTED=false\n"
      );

      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "list", "-x"];

      await cli.run();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid list flag")
      );

      process.argv = originalArgv;
    });
  });

  describe("database not configured", () => {
    it("should show error if database not configured for create command", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "create", "-c"];

      await cli.run();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("not configured")
      );

      process.argv = originalArgv;
    });

    it("should show error if database not configured for list command", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "list", "-c"];

      await cli.run();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("not configured")
      );

      process.argv = originalArgv;
    });
  });
});
