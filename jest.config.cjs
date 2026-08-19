/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
    },
    roots: ['<rootDir>/tests/unit'],
    testMatch: ['**/*.spec.ts'],
    moduleFileExtensions: ['ts', 'js'],
    clearMocks: true,
};
