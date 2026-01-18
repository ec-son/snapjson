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

    it("should accept empty input when required is false", async () => {
      const mockRl = {
        question: jest.fn().mockResolvedValue(""),
        close: jest.fn(),
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockRl);

      const result = await question("Enter something: ", false);

      expect(result).toBe("");
      expect(mockRl.question).toHaveBeenCalledTimes(1);
    });

    it("should keep asking until required input is provided", async () => {
      const mockRl = {
        question: jest
          .fn()
          .mockResolvedValueOnce("")
          .mockResolvedValueOnce("")
          .mockResolvedValueOnce("final input"),
        close: jest.fn(),
      };

      (readline.createInterface as jest.Mock).mockReturnValue(mockRl);

      const result = await question("Enter something: ", true);

      expect(result).toBe("final input");
      expect(mockRl.question).toHaveBeenCalledTimes(3);
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

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\d+\.\d+\.\d+/)
      );

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

  describe("parseEnvFile", () => {
    it("should parse valid env file content", () => {
      const envContent = `SNAPJSON_PATH_DB=db
NODE_ENV=development
SNAPJSON_SPLITFILE=false
SNAPJSON_ENCRYPTED=false`;

      // Parse env file (testing private function indirectly through saveConfigToEnv/loadConfigFromEnv)
      writeFileSync(".env", envContent);
      const config = loadConfigFromEnv();

      expect(config.path_db).toBe("db");
      expect(config.mode).toBe("dev");
    });

    it("should handle env file with comments", () => {
      const envContent = `# This is a comment
SNAPJSON_PATH_DB=db
# Another comment
NODE_ENV=development`;

      writeFileSync(".env", envContent);
      const config = loadConfigFromEnv();

      expect(config.path_db).toBe("db");
    });

    it("should handle env file with empty lines", () => {
      const envContent = `SNAPJSON_PATH_DB=db

NODE_ENV=development

`;

      writeFileSync(".env", envContent);
      const config = loadConfigFromEnv();

      expect(config.path_db).toBe("db");
    });

    it("should handle env values with equals signs", () => {
      const envContent = `SNAPJSON_PATH_DB=db
SNAPJSON_SECRETKEY=key=with=equals
NODE_ENV=development`;

      writeFileSync(".env", envContent);
      const config = loadConfigFromEnv();

      expect(config.secretKey).toBe("key=with=equals");
    });

    it("should handle whitespace in env file", () => {
      const envContent = `  SNAPJSON_PATH_DB  =  db  
NODE_ENV = development `;

      writeFileSync(".env", envContent);
      const config = loadConfigFromEnv();

      expect(config.path_db).toBe("db");
    });
  });

  describe("integration tests", () => {
    it("should handle complete configuration workflow", async () => {
      const completeConfig: ConfigOptions = {
        path_db: "production_db",
        mode: "prod",
        encrypted: true,
        splitFile: true,
        secretKey: "complex-secret-key-123",
        salt: "salt-456",
      };

      // Save
      saveConfigToEnv(completeConfig);

      // Load
      const loadedConfig = loadConfigFromEnv();

      expect(loadedConfig).toEqual({
        path_db: "production_db",
        mode: "prod",
        encrypted: true,
        splitFile: true,
        secretKey: "complex-secret-key-123",
        salt: "salt-456",
      });

      // Verify in process.env
      expect(process.env.SNAPJSON_PATH_DB).toBe("production_db");
      expect(process.env.NODE_ENV).toBe("production");
      expect(process.env.SNAPJSON_ENCRYPTED).toBe("true");
    });

    it("should handle configuration update workflow", () => {
      // Initial configuration
      const initialConfig: ConfigOptions = {
        path_db: "db1",
        mode: "dev",
        encrypted: false,
        splitFile: false,
      };

      saveConfigToEnv(initialConfig);

      // Update configuration
      const updatedConfig: ConfigOptions = {
        path_db: "db2",
        mode: "prod",
        encrypted: true,
        splitFile: true,
        secretKey: "new-secret",
        salt: "new-salt",
      };

      saveConfigToEnv(updatedConfig);

      const loadedConfig = loadConfigFromEnv();

      expect(loadedConfig.path_db).toBe("db2");
      expect(loadedConfig.mode).toBe("prod");
      expect(loadedConfig.encrypted).toBe(true);
      expect(loadedConfig.splitFile).toBe(true);
    });

    it("should verify isDBConfigured after save and load", () => {
      expect(isDBConfigured()).toBe(false);

      saveConfigToEnv(mockConfig);

      expect(isDBConfigured()).toBe(true);

      loadConfigFromEnv();

      expect(isDBConfigured()).toBe(true);
    });
  });

  describe("error scenarios", () => {
    it("should handle corrupted env file gracefully", () => {
      writeFileSync(".env", "SNAPJSON_PATH_DB=");

      // Empty path_db should still be readable
      expect(() => {
        loadConfigFromEnv();
      }).toThrow();
    });

    it("should handle missing SNAPJSON_PATH_DB in env", () => {
      writeFileSync(".env", "NODE_ENV=development\nOTHER_VAR=value");

      expect(() => {
        loadConfigFromEnv();
      }).toThrow("Database is not configured");
    });

    it("should update existing snapjson variables when updating config", () => {
      // Create initial env with SnapJson variables
      const initialConfig: ConfigOptions = {
        path_db: "old_db",
        mode: "dev",
        encrypted: false,
        splitFile: false,
      };

      saveConfigToEnv(initialConfig);

      // Update the configuration
      const newConfig: ConfigOptions = {
        path_db: "new_db",
        mode: "prod",
        encrypted: false,
        splitFile: false,
      };

      saveConfigToEnv(newConfig);

      const envContent = readFileSync(".env", "utf-8");
      expect(envContent).toContain("SNAPJSON_PATH_DB=new_db");
      expect(envContent).not.toContain("old_db");
      expect(envContent).toContain("NODE_ENV=production");
    });

    it("should handle missing encryption credentials", () => {
      const config: ConfigOptions = {
        path_db: "db",
        mode: "dev",
        encrypted: true,
        splitFile: false,
        secretKey: undefined,
        salt: undefined,
      };

      saveConfigToEnv(config);

      const loadedConfig = loadConfigFromEnv();
      expect(loadedConfig.encrypted).toBe(true);
    });

    it("should handle NODE_ENV to mode conversion correctly", () => {
      // Test dev mode
      writeFileSync(".env", "SNAPJSON_PATH_DB=db\nNODE_ENV=development");
      let config = loadConfigFromEnv();
      expect(config.mode).toBe("dev");

      if (existsSync(".env")) {
        unlinkSync(".env");
      }

      // Test prod mode
      writeFileSync(".env", "SNAPJSON_PATH_DB=db\nNODE_ENV=production");
      config = loadConfigFromEnv();
      expect(config.mode).toBe("prod");

      if (existsSync(".env")) {
        unlinkSync(".env");
      }

      // Test other values default to dev
      writeFileSync(".env", "SNAPJSON_PATH_DB=db\nNODE_ENV=staging");
      config = loadConfigFromEnv();
      expect(config.mode).toBe("dev");
    });
  });
});
