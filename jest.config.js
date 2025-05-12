/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "test",
  moduleNameMapper: { "^src/(.*)$": "<rootDir>/../src/$1" },
};
