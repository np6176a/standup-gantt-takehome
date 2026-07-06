/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // The Fake source seams (seed dataset, write store, fake-GitHub, source selection)
  // are unit-tested here, alongside the Gantt's own pure logic under lib/ and the
  // per-component `{Name}Util.test.ts` / `{Name}.test.tsx` files from CLAUDE.md.
  // Both .ts and .tsx are matched under components/ so no component test is
  // silently skipped (DOM render tests would additionally need a jsdom env).
  testMatch: [
    "<rootDir>/lib/**/*.test.ts",
    "<rootDir>/components/**/*.test.{ts,tsx}",
  ],
  moduleNameMapper: {
    // Mirror tsconfig's "@/*" path alias so lib/ modules and their tests resolve it.
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
  },
};
