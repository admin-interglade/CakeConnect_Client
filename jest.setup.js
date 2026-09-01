/* eslint-env jest */

// react-native-vector-icons reaches for a native module that does not exist in
// the Jest environment; render the glyph name as plain text instead.
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    __esModule: true,
    default: ({ name, ...rest }) => React.createElement(Text, rest, name),
  };
});

// AsyncStorage's native module is absent under Jest; back redux-persist with an
// in-memory map so store hydration does not log write failures.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();

  return {
    __esModule: true,
    default: {
      getItem: jest.fn(key => Promise.resolve(store.get(key) ?? null)),
      setItem: jest.fn((key, value) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn(key => {
        store.delete(key);
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve([...store.keys()])),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
      multiGet: jest.fn(keys =>
        Promise.resolve(keys.map(key => [key, store.get(key) ?? null])),
      ),
      multiSet: jest.fn(pairs => {
        pairs.forEach(([key, value]) => store.set(key, value));
        return Promise.resolve();
      }),
      multiRemove: jest.fn(keys => {
        keys.forEach(key => store.delete(key));
        return Promise.resolve();
      }),
    },
  };
});
