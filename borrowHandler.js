const { app, fs, loadSheet, indexOfTaskID, taskDoc, memberDoc, borrowDoc, loadSheetRange, connection } = require('./app');

module.exports.handleBorrow = async ({ command, ack, respond }) => {

  await ack();
  const channel = command.channel_id;
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

module.exports.handleBorrowList = async ({ command, ack, respond }) => {

  await ack();
  const channel = command.channel_id;

  const sql = 'SELECT * FROM borrowLog WHERE returned = FALSE;';
  connection.query(sql, function (error, results, fields) {
    if (error) {
      console.error(error);
      return;
    }
    let message = "Here's a list of all the items that are currently borrowed:\n"
    for (let i = 0; i < results.length; i++) {
      message += `${results[i].name}\t${results[i].items}\n`
    }

    respond({
      text: message,
    })
  })

};

module.exports.handleBorrowSubmit = async ({ ack, body, view, client, logger }) => {
  ack();

  const requester = body.user.id;
  const itemsBorrowed = view.state.values.itemsBorrowed.plain_text_input_action.value;
  const returnDate = view.state.values.returnDate.datepicker_action.selected_date;
  const permissionUser = view.state.values.permissionUser.users_select_action.selected_user;
  const channel = body.view.private_metadata.channel;

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
  });

  const formattedReturnDate = returnDateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  //send DM to requester
  fs.readFile("messages/borrow/borrowConfirmation.json", 'utf8', async (err, data) => {
    if (err) throw err;
    try {
      const confirmation = JSON.parse(data);
      confirmation.blocks[0].text.text = `Thank you for checking out the item(s). Please return the item(s) by *${formattedReturnDate}*. If you have any questions, please contact the workspace managers.`;
      confirmation.blocks[1].text.text = "Items Borrowed: " + itemsBorrowed;
      confirmation.channel = requester;
      confirmation.metadata.event_payload.borrowId = borrowId;
      confirmation.metadata.event_payload.itemsBorrowed = itemsBorrowed;
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

  const message_ts = body.message.ts;
  const channel = body.channel.id;

  var borrowId

  var message

  await app.client.conversations.history({
    channel: channel,
    latest: message_ts,
    limit: 1,
    inclusive: true,
    include_all_metadata: true
  }).then(async (result) => {
    message = result.messages[0]
    borrowId = result.messages[0].metadata.event_payload.borrowId
    itemsBorrowed = result.messages[0].metadata.event_payload.itemsBorrowed
  })


  const sql = 'UPDATE borrowLog SET returned = TRUE WHERE borrowId = ?';
  const params = [borrowId];
  connection.query(sql, params, function (error, results, fields) {
    if (error) {
      console.error(error);
      return;
    }
  });

  //new idea: update message by getting blocks from old message, updating them, and sending them back
  console.log(message)

  message.blocks[2] = {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  }
  message.blocks[4] = {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "Returned: :white_check_mark:"
    }
  }

  await app.client.chat.update({
    channel: channel,
    ts: message_ts,
    text: message.text,
    blocks: message.blocks,
    metadata: message.metadata
  });


}
async function getOldReturnDate(borrowId) {
  // Create a connection to the database

  try {
    // Define the SQL query
    const sql = `SELECT returnDate FROM borrowLog WHERE id = ${borrowId}`;

    // Execute the query
    const [results] = await connection.execute(sql);
    const returnDate = results[0].returnDate;

    // Convert the returnDate string to a date object
    const oldReturnDate = new Date(returnDate);
    return oldReturnDate;
  } finally {
    // Close the connection
    connection.end();
  }
}


module.exports.handleExtension = async ({ ack, body, client, logger }) => {
  ack();

  const borrowId = body.message.metadata.event_payload.borrowId;
  //getting old return date from database
  connection.query('SELECT returnDate FROM borrowLog WHERE borrowId = ?', [borrowId], async function (error, results, fields) {
    if (error) {
      console.error(error);
      return;
    }
    console.log(results)
    console.log(fields)
    const oldReturnDate = new Date(await results[0].returnDate);
    const extension = await Object.values(body.state.values)[0].extension_request.selected_option.value
    const newReturnDate = new Date(oldReturnDate.setDate(oldReturnDate.getDate() + parseInt(extension)));
    const formattedReturnDate = newReturnDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    await app.client.chat.postMessage({
      channel: body.user.id,
      text: "Extension request successful. Please return by " + String(formattedReturnDate)
    });

    //update database
    const sql2 = 'UPDATE borrowLog SET returnDate = ? WHERE borrowId = ?';
    const params2 = [newReturnDate, body.message.metadata.event_payload.borrowId];
    connection.query(sql2, params2, function (error, results, fields) {
      if (error) {
        console.error(error);
        return;
      }
    });
  });

  //update message
  fs.readFile("messages/borrow/borrowConfirmation.json", 'utf8', async (err, data) => {

    if (err) throw err;
    try {
      var updatedMessage = JSON.parse(data);
      updatedMessage.ts = body.message.ts;
      updatedMessage.blocks[0].text.text = body.message.blocks[0].text.text;
      updatedMessage.blocks[1].text.text = body.message.blocks[1].text.text;
      updatedMessage.channel = body.channel.id;
      updatedMessage.metadata.event_payload.borrowId = body.message.metadata.event_payload.borrowId; //do I need this?

      await app.client.chat.update(updatedMessage);

      console.log(updatedMessage);
    } catch (e) {
      console.log(e)
    }

  });







}
module.exports.checkOverdue = function () {
  console.log("checking for overdue items")
  const sql = 'SELECT * FROM borrowLog WHERE returned = FALSE';
  connection.query(sql, function (error, results, fields) {
    if (error) {
      console.error(error);
      return;
    }
    results.forEach(async (row) => {
      const borrowId = row.borrowId;
      const returnDate = new Date(row.returnDate);
      const today = new Date();
      if (today > returnDate) {
        console.log("overdue item")
        const userId = row.userId;
        const itemsBorrowed = row.items;

        await app.client.chat.postMessage({
          channel: userId,
          text: "You have overdue items. Please return them as soon as possible. Once returned, press \"return\" on the message above. \nItems borrowed: " + itemsBorrowed
        });

      }
    })
  });
}
