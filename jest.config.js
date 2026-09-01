module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-gesture-handler$': '<rootDir>/__mocks__/react-native-gesture-handler.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-gesture-handler|react-redux|redux-persist|react-native-safe-area-context|react-native-screens)/)',
  ],
};
