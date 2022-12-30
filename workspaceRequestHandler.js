const { app, fs, doc } = require('./app');

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

module.exports.handleAddTask = async ({ body, ack, say}) => {
    await ack();
  
    const receivingMetadata = body.message.metadata.event_payload
    const requester_username = receivingMetadata.requester_username
    const requester_id = receivingMetadata.requester_id
  
  
    metadata = JSON.stringify({
      "requester_username": requester_username,
      "requester_id": requester_id,
      "approver_username": body.user.name,
      "approver_id": body.user.id,
      "message_ts": body.container.message_ts,
      "message_user_text": body.message.blocks[1].text.text,
      "message_description": body.message.blocks[2].text.text,
      "channel_id": body.container.channel_id,
      "description": body.message.blocks[2].text.text,
    })
  
    fs.readFile("messages/request/add_task_modal.json", 'utf8', async (err, data) => {
      if (err) throw err;
      try {
        const modal = JSON.parse(data);
        modal.trigger_id = body.trigger_id
        modal.view.private_metadata = metadata
        await app.client.views.open(modal);
      } catch (e) {
        console.log(e)
      }
    });
  }

module.exports.handleResolve = async ({ body, ack, say}) => {
    await ack();
  
    const receivingMetadata = body.message.metadata.event_payload
    const requester_username = receivingMetadata.requester_username
    const requester_id = receivingMetadata.requester_id
  
    metadata = JSON.stringify({
      "requester_username": requester_username,
      "requester_id": requester_id,
      "approver_username": body.user.username,
      "approver_id": body.user.id,
      "message_ts": body.container.message_ts,
      "message_user_text": body.message.blocks[1].text.text,
      "message_description": body.message.blocks[2].text.text,
      "channel_id": body.container.channel_id,
      "description": body.message.blocks[2].text.text,
    })
  
    fs.readFile("messages/request/resolve_modal.json", 'utf8', async (err, data) => {
      if (err) throw err;
      try {
        const modal = JSON.parse(data);
        modal.trigger_id = body.trigger_id
        modal.view.private_metadata = metadata
        await app.client.views.open(modal);
      } catch (e) {
        console.log(error)
      }
    });
}
module.exports.handleResolveSubmission = async ({ ack, body, view, client, logger }) => {
    // Acknowledge the view_submission request
    await ack();
  
    console.log("modal submitted")
  
    metadata = JSON.parse(body.view.private_metadata)
  
    console.log(`dropdown options: ${JSON.stringify(body.view.state.values.dropdown.resolve_modal_a)}`)
  
    const dropdown = body.view.state.values.dropdown.resolve_modal_a.selected_option.value
    const notifyUser = body.view.state.values.button.resolve_modal_a.selected_options != ""
  
    console.log(`dropdown:  ${dropdown}`)
    console.log(`button: ${notifyUser}`)
  
  
    fs.readFile("messages/request/request.json", 'utf8', async (err, data) => { // TODO : some of this can be taken out of the block I think
      if (err) throw err;
      try {
        const message = JSON.parse(data);
        message.blocks[1].text.text = metadata.message_user_text
        message.blocks[2].text.text = metadata.message_description
        message.blocks[4] = {
          "type": "context",
          "elements": [
            {
              "type": "mrkdwn",
              "text": `Marked as "${body.view.state.values.dropdown.resolve_modal_a.selected_option.text.text}" by <@${metadata.approver_id}>`
            }
          ]
        };
        message.ts = metadata.message_ts
        message.channel = metadata.channel_id
        await app.client.chat.update(message)
  
      } catch (e) {
        console.log(e)
        reportError(e, "fetching request.json file to update request text")
      }
  
      //notifying requester
      if (notifyUser) {
  
        var text = "error"
  
        if (dropdown == "complete") {
          text = `Your request has been marked complete by <@${metadata.approver_id}>`
        } else if (dropdown == "added_to_order") {
          text = `Your request has been added to be ordered by <@${metadata.approver_id}>`
        } else if (dropdown == "ordered") {
          text = `Your request has been ordered by <@${metadata.approver_id}>`
        } else if (dropdown == "notified_facilities") {
          text = `<@${metadata.approver_id}> has notified facilities of your request`
        } else if (dropdown == "dismissed") {
          text = `Your request has been dismissed by <@${metadata.approver_id}>`
        }
  
        await app.client.chat.postMessage({
          channel: metadata.requester_id,
          text: text,
          blocks: [{
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": text
            }
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": metadata.message_description
            }
          }]
  
  
        })
      }
    });
  };

module.exports.handleAddTaskSubmission = async ({ ack, body, view, client, logger }) => {
    await ack();

    metadata = JSON.parse(body.view.private_metadata)

    const nameField = body.view.state.values.input_d.dreamy_input.value
    const detailsField = body.view.state.values.input_c.dreamy_input.value

    fs.readFile("messages/request/request.json", 'utf8', async (err, data) => {
        if (err) throw err;
        try {
        const modal = JSON.parse(data);
        modal.blocks[1].text.text = metadata.message_user_text
        modal.blocks[2].text.text = metadata.message_description
        modal.blocks[4] = {
            "type": "context",
            "elements": [
            {
                "type": "mrkdwn",
                "text": `Added to tasks by <@${metadata.approver_id}>`
            }
            ]
        };
        modal.ts = metadata.message_ts
        modal.channel = metadata.channel_id

        //posts message to workspace core - add this back in to remove buttons
        await app.client.chat.update(modal)
        } catch (e) {
        console.log(e)
        }
    });


    //add to spreadsheet

    const taskSheet = await loadTasksSheet()

    var jobID = convertToJobID(`${taskSheet.rowCount}`)

    const requester = await client.users.info({ user: metadata.requester_id })
    const requesterName = requester.user.real_name

    const approver = await client.users.info({ user: metadata.approver_id })
    const approverName = approver.user.real_name

    await taskSheet.addRow([jobID, nameField, detailsField, "1", "1", requesterName, approverName])

    //notify requester
    const text = `Your request has been added to the todo list by <@${metadata.approver_id}>`

    fs.readFile("messages/request/task_added_notification.json", 'utf8', async (err, data) => {
        if (err) throw err;
        try {
        const modal = JSON.parse(data);
        modal.channel = metadata.requester_id
        modal.text = text
        modal.blocks[0].text.text = text
        modal.blocks[1].text.text = metadata.message_description
        modal.blocks[2].text.text = `*Task ID:* ${taskSheet.rowCount}`
        modal.blocks[3].text.text = `*Task title:* ${nameField}`
        modal.blocks[4].text.text = `*Task description:* ${detailsField}`

        await app.client.chat.postMessage(modal)

        } catch (e) {
        console.log(e)
        }
    });
};

async function loadTasksSheet() {
    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key,
    });
    await doc.loadInfo(); // loads document properties and worksheets
    const sheet = doc.sheetsByIndex[1]; // or use doc.sheetsById[id]
    const cellRange = `A1:H${sheet.rowCount}`
    await sheet.loadCells(cellRange)
    return sheet
  }