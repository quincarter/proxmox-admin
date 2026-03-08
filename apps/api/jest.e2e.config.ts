import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: "\\.e2e-spec\\.ts$",
  transform: {
    // Transform all .ts files and .js files inside ESM-only node_modules
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  // uuid v13 and @prisma/* packages ship ESM — allow ts-jest to transform them
  transformIgnorePatterns: [
    "node_modules/(?!(uuid|@prisma/adapter-pg|@prisma/client)/)",
  ],
  testEnvironment: "node",
  testTimeout: 30_000,
};

export default config;
