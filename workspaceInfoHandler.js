const { app, fs, loadSheet, memberDoc, indexOfUserEmail } = require('./app');

module.exports.handleWorkspaceInfo = async ({ command, ack, respond }) => {
    await ack();

    const userID = command.user_id
  
    const sheet = await loadSheet(memberDoc, "643563292")

    userinfo = await app.client.users.info({
      user: userID
    })
  
    const useremail = userinfo.user.profile.email
  
    const i = await indexOfUserEmail(useremail, sheet)

    const tasksRequired = sheet.getCell(i, 4).value
    const tasksCompleted = sheet.getCell(i, 5).value
    const status = sheet.getCell(i, 3).value

  
    fs.readFile("messages/info/workspace_info.json", 'utf8', async (err, data) => {
      if (err) throw err;
      try {
        const blocks = JSON.parse(data);
        if(tasksRequired == undefined || status == "excused"){ //not obligated to do tasks
          blocks[1].text.text = "You have no workspace requirements this quarter."
        }else{
          blocks[1].text.text = `This quarter: ${tasksRequired} tasks required, ${tasksCompleted} tasks completed`
        }
  
        respond({ "blocks": blocks })
        //posts message to workspace core
      } catch (e) {
        console.log(e)
      }
    });

}