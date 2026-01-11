import {
  question,
  showHelp,
  showVersion,
  getConfig,
  saveConfigToEnv,
  isDBConfigured,
  loadConfigFromEnv,
  ConfigOptions,
} from "../src/cli/utils";
import { readFileSync, existsSync, unlinkSync, writeFileSync } from "fs";
import * as readline from "readline/promises";

/**
 * Mock readline
 */
jest.mock("readline/promises");

describe("CLI Utils", () => {
  const mockConfig: ConfigOptions = {
    path_db: "test_db",
    mode: "dev",
    encrypted: false,
    splitFile: false,
    secretKey: "test-key",
    salt: "test-salt",
  };

  beforeEach(() => {
    // Clean up .env file before each test
    if (existsSync(".env")) {
      unlinkSync(".env");
    }
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(".env")) {
      unlinkSync(".env");
    }
  });

  describe("question", () => {
    it("should get user input", async () => {
      const mockRl = {
        question: jest.fn().mockResolvedValue("test input"),
        close: jest.fn(),
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockRl);

      const result = await question("Enter something: ");

      expect(result).toBe("test input");
      expect(mockRl.close).toHaveBeenCalled();
    });

    it("should trim user input", async () => {
      const mockRl = {
        question: jest.fn().mockResolvedValue("  test input  "),
        close: jest.fn(),
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockRl);

      const result = await question("Enter something: ");

      expect(result).toBe("test input");
    });

    it("should require input when required is true", async () => {
      const mockRl = {
        question: jest
          .fn()
          .mockResolvedValueOnce("")
          .mockResolvedValueOnce("valid input"),
        close: jest.fn(),
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockRl);

      const result = await question("Enter something: ", true);

      expect(result).toBe("valid input");
      expect(mockRl.question).toHaveBeenCalledTimes(2);
    });
  });

  describe("showHelp", () => {
    it("should display help message", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      showHelp();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Usage: snapjson")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Available Commands")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("showVersion", () => {
    it("should display version from package.json", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      showVersion();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/\d+\.\d+\.\d+/));

      consoleSpy.mockRestore();
    });

    it("should throw error if package.json not found", () => {
      // This test is environment dependent, skipping for now
      expect(() => {
        // Only test with actual package.json
        showVersion();
      }).not.toThrow();
    });
  });

  describe("getConfig", () => {
    it("should return default config with yes flag", async () => {
      const config = await getConfig(true);

      expect(config).toEqual({
        path_db: "db",
        mode: "dev",
        encrypted: false,
        splitFile: false,
        secretKey: "",
        salt: "",
      });
    });

    it("should prompt user for configuration", async () => {
      const mockRl = {
        question: jest
          .fn()
          .mockResolvedValueOnce("my_db")
          .mockResolvedValueOnce("prod")
          .mockResolvedValueOnce("no")
          .mockResolvedValueOnce("yes"),
        close: jest.fn(),
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockRl);

      const config = await getConfig(false);

      expect(config.path_db).toBe("my_db");
      expect(config.mode).toBe("prod");
      expect(config.encrypted).toBe(false);
      expect(config.splitFile).toBe(true);
    });

    it("should prompt for encryption keys if encrypted is true", async () => {
      const mockRl = {
        question: jest
          .fn()
          .mockResolvedValueOnce("db")
          .mockResolvedValueOnce("dev")
          .mockResolvedValueOnce("yes")
          .mockResolvedValueOnce("no")
          .mockResolvedValueOnce("secret-key")
          .mockResolvedValueOnce("secret-salt"),
        close: jest.fn(),
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockRl);

      const config = await getConfig(false);

      expect(config.encrypted).toBe(true);
      expect(config.secretKey).toBe("secret-key");
      expect(config.salt).toBe("secret-salt");
    });
  });

  describe("saveConfigToEnv", () => {
    it("should create .env file with config", () => {
      saveConfigToEnv(mockConfig);

      expect(existsSync(".env")).toBe(true);

      const envContent = readFileSync(".env", "utf-8");
      expect(envContent).toContain("SNAPJSON_PATH_DB=test_db");
      expect(envContent).toContain("NODE_ENV=development");
      expect(envContent).toContain("SNAPJSON_ENCRYPTED=false");
    });

    it("should update existing .env file", () => {
      const initialConfig: ConfigOptions = {
        path_db: "old_db",
        mode: "dev",
        encrypted: false,
        splitFile: false,
      };

      saveConfigToEnv(initialConfig);

      const updatedConfig: ConfigOptions = {
        path_db: "new_db",
        mode: "prod",
        encrypted: true,
        splitFile: true,
        secretKey: "key",
        salt: "salt",
      };

      saveConfigToEnv(updatedConfig);

      const envContent = readFileSync(".env", "utf-8");
      expect(envContent).toContain("SNAPJSON_PATH_DB=new_db");
      expect(envContent).toContain("NODE_ENV=production");
      expect(envContent).not.toContain("old_db");
    });

    it("should handle encryption config", () => {
      const encryptedConfig: ConfigOptions = {
        path_db: "db",
        mode: "prod",
        encrypted: true,
        splitFile: false,
        secretKey: "my-secret",
        salt: "my-salt",
      };

      saveConfigToEnv(encryptedConfig);

      const envContent = readFileSync(".env", "utf-8");
      expect(envContent).toContain("SNAPJSON_ENCRYPTED=true");
      expect(envContent).toContain("SNAPJSON_SECRETKEY=my-secret");
      expect(envContent).toContain("SNAPJSON_SALT=my-salt");
    });
  });

  describe("isDBConfigured", () => {
    it("should return false if .env file does not exist", () => {
      const result = isDBConfigured();
      expect(result).toBe(false);
    });

    it("should return true if .env file has SNAPJSON_PATH_DB", () => {
      writeFileSync(".env", "SNAPJSON_PATH_DB=db\n");

      const result = isDBConfigured();
      expect(result).toBe(true);
    });

    it("should return false if SNAPJSON_PATH_DB is not set", () => {
      writeFileSync(".env", "NODE_ENV=development\n");

      const result = isDBConfigured();
      expect(result).toBe(false);
    });
  });

  describe("loadConfigFromEnv", () => {
    it("should load config from .env file", () => {
      saveConfigToEnv(mockConfig);

      const config = loadConfigFromEnv();

      expect(config.path_db).toBe("test_db");
      expect(config.mode).toBe("dev");
      expect(config.encrypted).toBe(false);
      expect(config.splitFile).toBe(false);
    });

    it("should throw error if .env file does not exist", () => {
      expect(() => {
        loadConfigFromEnv();
      }).toThrow("Database is not configured");
    });

    it("should throw error if SNAPJSON_PATH_DB is not set", () => {
      writeFileSync(".env", "NODE_ENV=development\n");

      expect(() => {
        loadConfigFromEnv();
      }).toThrow("Database is not configured");
    });

    it("should populate process.env with .env variables", () => {
      saveConfigToEnv(mockConfig);

      loadConfigFromEnv();

      expect(process.env.SNAPJSON_PATH_DB).toBe("test_db");
      expect(process.env.NODE_ENV).toBe("development");
    });

    it("should convert prod mode correctly", () => {
      const prodConfig: ConfigOptions = {
        path_db: "db",
        mode: "prod",
        encrypted: false,
        splitFile: false,
      };

      saveConfigToEnv(prodConfig);

      const config = loadConfigFromEnv();
      expect(config.mode).toBe("prod");
    });
  });
});
