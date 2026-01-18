#!/usr/bin/env node

import { SnapJsonCLI } from "./cli";

/**
 * SnapJson CLI Entry Point
 *
 * Instantiate and run the CLI application.
 */
const cli = new SnapJsonCLI();

cli.run().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
