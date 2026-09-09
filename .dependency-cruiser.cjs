module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "no-test-imports-from-prod",
      severity: "error",
      from: { pathNot: "\\.test\\.[jt]s$" },
      to: { path: "\\.test\\.[jt]s$" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
  },
};
