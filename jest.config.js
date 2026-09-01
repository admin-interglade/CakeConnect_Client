module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^react-native-gesture-handler$': '<rootDir>/__mocks__/react-native-gesture-handler.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|@react-navigation|react-native-gesture-handler|react-native-paper|react-native-vector-icons|react-redux|immer|@reduxjs/toolkit|redux-persist|react-native-safe-area-context|react-native-screens)/)',
  ],
};
