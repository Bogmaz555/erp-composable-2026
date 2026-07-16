module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/**/src/**/*.ts',
    '!apps/**/src/main.ts',
    '!apps/**/src/**/*.module.ts',
    '!apps/frontend/**/*.ts',
    '!apps/frontend/**/*.tsx'
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};
