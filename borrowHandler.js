const { app, fs, loadSheet, indexOfTaskID, taskDoc, memberDoc, borrowDoc, loadSheetRange, connection } = require('./app');

module.exports.handleBorrow = async ({ command, ack, respond }) => {

  await ack();
  const channel = command.channel_id;
  console.log("channel: " + channel);
  fs.readFile("messages/borrow/borrowModal.json", 'utf8', async (err, data) => {
    if (err) throw err;
    try {
      const view = JSON.parse(data);
      //opens modal
      const result = await app.client.views.open({
        trigger_id: command.trigger_id,
        view: view,
      });

    } catch (e) {
      console.log(e)
    }
  })




};

module.exports.handleBorrowSubmit = async ({ ack, body, view, client, logger }) => {
  ack();

  const requester = body.user.id;
  const itemsBorrowed = view.state.values.itemsBorrowed.plain_text_input_action.value;
  const returnDate = view.state.values.returnDate.datepicker_action.selected_date;
  const permissionUser = view.state.values.permissionUser.users_select_action.selected_user;
  const channel = body.view.private_metadata.channel;

  console.log(body.view)

  //validate date
  const today = new Date();
  const returnDateObj = new Date(returnDate);
  if (returnDateObj < today) {
    await client.chat.postMessage({
      channel: requester,
      text: "Error submitting borrow request: please select a date in the future."
    });
    return
  }
  else if (returnDateObj > today.setDate(today.getDate() + 7) && permissionUser == null) {
    await client.chat.postMessage({
      channel: requester,
      text: "Error submitting borrow request: you must select a user to approve this request because it's being borrowed for more than 7 days."
    });
    return
  }

  //add to database
  const crypto = require('crypto');

  const borrowId = crypto.randomBytes(16).toString('hex');
  const userId = requester
  const name = body.user.name;
  const sql = 'INSERT INTO borrowLog (borrowId, userId, name, items, returnDate, returned) VALUES (?, ?, ?, ?, ?, FALSE);';
  const params = [borrowId, userId, name, itemsBorrowed, returnDate];
  connection.query(sql, params, function (error, results, fields) {
    if (error) {
      console.error(error);
      return;
    }
    console.log(results);
  });

  //send DM to requester
  fs.readFile("messages/borrow/borrowConfirmation.json", 'utf8', async (err, data) => {
    if (err) throw err;
    try {
      const confirmation = JSON.parse(data);
      confirmation.blocks[1].text.text = "Items Borrowed: " + itemsBorrowed;
      confirmation.channel = requester;
      confirmation.metadata.event_payload.borrowId = borrowId;
      //opens modal
      await app.client.chat.postMessage(confirmation);
    } catch (e) {
      console.log(e)
    }
  })


  //const borrowSheetIDs = await loadSheetRange(process.env.GOOGLE_SHEET_ID_BORROW, process.env.GOOGLE_SHEET_BORROW_TAB, "A1:A1000");

};

module.exports.handleReturn = async ({ ack, body, view, client, logger }) => {
  ack();
  console.log("return pressed")

  const message_ts = body.message.ts;
  const channel = body.channel.id;

  var borrowId

  await app.client.conversations.history({
    channel: channel,
    latest: message_ts,
    limit: 1,
    inclusive: true,
    include_all_metadata: true
  }).then(async (result) => {
    borrowId = result.messages[0].metadata.event_payload.borrowId
  })


  const sql = 'UPDATE borrowLog SET returned = TRUE WHERE borrowId = ?';
  const params = [borrowId];
  connection.query(sql, params, function (error, results, fields) {
    if (error) {
      console.error(error);
      return;
    }
    //console.log(results);
  });

  //update message
  fs.readFile("messages/borrow/borrowConfirmation.json", 'utf8', async (err, data) => {

    if (err) throw err;
    try {
      var updatedMessage = JSON.parse(data);
      updatedMessage.ts = message_ts;
      updatedMessage.blocks[1].text.text = "Items Borrowed: ";//todo: get items
      updatedMessage.blocks[2] = {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": " "
        }
      }
      updatedMessage.blocks[4] = {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Returned: :white_check_mark:"
        }
      }
      updatedMessage.channel = channel;
      updatedMessage.metadata.event_payload.borrowId = borrowId; //do I need this?

      await app.client.chat.update(updatedMessage);

      console.log(updatedMessage);
    } catch (e) {
      console.log(e)
    }
  })

}

module.exports.handleExtension = async ({ ack, body, client, logger }) => {
  ack();

  const extension = Object.values(body.state.values)[0].extension_request.selected_option.value

  console.log(Object.values(body.state.values)[0].extension_request.selected_option.value)
  
  //update database
  const sql = 'UPDATE borrowLog SET returnDate = DATE_ADD(returnDate, INTERVAL ? DAY) WHERE borrowId = ?';
  const params = [extension, body.message.metadata.event_payload.borrowId];
  connection.query(sql, params, function (error, results, fields) {
    if (error) {
      console.error(error);
      return;
    }
    console.log(results);
  });

  var updatedReturnDate;
  const sql2 = 'SELECT returnDate FROM borrowLog WHERE borrowId = ?';
  const params2 = [body.message.metadata.event_payload.borrowId];
  connection.query(sql2, params2, async function (error, results, fields) {
    if (error) {
      console.error(error);
      return;
    }
    console.log(results[0].returnDate);
    updatedReturnDate = results;
    //convert to Date object
    updatedReturnDate = new Date(updatedReturnDate[0].returnDate);
    updatedReturnDate = updatedReturnDate.toDateString();

    await app.client.chat.postMessage({
      channel: body.user.id,
      text: "Extension request successful. Please return by " + String(updatedReturnDate)
    });
  });
  console.log(updatedReturnDate);


  //update message
  fs.readFile("messages/borrow/borrowConfirmation.json", 'utf8', async (err, data) => {
      
      if (err) throw err;
      try {
        var updatedMessage = JSON.parse(data);
        updatedMessage.ts = body.message.ts;
        updatedMessage.blocks[0].text.text = "Thank you [date]";//todo: get items
        updatedMessage.blocks[1].text.text = "Items Borrowed: ";//todo: get items
        updatedMessage.channel = body.channel.id;
        updatedMessage.metadata.event_payload.borrowId = body.message.metadata.event_payload.borrowId; //do I need this?
  
        await app.client.chat.update(updatedMessage);
  
        console.log(updatedMessage);
      } catch (e) {
        console.log(e)
      }
    
  });



}
