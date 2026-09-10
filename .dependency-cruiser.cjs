module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "no-test-imports-from-prod",
      severity: "error",
      from: { pathNot: "\\.test\\.[jt]s$" },
      to: { path: "\\.test\\.[jt]s$" },
    },
    {
      name: "search-has-no-io",
      comment: "search.js is the drink-match domain: no HTTP, crawl, or data-file IO",
      severity: "error",
      from: { path: "(^|/)search\\.js$" },
      to: {
        path: "(^|/)(index|barnivore|slimProducts|secretConstants)\\.js$|node_modules/(express|body-parser|request)(/|$)",
      },
    },
    {
      name: "barnivore-does-not-import-web",
      comment: "barnivore.js crawls Barnivore JSON; it must not import Express or the webhook",
      severity: "error",
      from: { path: "(^|/)barnivore\\.js$" },
      to: {
        path: "(^|/)(index|search)\\.js$|node_modules/(express|body-parser)(/|$)",
      },
    },
    {
      name: "only-index-loads-data",
      comment: "slimProducts.js and secretConstants.js are leaves loaded by the composition root",
      severity: "error",
      from: { pathNot: "(^|/)index\\.js$" },
      to: { path: "(^|/)(slimProducts|secretConstants)\\.js$" },
    },
    {
      name: "data-files-are-leaves",
      comment: "catalogue data and the secrets stub must not import application modules",
      severity: "error",
      from: { path: "(^|/)(slimProducts|secretConstants)\\.js$" },
      to: { path: "(^|/)(index|search|barnivore)\\.js$" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
  },
};
