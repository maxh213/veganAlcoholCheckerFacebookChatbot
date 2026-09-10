const TestExclude = require("test-exclude");
const originalShouldInstrument = TestExclude.prototype.shouldInstrument;
TestExclude.prototype.shouldInstrument = function (filename, relFile) {
  const names = [filename, relFile].map(function (value) {
    return String(value || "").replaceAll("\\", "/");
  });
  const extras = ["secretConstants.js", "vitest.workspace.js"];
  if (names.some(function (name) {
    return extras.some(function (file) {
      return name === file || name.endsWith("/" + file);
    });
  })) {
    return true;
  }
  return originalShouldInstrument.call(this, filename, relFile);
};
module.exports = ["./vitest.config.ts"];
