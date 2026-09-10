function readWebhookToken() {
  return process.env.WEBHOOK_TOKEN || "test-webhook-token";
}

function readPageToken() {
  return process.env.FB_PAGE_TOKEN || "test-page-token";
}

module.exports = {
  readWebhookToken: readWebhookToken,
  readPageToken: readPageToken,
};
