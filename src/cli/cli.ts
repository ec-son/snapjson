import { SnapJson } from "../lib/snapjson";
import {
  getConfig,
  question,
  showHelp,
  showVersion,
  saveConfigToEnv,
  isDBConfigured,
  loadConfigFromEnv,
} from "./utils";

/**
 * SnapJsonCLI
 *
 * Main CLI class for managing SnapJson database configuration and operations.
 * Provides commands to:
 * - Initialize database configuration
 * - Create collections and relations
 * - List collections and relations
 */
export class SnapJsonCLI {
  /**
   * Main entry point for CLI.
   * Processes command-line arguments and executes appropriate commands.
   */
  async run(): Promise<void> {
    const args = process.argv.slice(2);
    this.process(args);
  }

  /**
   * Process command-line arguments and route to appropriate handler.
   * @param args - Command-line arguments
   */
  private process(args: string[] = []): void {
    if (args.length === 0) {
      showHelp();
      return;
    }

    const command = args[0];

    if (["-h", "--help"].includes(command)) {
      showHelp();
    } else if (["-v", "--version"].includes(command)) {
      try {
        showVersion();
      } catch (error) {
        console.error("An expected error occurs when reading version.");
      }
    } else if (["-i", "--init", "i", "init"].includes(command)) {
      const hasYesFlag = args.includes("-y") || args.includes("--yes");
      this.configureORM(hasYesFlag).catch((error) =>
        console.error("Configuration failed:", error.message)
      );
    } else if (["c", "create"].includes(command)) {
      const arg = args[1];
      if (["-c", "--collection"].includes(arg)) {
        this.createCollection().catch((error) =>
          console.error("Error creating collection:", error.message)
        );
      } else if (["-r", "--relation"].includes(arg)) {
        this.createRelation().catch((error) =>
          console.error("Error creating relation:", error.message)
        );
      } else {
        console.error(
          "Invalid argument. Use: -c|--collection or -r|--relation"
        );
      }
    } else if (["l", "list"].includes(command)) {
      this.list(args[1]).catch((error) =>
        console.error("Error listing:", error.message)
      );
    } else if (["d", "delete"].includes(command)) {
      this.delete(args[1]).catch((error) =>
        console.error("Error deleting:", error.message)
      );
    } else {
      console.error(`Unknown command: ${command}`);
      console.log("Use 'snapjson --help' for available commands.");
    }
  }

  /**
   * Configure database with interactive prompts.
   * Saves configuration to .env file.
   *
   * @param useDefaults - If true, use default configuration without prompting
   */
  private async configureORM(useDefaults: boolean = false): Promise<void> {
    // Check if database is already configured
    if (isDBConfigured()) {
      const pathDB = process.env.SNAPJSON_PATH_DB || "db";
      console.log(`\n⚠ Database already configured at path: ${pathDB}`);
      const overwrite = await question(
        "Overwrite existing configuration? (yes/no): "
      );
      if (overwrite.toLowerCase() !== "yes") {
        return;
      }
    }

    const config = await getConfig(useDefaults);

    try {
      saveConfigToEnv(config);
      console.log("\n✓ Database configuration saved to .env file\n");
    } catch (error) {
      throw new Error("Failed to save configuration to .env file");
    }
  }

