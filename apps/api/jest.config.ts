import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: "\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "./tsconfig.json" }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(uuid|@prisma/adapter-pg|@prisma/client)/)",
  ],
  testEnvironment: "node",
};

export default config;
