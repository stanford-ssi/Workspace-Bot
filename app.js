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
const borrowDoc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID_BORROW);
module.exports.taskDoc = taskDoc;
module.exports.memberDoc = memberDoc;
module.exports.borrowDoc = borrowDoc;

//Database
const mysql = require('mysql2');
module.exports.mysql = mysql;
module.exports.connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});


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

module.exports.loadSheetRange = async function loadSheet(doc, title, range) {
  await doc.useServiceAccountAuth({
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  });
  await doc.loadInfo(); // loads document properties and worksheets
  const sheet = doc.sheetsById[title]
  const cellRange = range
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

module.exports.indexOfUserEmail = async function indexOfUserEmail(userEmail, sheet) {
  for (let i = 0; i < sheet.rowCount; i++) {
    if (sheet.getCell(i, 1).value == userEmail) {
      return i
    }
  }
}

module.exports.getUserIdFromEmail = async function getUserIdFromEmail(userEmail) {
  try {
    return result = await app.client.users.lookupByEmail({
      email: userEmail
    }).user.id
  } catch (e) {
    return userEmail //if it can't find it, returns user email to print in error message
  }
}

module.exports.getNameGreeting = async function getNameGreeting(fullName) {
  if (fullName.split("").filter(x => x == " ").length == 1) { //if name has obvious first and last name, use first name
    return fullName.split(" ")[0]
  } else { //otherwise use full name
    return fullName
  }
}

module.exports.sleep = function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}



//Workspace Request
const { handleWorkspaceRequest, handleAddTask, handleResolve, handleResolveSubmission, handleAddTaskSubmission } = require('./workspaceRequestHandler');
app.command('/workspace-request', handleWorkspaceRequest);
app.action('add_task', handleAddTask);
app.action('resolve', handleResolve);
app.view('resolve_modal', handleResolveSubmission);
app.view('add_task_modal', handleAddTaskSubmission);

//Complete Task
const { handleWorkspaceComplete, handleCompleteSubmit } = require('./workspaceCompleteHandler');
app.command('/workspace-complete', handleWorkspaceComplete);
app.view('submit_task', handleCompleteSubmit);

//Info
const { handleWorkspaceInfo } = require('./workspaceInfoHandler');
app.command('/workspace-info', handleWorkspaceInfo);

//DM members
const { handleDM, handleDMSubmission } = require('./dmHandler');
app.command('/workspace-dm', handleDM);
app.view('dm_modal', handleDMSubmission);

//Thank members for coming to workspace cleaning
const { handleThank } = require('./workspaceThankHandler');
app.command('/workspace-thank', handleThank);

//Borrow
const { handleBorrow, handleBorrowList, handleBorrowSubmit, handleReturn, handleExtension, checkOverdue } = require('./borrowHandler');
app.command('/borrow', handleBorrow);
app.command('/borrowed-items', handleBorrowList);
app.view('borrow_modal', handleBorrowSubmit);
app.action('return', handleReturn);
app.action('extension_request', handleExtension);
app.action('users_select_action', async ({ options, ack }) => {ack()});
setInterval(checkOverdue, 86400000); // Execute the doSomething function every 60000 milliseconds (1 minute)

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();


