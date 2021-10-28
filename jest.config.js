module.exports = {
  "setupFilesAfterEnv": [
    "./test/jest.setup.js"
  ],
  "testMatch": [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(test).+(ts|tsx|js)"

  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  "moduleDirectories": [".", "node_modules"]
};