  /**
   * Create a new collection interactively.
   * Prompts user for collection name, unique keys, ID strategy, and timestamps.
   */
  private async createCollection(): Promise<void> {
    if (!this.isDBConfiguredWithError()) return;

    try {
      const config = loadConfigFromEnv();
      const orm = new SnapJson(config);

      console.log("\n=== Create Collection ===\n");

      let createMore = true;

      while (createMore) {
        const collectionName = await question("Enter collection name: ", true);

        const hasUniqueKeys = await question(
          "Does this collection have unique keys? (yes/no): "
        );

        let uniqueKeys: string[] = [];

        if (hasUniqueKeys.toLowerCase() === "yes") {
          const uniqueKeysInput = await question(
            'Enter unique keys (comma-separated, e.g., "email,username"): '
          );

          uniqueKeys = uniqueKeysInput
            .split(",")
            .map((key) => key.trim())
            .filter((key) => key);
        }

        const idStrategyInput = await question(
          "ID Strategy - increment or uuid (default: increment): "
        );

        const idStrategy = (idStrategyInput || "increment").toLowerCase() as
          | "increment"
          | "uuid";

        const createdAtInput = await question(
          "Add createdAt field? (yes/no): "
        );
        const updatedAtInput = await question(
          "Add updatedAt field? (yes/no): "
        );

        const collection = await orm.createCollection({
          collectionName,
          uniqueKeys,
          idStrategy,
          createdAt: createdAtInput.toLowerCase() === "yes",
          updatedAt: updatedAtInput.toLowerCase() === "yes",
        });

        console.log(`✓ Collection "${collectionName}" created successfully!\n`);

        const continueCreating = await question(
          "Create another collection? (yes/no): "
        );
        createMore = continueCreating.toLowerCase() === "yes";
      }

      console.log("✓ All collections created successfully!");
      console.log("Use 'snapjson list --collection' to view all collections\n");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create relationships between collections interactively.
   * Prompts user for source collection, target collection, and relation type.
   */
  private async createRelation(): Promise<void> {
    if (!this.isDBConfiguredWithError()) return;

    try {
      const config = loadConfigFromEnv();
      const orm = new SnapJson(config);

      console.log("\n=== Create Relation ===\n");

      // Get list of collections
      const collections = await orm.getCollections();

      if (collections.length < 2) {
        console.error(
          "Error: At least 2 collections are required to create a relation."
        );
        return;
      }

      console.log("Available collections:", collections.join(", "));

      let createMore = true;

      while (createMore) {
        const targetCollection = await question(
          "Enter target collection name: ",
          true
        );

        const sourceCollection = await question(
          "Enter source collection name: ",
          true
        );

        // Validate collections exist
        if (
          !collections.includes(sourceCollection) ||
          !collections.includes(targetCollection)
        ) {
          console.error("One or both collections do not exist.");
          continue;
        }

        if (sourceCollection === targetCollection) {
          console.error("Source and target collections must be different.");
          continue;
        }

        let relationType: "hasOne" | "hasMany" | "belongsTo";

        while (!["hasOne", "hasMany", "belongsTo"].includes(relationType)) {
          relationType = (await question(
            "Relation type (hasOne/hasMany/belongsTo) (default: hasOne): "
          )) as any;

          if (!relationType) relationType = "hasOne";
        }

        const localKey = await question(
          `Local key (default: ${
            relationType === "belongsTo" ? sourceCollection : targetCollection
          }Id): `
        );
        const foreignKey = await question("Foreign key: (default: __id)");

        const alias = await question(
          `Enter relation field (default: ${sourceCollection}):`
        );

        let onDelete;
        let onUpdate;

        while (
          ["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"].includes(onDelete)
        ) {
          onDelete = (
            await question(
              "Enter the referential action when deleting (CASCADE/SET NULL/RESTRICT/NO ACTION) (default: SET NULL)"
            )
          ).toUpperCase() as any;
        }

        while (
          ["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"].includes(onUpdate)
        ) {
          onUpdate = (
            await question(
              "Enter the referential action when updating (CASCADE/SET NULL/RESTRICT/NO ACTION) (default: CASCADE)"
            )
          ).toUpperCase() as any;
        }

        await orm.defineRelation(targetCollection, {
          collectionName: sourceCollection,
          as: alias,
          foreignKey,
          localKey,
          relationType,
          onDelete,
          onUpdate,
        });
        console.log(
          `✓ Relation created: ${sourceCollection} -> ${targetCollection} (${relationType})\n`
        );

        const continueCreating = await question(
          "Create another relation? (yes/no): "
        );
        createMore = continueCreating.toLowerCase() === "yes";
      }

      console.log("✓ All relations created successfully!");
      console.log("Use 'snapjson list --relation' to view all relations\n");
    } catch (error) {
      throw error;
    }
  }

  /**
   * List all collections or relations.
   * @param flag - Filter flag: -c|--collection or -r|--relation
   */
  private async list(flag?: string): Promise<void> {
    if (!this.isDBConfiguredWithError()) return;

    try {
      const config = loadConfigFromEnv();
      const orm = new SnapJson(config);

      if (["-c", "--collection"].includes(flag)) {
        const collections = await orm.getCollections();

        console.log("\n=== Collections ===\n");

        if (collections.length === 0) {
          console.log("No collections found.");
        } else {
          collections.forEach((collection, index) => {
            console.log(`${index + 1}. ${collection}`);
          });
        }
      } else if (["-r", "--relation"].includes(flag)) {
        const collections = await orm.getCollections();

        const relationsInfo: string[] = [];

        for (const collection of collections) {
          const relationInfo = (await orm.getRelations(collection)).map(
            (relationInfo) => {
              return `${collection} ${
                relationInfo.relationType
                // relationInfo.relationType === "belongsTo" ? " --> " : "<--"
              } ${relationInfo.collectionName}`;
            }
          );
          if (relationInfo) relationsInfo.push(...relationInfo);
        }

        if (relationsInfo.length > 0) {
          console.log("\n=== Relations ===\n");
          // console.log("--> : hasOne/hasMany");
          // console.log("<-- : belongsTo\n");
          console.log(
            relationsInfo
              .map((relationInfo, index) => `${index + 1}. ${relationInfo}`)
              .join("\n")
          );
        } else console.log("No relations found.");
      } else {
        console.error("Invalid flag. Use: -c|--collection or -r|--relation");
      }
    } catch (error) {
      throw error;
    }
  }

  private async delete(flag?: string): Promise<void> {
    if (!this.isDBConfiguredWithError()) return;

    try {
      const config = loadConfigFromEnv();
      const orm = new SnapJson(config);

      if (["-c", "--collection"].includes(flag)) {
        const collections = (
          await question(
            'Enter collections to remove ("profile user post ..."): ',
            true
          )
        ).split(" ");

        const t = await orm.removeCollection(collections);
        if (!t) return console.log("No collections founds.");

        console.log(
          `Collection${Array.isArray(t) ? "s" : ""} removed successfully : ${
            Array.isArray(t) ? t.join(", ") : t
          }`
        );
      } else if (["-r", "--relation"].includes(flag)) {
        const targetCollection = await question(
          "Enter target collection name: ",
          true
        );

        const sourceCollections = (
          await question(
            'Enter the names of the source collections ("profile post ..."): ',
            true
          )
        ).split(" ");

        const t = await orm.deleteRelation(targetCollection, sourceCollections);
        if (t.length === 0) return console.log("No relations founds.");
        console.log(
          `Relation${Array.isArray(t) ? "s" : ""} removed successfully : ${
            Array.isArray(t) ? t.join(", ") : t
          }`
        );
      } else {
        console.error("Invalid flag. Use: -c|--collection or -r|--relation");
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if database is configured and optionally display error message.
   * @param withError - If true, display error message if not configured
   * @returns true if database is configured, false otherwise
   */
  private isDBConfiguredWithError(withError: boolean = true): boolean {
    if (isDBConfigured()) {
      return true;
    }

    if (withError) {
      console.error("\n✗ Database is not configured.");
      console.error("Please run 'snapjson init' to configure the database.\n");
    }

    return false;
  }
}
