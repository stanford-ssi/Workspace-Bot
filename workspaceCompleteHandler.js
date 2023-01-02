const { app, fs, loadSheet, indexOfTaskID, taskDoc, memberDoc } = require('./app');

module.exports.handleWorkspaceComplete = async ({ command, ack, respond }) => {
    let timer = setTimeout(() => {
        respond("Error: Google sheets API is being dumb. Try again and DM Lawton if it doesn't work.");
        return;
      }, 2900);

    const sheet = await loadSheet(taskDoc, "1301847628") //workspace cleaning todos

    clearTimeout(timer)
    // call the function
    await ack();
  
    const taskIDString = command.text
  
    if (parseInt(taskIDString) == NaN) { //invalid job id
      await respond("Invalid Job ID.")
  
    } else {
      const taskId = parseInt(taskIDString)
      //open spreadsheet and attempt to find job ID
  
  
      var taskName
      var taskDescription
      var rowIndex
  
      for (let i = 0; i < sheet.rowCount; i++) {
        if (sheet.getCell(i, 0).value == taskId) {
          taskName = sheet.getCell(i, 2).value
          taskDescription = sheet.getCell(i, 3).value
          console.log("found task")
          rowIndex = i
          break;
        }
      }
  
      if (taskName == null) { //task was not found in sheet
        await respond(`Error: could not find task ID *"${taskId}"* in the tasks list. Please double check the ID and message @Workspace if the issue persists`)
      } else if (sheet.getCell(rowIndex, 4).value == false){
        await respond(`Error: task ID *${taskId}* was not marked as an independent task. Please double check the ID and message the workspace leads if you completed it`)
      }else if (sheet.getCell(rowIndex, 1).value == true){
        await respond(`Error: task ID *${taskId}* was already completed. Please double check the ID and message the workspace leads if you completed it.`)
      }else{
        fs.readFile("messages/complete/workspace_contribution.json", 'utf8', async (err, data) => {
          if (err) throw err;
          try {
            const view = JSON.parse(data);
            view.blocks[1].text.text = `*Task ID:* ${taskIDString}\n*Task name:* ${taskName}\n *Task Description:* ${taskDescription}`
            view.private_metadata = taskIDString
            //opens modal
            const result = await app.client.views.open({
              // Pass a valid trigger_id within 3 seconds of receiving it
              trigger_id: command.trigger_id,
              // View payload
              view: view
            });
  
          } catch (e) {
            console.log(e)
          }
        })
      }
  
    }
  
};
  
  //submitting the complete task modal
module.exports.handleCompleteSubmit = async ({ ack, body, view, client, logger }) => {
    ack();
  
    //metadata = JSON.parse(body.view.private_metadata)
    const taskID = body.view.private_metadata
    const userID = body.user.id
  
    const tasksSheet = await loadSheet(taskDoc, "1301847628") //loads task sheet
    const memberRequirementsSheet = await loadSheet(memberDoc, "643563292")

    userinfo = await app.client.users.info({
      user: userID
    })
  
    const useremail = userinfo.user.profile.email
    const username = userinfo.user.real_name


    const taskIDValue = await indexOfTaskID(taskID, tasksSheet)
    tasksSheet.getCell(taskIDValue, 1).value = true;
    await tasksSheet.saveUpdatedCells()
  
    var completedTasks
    var requiredTasks
  
    //update requirements page to update user contirbutions
    for (let i = 0; i < memberRequirementsSheet.rowCount; i++) {
      if (memberRequirementsSheet.getCell(i, 1).value == useremail) {
        memberRequirementsSheet.getCell(i, 5).value += 1
        await memberRequirementsSheet.saveUpdatedCells()
        completedTasks = memberRequirementsSheet.getCell(i, 5).value
        requiredTasks = memberRequirementsSheet.getCell(i, 4).value
      }
    }
  
    //DM user to thank them
    app.client.chat.postMessage({
      channel: userID,
      text: `Thank you for helping keep our workspace organized! You've now completed ${completedTasks} of the required ${requiredTasks} tasks.`,
    })
  
};
  