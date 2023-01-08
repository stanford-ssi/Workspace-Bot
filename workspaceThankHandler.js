const { app, fs, loadSheet, memberDoc, getUserIdFromEmail, getNameGreeting, indexOfUserEmail, sleep } = require('./app');

module.exports.handleThank = async ({ command, ack, respond }) => {
    await ack();

    const messengerUserID = command.user_id   

    workspaceAdmins = await app.client.conversations.members({
        channel: process.env.WORKSPACE_CORE_CHANNEL_ID //Channel ID for workspace core
    })

    //check if user_id is in membersCall.members
    if (workspaceAdmins.members.includes(command.user_id) == false) {
        respond("This command is only available to workspace admins.")
        return
    }

    var usersToSendMessageTo = []
    const memberAttendanceSheet = await loadSheet(memberDoc, process.env.GOOGLE_SHEET_ATTENDANCE_TAB)
    for (var i = 0; i < memberAttendanceSheet.rowCount; i++) {
        memberEmail = memberAttendanceSheet.getCell(i, 1).value
        memberAttendance = memberAttendanceSheet.getCell(i, 2).value
        if (memberAttendance == 1) {
            usersToSendMessageTo.push(memberEmail)
        }
    }

    console.log(usersToSendMessageTo)

    //get message
    var message
    fs.readFile("messages/thank/thankMessage.json", 'utf8', async (err, data) => {
        if (err) throw err;
        try {
            message = JSON.parse(data);
        } catch (e) {
            console.log(e)
        }
    });

    //send message to each user
    var successfulMessages = 0
    var failedMessages = []

    const memberRequirementsSheet = await loadSheet(memberDoc, process.env.GOOGLE_SHEET_MEMBER_TAB)

    for (var i = 0; i < usersToSendMessageTo.length; i++) {
        try{
            //update spreadsheet
            const userIndex = await indexOfUserEmail(usersToSendMessageTo[i], memberRequirementsSheet)
            const required = memberRequirementsSheet.getCell(userIndex, 4).value
            const completed = memberRequirementsSheet.getCell(userIndex, 5).value + 1
            memberRequirementsSheet.getCell(userIndex, 5).value = completed
            await memberRequirementsSheet.saveUpdatedCells()

            const attendanceSheetIndex = await indexOfUserEmail(usersToSendMessageTo[i], memberAttendanceSheet)
            memberAttendanceSheet.getCell(attendanceSheetIndex, 2).value = false
            await memberAttendanceSheet.saveUpdatedCells()

            const userid = await app.client.users.lookupByEmail({
                email: usersToSendMessageTo[i]
            }).then((res) => {
                return res.user.id
            })
            .catch((err) => {
                //failedMessages.push(usersToSendMessageTo[i])
                
            });

            const userObject = await app.client.users.info({
                user: userid
            })
            .then((res) => {
                return res.user
            })
            .catch((err) => {
                console.log("Caught!")
                console.error(err)
            });
            const user_real_name = userObject.profile.real_name
            var name
            if (user_real_name.split("").filter(x => x == " ").length == 1) {
                name = user_real_name.split(" ")[0]
            } else {
                name = user_real_name
            }
            
            message.channel = userObject.id
            message.blocks[0].text.text = "Hi " + name + ","
            message.blocks[1].text.text = `Thank you for coming to the workspace cleaning! You've now completed ${completed} out of ${required} required task${required > 1 ? s : ""}.`
            await app.client.chat.postMessage(message)
            successfulMessages++

            await sleep(1000); //sleep prevents exceeding rate limits of Slack API


        } catch (e){
            console.log(e)
            failedMessages.push(usersToSendMessageTo[i])
        }
        
    } 

    //send confirmation message to messenger
    confirmationMessage = "Thanks sent to " + successfulMessages + " members. Failed to send to " + failedMessages.length + " members."
    for (var i = 0; i < failedMessages.length; i++) {
        confirmationMessage += "\n" + failedMessages[i]
    }
    await app.client.chat.postMessage({
        channel: messengerUserID,
        text: confirmationMessage
    })


};