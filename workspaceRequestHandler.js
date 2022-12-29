const { app } = require('./app');


module.exports.handleWorkspaceRequest = async ({ command, ack, respond }) => {
    // Acknowledge command request
    ack();

    try {
        var fs = require('fs');


        fs.readFile("messages/request.json", 'utf8', async (err, data) => {
            if (err) throw err;
            const messagePayload = JSON.parse(data);
            messagePayload.blocks[1].text.text = `*User:* @${command.user_name}`
            messagePayload.blocks[2].text.text = `*Request description:* ${command.text}`
            messagePayload.metadata.event_payload.requester_username = command.user_name
            messagePayload.metadata.event_payload.requester_id = command.user_id

            //posts message to workspace core
            await app.client.chat.postMessage(messagePayload)
            await respond("Your request has been sent to workspace managers. Thanks!")
        });
    } catch (error) {
        console.error(error);
    }
};
