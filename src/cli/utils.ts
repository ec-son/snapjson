import { resolve } from "path";
import { readFileSync, statSync, existsSync, writeFileSync } from "fs";
import * as readline from "readline/promises";

export interface ConfigOptions {
  path_db: string;
  mode: "dev" | "prod";
  encrypted: boolean;
  splitFile: boolean;
  secretKey?: string;
  salt?: string;
}

/**
 * Ask a question and get user input with optional validation.
 * @param query - The question to ask
 * @param required - Whether the input is required
 * @returns The user's input
 */
export const question = async (
  query: string,
  required: boolean = false
): Promise<string> => {
  const rl: readline.Interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let res: string = "";
  let respond = false;

  while (!respond) {
    res = (await rl.question(query)).trim();
    if (!required || (res && res.length > 0)) respond = true;
  }

  rl.close();
  return res;
};

/**
 * Display the help message with available commands and options.
 */
export const showHelp = () => {
  console.log("Usage: snapjson [command] [flags]");
  console.log("       snapjson [-h | --help] | [-v | --version]\n");
  console.log(
    "SnapJson CLI - Database configuration and collection management\n"
  );
  console.log("Available Commands:");
  console.log(
    "  c, create [-c,--collection | -r,--relation]            Create collection or relation."
  );
  console.log(
    "  i, init [-y, --yes]                                    Initialize database configuration. With --yes, uses default values."
  );
  console.log(
    "  l, list [-c,--collection | -r,--relation]              List all collections or relations."
  );
  console.log(
    "  d, delete [-c,--collection | -r,--relation]              Delete collections or relations."
  );
  console.log("\nAvailable Options:");
  console.log(
    "  -h, --help                                              Display this message."
  );
  console.log(
    "  -v, --version                                           Output the version number."
  );
};

/**
 * Display the current version from package.json.
 * @throws {Error} If package.json is not found or invalid
 */
export const showVersion = () => {
  const pathPackage = resolve("package.json");

  if (!existsSync(pathPackage)) {
    throw new Error("An expected error occurs when reading version.");
  }

  if (!statSync(pathPackage).isFile()) {
    throw new Error("An expected error occurs when reading version.");
  }

  try {
    const packageJsonContents = readFileSync(pathPackage).toString();
    const version = JSON.parse(packageJsonContents)["version"];

    if (!version) {
      throw new Error("An expected error occurs when reading version.");
    }

    console.log(version);
  } catch (error) {
    throw error;
  }
};

/**
 * Prompt user for database configuration.
 * @param yes - If true, use default configuration without prompting
 * @returns Configuration object
 */
export const getConfig = async (
  yes: boolean = false
): Promise<ConfigOptions> => {
  if (yes) {
    return {
      path_db: "db",
      mode: "dev",
      encrypted: false,
      splitFile: false,
      secretKey: "",
      salt: "",
    };
  }

  console.log("\n=== Database Configuration ===\n");

  const path_db = await question("Database path (default: 'db'): ");
  const modeInput = await question("Mode - dev or prod (default: 'dev'): ");
  const encryptedInput =
    (await question("Enable encryption? (yes/no, default: no): ")) || "no";
  const splitFileInput =
    (await question("Split files by collection? (yes/no, default: no): ")) ||
    "no";

  let secretKey: string | undefined;
  let salt: string | undefined;

  const encrypted = encryptedInput.toLowerCase() === "yes";

  if (encrypted) {
    secretKey = (await question("Enter secret key: ")) || "";
    salt = (await question("Enter salt: ")) || "";
  }

  const config: ConfigOptions = {
    path_db: path_db || "db",
    mode: (modeInput || "dev") as "dev" | "prod",
    encrypted,
    splitFile: splitFileInput.toLowerCase() === "yes",
    secretKey,
    salt,
  };

  return config;
};

/**
 * Save configuration to .env file.
 * Updates existing variables or appends new ones.
 * @param config - Configuration object to save
 * @throws {Error} If .env file cannot be written
 */
export const saveConfigToEnv = (config: ConfigOptions): void => {
  const envPath = ".env";
  const envVars = {
    SNAPJSON_PATH_DB: config.path_db,
    NODE_ENV: config.mode === "prod" ? "production" : "development",
    SNAPJSON_SPLITFILE: String(config.splitFile),
    SNAPJSON_ENCRYPTED: String(config.encrypted),
    SNAPJSON_SECRETKEY: config.secretKey || "",
    SNAPJSON_SALT: config.salt || "",
  };

  let envContent = "";

  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, "utf-8");
  }

  // Update or add each variable
  for (const [key, value] of Object.entries(envVars)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += (envContent ? "\n" : "") + `${key}=${value}`;
    }
  }

  writeFileSync(envPath, envContent);
};

/**
 * Parse .env file content into key-value pairs.
 * @param envContent - Raw content of .env file
 * @returns Object with environment variables
 */
const parseEnvFile = (envContent: string): Record<string, string> => {
  const envVars: Record<string, string> = {};
  const lines = envContent.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const [key, ...valueParts] = trimmedLine.split("=");
    if (key) {
      envVars[key.trim()] = valueParts.join("=").trim();
    }
  }

  return envVars;
};

/**
 * Check if database is configured by verifying .env file.
 * @returns true if database is configured, false otherwise
 */
export const isDBConfigured = (): boolean => {
  const envPath = ".env";
  if (!existsSync(envPath)) {
    return false;
  }

  try {
    const envContent = readFileSync(envPath, "utf-8");
    const envVars = parseEnvFile(envContent);
    return envVars.SNAPJSON_PATH_DB !== undefined;
  } catch {
    return false;
  }
};

/**
 * Load configuration from .env file and populate process.env.
 * @returns Configuration object from environment
 * @throws {Error} If database is not configured
 */
export const loadConfigFromEnv = (): ConfigOptions => {
  const envPath = ".env";

  if (!existsSync(envPath)) {
    throw new Error(
      "Database is not configured. Please run 'snapjson init' first."
    );
  }

  try {
    const envContent = readFileSync(envPath, "utf-8");
    const envVars = parseEnvFile(envContent);

    if (!envVars.SNAPJSON_PATH_DB) {
      throw new Error(
        "Database is not configured. Please run 'snapjson init' first."
      );
    }

    // Populate process.env with .env variables
    Object.assign(process.env, envVars);

    return {
      path_db: envVars.SNAPJSON_PATH_DB || "db",
      mode: (envVars.NODE_ENV === "production" ? "prod" : "dev") as
        | "dev"
        | "prod",
      splitFile: envVars.SNAPJSON_SPLITFILE === "true",
      encrypted: envVars.SNAPJSON_ENCRYPTED === "true",
      secretKey: envVars.SNAPJSON_SECRETKEY,
      salt: envVars.SNAPJSON_SALT,
    };
  } catch (error) {
    throw error;
  }
};
