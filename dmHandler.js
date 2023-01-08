const { app, fs, loadSheet, memberDoc, getNameGreeting, sleep } = require('./app');

module.exports.handleDM = async ({ command, ack, respond }) => {
    await ack();

    const userID = command.user_id

    workspaceAdmins = await app.client.conversations.members({
        channel: process.env.WORKSPACE_CORE_CHANNEL_ID //Channel ID for workspace core
    })

    //check if user_id is in membersCall.members
    if (workspaceAdmins.members.includes(command.user_id) == false) {
        respond("This command is only available to workspace admins.")
        return
    }

    fs.readFile("messages/dm/DmModal.json", 'utf8', async (err, data) => {
        if (err) throw err;
        try {
            const modal = JSON.parse(data);
            trigger_id = command.trigger_id
            await app.client.views.open({
                trigger_id: trigger_id,
                view: modal
            });
        } catch (e) {
            console.log(e)
        }
    });
    return
}

module.exports.handleDMSubmission = async ({ ack, body, view, client, logger }) => {
    await ack();

    //loop through each person
    //get user id
    //send message

    var message
    const messengerUserID = body.user.id       


    fs.readFile("messages/dm/DmMessage.json", 'utf8', async (err, data) => {
        //if (err) throw err;
        console.log("reading file")
        message = JSON.parse(data);
    });

    //get list of users to send message to
    var usersToSendMessageTo = []
    const memberRequirementsSheet = await loadSheet(memberDoc, process.env.GOOGLE_SHEET_MEMBER_TAB)
    for (var i = 0; i < memberRequirementsSheet.rowCount; i++) {
        memberEmail = memberRequirementsSheet.getCell(i, 1).value
        memberStatus = memberRequirementsSheet.getCell(i, 3).value
        requiredTasks = memberRequirementsSheet.getCell(i, 4).value
        completedTasks = memberRequirementsSheet.getCell(i, 5).value
        if (memberStatus == "required" && requiredTasks - completedTasks > 0) {
            usersToSendMessageTo.push(memberEmail)
            //usersToSendMessageTo.push("lskaling@icloud.com") //used for testing
        }
    }

    //get values from modal
    const values = body.view.state.values
    const messageInput = values.message_input.plain_text_input_action.value
    var testInput

    try { //causes issues if checkbox is not selected
        testInput = values.checkbox.checkboxes.selected_options[0].value == "value-0"
    } catch {
        testInput = false
    }

    if (testInput) {
        const user = await app.client.users.info({
            user: messengerUserID
        })

        //TODO: make this into a function
        const user_real_name = user.user.real_name

        const name = await getNameGreeting(user_real_name)
        
        message.channel = messengerUserID
        message.blocks[0].text.text = "Hi " + name + ","
        message.blocks[1].text.text = messageInput
        message.blocks[4].text.text = `Message will be sent to ${usersToSendMessageTo.length} members`
        await app.client.chat.postMessage(message)

    } else {
        var successfulMessages = 0
        var failedMessages = []



        for (var i = 0; i < usersToSendMessageTo.length; i++) {
            try{
                console.log(usersToSendMessageTo[i])
                const userid = await app.client.users.lookupByEmail({
                    email: usersToSendMessageTo[i]
                }).then((res) => {
                    return res.user.id
                })
                .catch((err) => {
                    failedMessages.push(usersToSendMessageTo[i])
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
                message.blocks[1].text.text = messageInput
                await app.client.chat.postMessage(message)
                successfulMessages++

                await sleep(1000);


            } catch (e){
                console.log(e)
                failedMessages.push(usersToSendMessageTo[i])
            }
            
        }

        confirmationMessage = "Sent to " + successfulMessages + " members. Failed to send to " + failedMessages.length + " members."
        for (var i = 0; i < failedMessages.length; i++) {
            confirmationMessage += "\n" + failedMessages[i]
        }

        message.channel = messengerUserID
        message.blocks[0].text.text = "Hi,"
        message.blocks[1].text.text = messageInput
        message.blocks[4].text.text = confirmationMessage
        await app.client.chat.postMessage(message)

    }

}