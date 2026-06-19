module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.ts'],
  // Thresholds apply to the unit suite (`jest --coverage`). schools.service is
  // covered by the e2e suite (jest-e2e.json), so it is not gated here.
  coverageThreshold: {
    'src/modules/auth/auth.service.ts': {
      branches: 65,
      lines: 80,
    },
    'src/modules/me/me.service.ts': {
      branches: 80,
      lines: 85,
    },
  },
  testEnvironment: 'node',
};
