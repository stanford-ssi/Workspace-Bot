const dotenv = require("dotenv")
dotenv.config()

const { App } = require('@slack/bolt');

// Slack API
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});
module.exports.app = app; //makes it accessible outside this file

//Reading and writing to files API
var fs = require('fs');
module.exports.fs = fs;

//Google Sheets API
const { GoogleSpreadsheet } = require('google-spreadsheet');
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
module.exports.doc = doc;


//General functions
module.exports.loadSheet = async function loadSheet(title) {
  await doc.useServiceAccountAuth({
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  });
  await doc.loadInfo(); // loads document properties and worksheets
  console.log(doc.title)
  const sheet = doc.sheetsById[title]
  const cellRange = `A1:H${sheet.rowCount}`
  await sheet.loadCells(cellRange)
  console.log(`Loaded ${sheet.title} with ${sheet.rowCount} rows`)
  return sheet
}



//Request
const { handleWorkspaceRequest, handleAddTask, handleResolve, handleResolveSubmission, handleAddTaskSubmission } = require('./workspaceRequestHandler');
app.command('/workspace-request', handleWorkspaceRequest);
app.action('add_task', handleAddTask);
app.action('resolve', handleResolve);
app.view('resolve_modal', handleResolveSubmission);
app.view('add_task_modal', handleAddTaskSubmission);
app.view('checkboxes', async ({ ack, body}) => {
  await ack();
});




(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();

/* Todo:
- Add checks for approval if member is in workspace core
- Messages workspace core when person completes task asynchronously
*/

