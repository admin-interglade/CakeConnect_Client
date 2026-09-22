// The native picker module is absent under Jest; resolve as a cancelled pick.
module.exports = {
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
  launchCamera: jest.fn(async () => ({ didCancel: true })),
};
