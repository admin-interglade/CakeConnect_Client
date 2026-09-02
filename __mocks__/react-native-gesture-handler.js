/* eslint-env jest */

/**
 * react-native-gesture-handler is backed by native modules that do not exist
 * under Jest. The stack navigator pulls in `PanGestureHandler` and friends for
 * its swipe-back gesture, so rather than listing every export by hand this
 * mock hands back a plain `View` for any component the code asks for.
 */
const React = require('react');
const { View } = require('react-native');

const components = new Map();

function passthrough(name) {
  if (!components.has(name)) {
    const Component = React.forwardRef((props, ref) =>
      React.createElement(View, { ...props, ref }),
    );
    Component.displayName = name;
    components.set(name, Component);
  }
  return components.get(name);
}

/** Enum-like exports that are read as values rather than rendered. */
const values = {
  State: {
    UNDETERMINED: 0,
    FAILED: 1,
    BEGAN: 2,
    CANCELLED: 3,
    ACTIVE: 4,
    END: 5,
  },
  Directions: { RIGHT: 1, LEFT: 2, UP: 4, DOWN: 8 },
  gestureHandlerRootHOC: component => component,
  install: () => {},
  Gesture: {},
  GestureDetector: passthrough('GestureDetector'),
};

module.exports = new Proxy(values, {
  get(target, property) {
    if (typeof property === 'symbol' || property === '__esModule') {
      return undefined;
    }
    if (property in target) {
      return target[property];
    }
    return passthrough(String(property));
  },
});
