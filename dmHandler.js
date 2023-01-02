const { app, fs } = require('./app');

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