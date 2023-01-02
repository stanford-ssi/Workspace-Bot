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
const taskDoc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID_TASKS);
const memberDoc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID_MEMBERS);
module.exports.taskDoc = taskDoc;
module.exports.memberDoc = memberDoc;


//General functions
module.exports.loadSheet = async function loadSheet(doc, title) {
  await doc.useServiceAccountAuth({
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  });
  await doc.loadInfo(); // loads document properties and worksheets
  const sheet = doc.sheetsById[title]
  const cellRange = `A1:F${sheet.rowCount}`
  await sheet.loadCells(cellRange)
  console.log(`Loaded ${sheet.title} with ${sheet.rowCount} rows`)
  return sheet
}

module.exports.indexOfTaskID = async function indexOfTaskID(taskID, sheet) {
  for (let i = 0; i < sheet.rowCount; i++) {
    if (sheet.getCell(i, 0).value == taskID) {
      return i
    }
  }
}



//Workspace Request
const { handleWorkspaceRequest, handleAddTask, handleResolve, handleResolveSubmission, handleAddTaskSubmission } = require('./workspaceRequestHandler');
app.command('/workspace-request', handleWorkspaceRequest);
app.action('add_task', handleAddTask);
app.action('resolve', handleResolve);
app.view('resolve_modal', handleResolveSubmission);
app.view('add_task_modal', handleAddTaskSubmission);

//Complete Task
const {handleWorkspaceComplete, handleCompleteSubmit} = require('./workspaceCompleteHandler');
app.command('/workspace-complete', handleWorkspaceComplete);
app.view('submit_task', handleCompleteSubmit);

//Info
const {handleWorkspaceInfo} = require('./workspaceInfoHandler');
app.command('/workspace-info', handleWorkspaceInfo);

//DM members
const {handleDM, handleDMSubmission} = require('./dmHandler');
app.command('/workspace-dm', handleDM);
app.view('dm_modal', handleDMSubmission);



(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();

/* Todo:
- Messages workspace core when person completes task asynchronously
*/

