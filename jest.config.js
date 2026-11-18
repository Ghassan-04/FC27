module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  collectCoverageFrom: ['server.js'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: { statements: 55, branches: 45, functions: 55, lines: 55 },
  },
};
