const { App } = require('@slack/bolt');

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});
var fs = require('fs');
module.exports.app = app; //makes it accessible outside this file

const { handleWorkspaceRequest } = require('./workspaceRequestHandler');
app.command('/workspace-request', handleWorkspaceRequest);

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();