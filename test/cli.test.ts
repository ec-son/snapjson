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

    it("should show help with --help flag", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "--help"];

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

    it("should show version with --version flag", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "--version"];

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

    it("should show error for invalid create subcommand without arg: -r,-c", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "create"];

      await cli.run();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid argument")
      );

      process.argv = originalArgv;
    });

    it("should show error for invalid create flag", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "create", "-x"];

      await cli.run();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid argument")
      );

      process.argv = originalArgv;
    });

    it("should show error for invalid list flag", async () => {
      // Setup configured database
      if (!existsSync(".env")) {
        writeFileSync(
          ".env",
          "SNAPJSON_PATH_DB=db\nNODE_ENV=development\nSNAPJSON_SPLITFILE=false\nSNAPJSON_ENCRYPTED=false\n"
        );
      }

      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "list", "-x"];

      await cli.run();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid flag")
      );

      process.argv = originalArgv;
    });

    it("should show error for invalid delete flag", async () => {
      if (!existsSync(".env")) {
        writeFileSync(
          ".env",
          "SNAPJSON_PATH_DB=db\nNODE_ENV=development\nSNAPJSON_SPLITFILE=false\nSNAPJSON_ENCRYPTED=false\n"
        );
      }

      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "delete", "-x"];

      await cli.run();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid flag")
      );

      process.argv = originalArgv;
    });

    it("should handle version error gracefully", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "--version"];

      (utils.showVersion as jest.Mock).mockImplementation(() => {
        throw new Error("Version file not found");
      });

      await cli.run();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("expected error")
      );

      process.argv = originalArgv;
    });
  });

  describe("init command", () => {
    it("should initialize database with default config using -y flag", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "init", "-y"];

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      process.argv = originalArgv;
    });

    it("should initialize database with --yes flag", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "init", "--yes"];

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      process.argv = originalArgv;
    });

    it("should handle init with i shorthand", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "i", "-y"];

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      process.argv = originalArgv;
    });
  });

  describe("create command", () => {
    beforeEach(() => {
      writeFileSync(
        ".env",
        "SNAPJSON_PATH_DB=db\nNODE_ENV=development\nSNAPJSON_SPLITFILE=false\nSNAPJSON_ENCRYPTED=false\n"
      );
    });

    it("should handle create collection with c shorthand", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "c", "-c"];

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Database is not configured")
      );

      process.argv = originalArgv;
    });

    it("should handle create collection with --collection", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "create", "--collection"];

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Database is not configured")
      );

      process.argv = originalArgv;
    });

    it("should handle create relation with r shorthand", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "c", "-r"];

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Database is not configured")
      );

      process.argv = originalArgv;
    });

    it("should handle create relation with --relation", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "create", "--relation"];

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Database is not configured")
      );

      process.argv = originalArgv;
    });
  });

  describe("list command", () => {
    beforeEach(() => {
      writeFileSync(
        ".env",
        "SNAPJSON_PATH_DB=db\nNODE_ENV=development\nSNAPJSON_SPLITFILE=false\nSNAPJSON_ENCRYPTED=false\n"
      );

      (SnapJson as jest.Mock).mockImplementation(() => ({
        getCollections: jest.fn().mockResolvedValue(["users", "posts"]),
        getRelations: jest.fn().mockResolvedValue([]),
      }));
    });

    it("should list collections with l shorthand", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "l", "-c"];

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Database is not configured")
      );

      process.argv = originalArgv;
    });

    it("should list collections with --collection", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "list", "--collection"];

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Database is not configured")
      );

      process.argv = originalArgv;
    });

    it("should list relations with -r flag", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "list", "-r"];

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Database is not configured")
      );

      process.argv = originalArgv;
    });

    it("should list relations with --relation", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "list", "--relation"];

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Database is not configured")
      );

      process.argv = originalArgv;
    });
  });

  describe("delete command", () => {
    beforeEach(() => {
      if (existsSync(".env")) {
        unlinkSync(".env");
      }
      writeFileSync(
        ".env",
        "SNAPJSON_PATH_DB=db\nNODE_ENV=development\nSNAPJSON_SPLITFILE=false\nSNAPJSON_ENCRYPTED=false\n"
      );

      (SnapJson as jest.Mock).mockImplementation(() => ({
        removeCollection: jest.fn().mockResolvedValue(["users"]),
        deleteRelation: jest.fn().mockResolvedValue([]),
        getCollections: jest.fn().mockResolvedValue(["users", "posts"]),
      }));
    });

    it("should delete collections with d shorthand", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "d", "-c"];

      (utils.question as jest.Mock).mockResolvedValueOnce("users");

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Database is not configured")
      );

      process.argv = originalArgv;
    });

    it("should delete collections with --collection", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "delete", "--collection"];

      (utils.question as jest.Mock).mockResolvedValueOnce("users");

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Database is not configured")
      );

      process.argv = originalArgv;
    });

    it("should delete relations with -r flag", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "delete", "-r"];

      (utils.question as jest.Mock)
        .mockResolvedValueOnce("posts")
        .mockResolvedValueOnce("users");

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Database is not configured")
      );

      process.argv = originalArgv;
    });

    it("should delete relations with --relation", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "delete", "--relation"];

      (utils.question as jest.Mock)
        .mockResolvedValueOnce("posts")
        .mockResolvedValueOnce("users");

      await cli.run();

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Database is not configured")
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

    it("should show error if database not configured for delete command", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "snapjson", "delete", "-c"];

      await cli.run();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("not configured")
      );

      process.argv = originalArgv;
    });
  });
});
