const express = require('express');
const PORT = process.env.PORT || 8080;

// [START input_widgets]
/**
 * The section of the contact card that contains the form input widgets. Used in a dialog and card message.
 */
const CONTACT_FORM_WIDGETS = [
  {
    "textInput": {
      "name": "contactName",
      "label": "First and last name",
      "type": "SINGLE_LINE"
    }
  },
  {
    "dateTimePicker": {
      "name": "contactBirthdate",
      "label": "Birthdate",
      "type": "DATE_ONLY"
    }
  },
  {
    "selectionInput": {
      "name": "contactType",
      "label": "Contact type",
      "type": "RADIO_BUTTON",
      "items": [
        {
          "text": "Work",
          "value": "Work",
          "selected": false
        },
        {
          "text": "Personal",
          "value": "Personal",
          "selected": false
        }
      ]
    }
  }
];
// [END input_widgets]


const app = express()
  .use(express.urlencoded({extended: false}))
  .use(express.json());

app.post('/', async (req, res) => {
  let event = req.body;
  console.log('Received event:', JSON.stringify(event, null, 2)); // Debugging

  try {
    let body = {};
    if (event.type === 'MESSAGE') {
      body = onMessage(event);
    } else if (event.type === 'CARD_CLICKED') {
      body = onCardClick(event);
    }
    
    // Pastikan body memiliki properti jika event diproses
    if (Object.keys(body).length === 0 && event.type !== 'PING') {
        console.warn('Handler returned empty body for event type:', event.type);
        // Respon default minimal jika tidak ada yang cocok
        return res.json({ text: "Command not recognized or event type not handled." });
    }

    return res.json(body);
  } catch (error) {
    // Menangkap error JavaScript dan mengirim respons ke Chat
    console.error('Error processing event:', error);
    return res.json({ text: `❌ Maaf, terjadi error internal: ${error.message}` });
  }
});

/**
 * Responds to a MESSAGE interaction event in Google Chat.
 */
function onMessage(event) {
  // Hanya proses jika ada slash command
  if (event.message.slashCommand) {
    switch (event.message.slashCommand.commandId) {
      case "1": // Diasumsikan commandId "1" untuk /about
        // If the slash command is "/about", responds with a text message and button
        return {
          text: "Manage your personal and business contacts 📇. To add a " +
                "contact, use the slash command `/addContact` (ID 2).",
          accessoryWidgets: [{
            buttonList: { buttons: [{
              text: "Add Contact",
              onClick: { action: {
                function: "openInitialDialog",
                interaction: "OPEN_DIALOG"
              }}
            }]}
          }]
        }
      case "2": // Diasumsikan commandId "2" untuk /addContact
        // If the slash command is "/addContact", opens a dialog.
        return openInitialDialog();
    }
  }

  // Jika tidak ada slash command, balas pesan non-slash.
  return {
    privateMessageViewer: event.user,
    text: "To add a contact, try `/addContact` or complete the form below:",
    cardsV2: [{
      cardId: "addContactForm",
      card: {
        header: { title: "Add a contact" },
        sections:[{ widgets: CONTACT_FORM_WIDGETS.concat([{
          buttonList: { buttons: [{
            text: "Review and submit",
            onClick: { action: { function : "openConfirmation" }}
          }]}
        }])}]
      }
    }]
  };
}

// [START subsequent_steps]
/**
 * Responds to CARD_CLICKED interaction events in Google Chat.
 */
function onCardClick(event) {
  // Initial dialog form page
  if (event.common.invokedFunction === "openInitialDialog") {
    return openInitialDialog();
  // Confirmation dialog form page
  } else if (event.common.invokedFunction === "openConfirmation") {
    return openConfirmation(event);
  // Submission dialog form page
  } else if (event.common.invokedFunction === "submitForm") {
    return submitForm(event);
  }
}

// [START open_initial_dialog]
/**
 * Opens the initial step of the dialog that lets users add contact details.
 */
function openInitialDialog() {
  return { actionResponse: {
    type: "DIALOG",
    dialogAction: { dialog: { body: { sections: [{
      header: "Add new contact",
      widgets: CONTACT_FORM_WIDGETS.concat([{
        buttonList: { buttons: [{
          text: "Review and submit",
          onClick: { action: { function: "openConfirmation" }}
        }]}
      }])
    }]}}}
  }};
}
// [END open_initial_dialog]

/**
 * Returns the second step as a dialog or card message that lets users confirm details.
 */
function openConfirmation(event) {
  const name = fetchFormValue(event, "contactName") ?? "";
  const birthdate = fetchFormValue(event, "contactBirthdate") ?? "";
  const type = fetchFormValue(event, "contactType") ?? "";
  
  // Pastikan setidaknya satu nilai formulir telah diambil
  if (!name && !birthdate && !type) {
    console.error("No form inputs found in event:", event);
    // Jika tidak ada input formulir, kembalikan pesan error.
    return { text: "⚠️ Error: Form inputs not found. Did you fill out the form?" };
  }

  const cardConfirmation = {
    header: "Your contact",
    widgets: [{
      textParagraph: { text: "Confirm contact information and submit:" }}, {
      textParagraph: { text: "<b>Name:</b> " + name }}, {
      textParagraph: {
        text: "<b>Birthday:</b> " + convertMillisToDateString(birthdate)
      }}, {
      textParagraph: { text: "<b>Type:</b> " + type }}, {
      // [START set_parameters]
      buttonList: { buttons: [{
        text: "Submit",
        onClick: { action: {
          function: "submitForm",
          parameters: [{
            key: "contactName", value: name }, {
            key: "contactBirthdate", value: birthdate.toString() }, { // Pastikan nilai dikirim sebagai string
            key: "contactType", value: type
          }]
        }}
      }]}
      // [END set_parameters]
    }]
  };

  // Returns a dialog with contact information that the user input.
  if (event.isDialogEvent) {
    return { actionResponse: {
      type: "DIALOG",
      dialogAction: { dialog: { body: { sections: [ cardConfirmation ]}}}
    }};
  }

  // Updates existing card message with contact information that the user input.
  return {
    actionResponse: { type: "UPDATE_MESSAGE" },
    privateMessageViewer: event.user,
    cardsV2: [{
      card: { sections: [cardConfirmation]}
    }]
  }
}
// [END subsequent_steps]

/**
 * Validates and submits information from a dialog or card message
 * and notifies status.
 */
function submitForm(event) {
  // [START status_notification]
  const contactName = event.common.parameters["contactName"];
  // Checks to make sure the user entered a contact name.
  const errorMessage = "Don't forget to name your new contact!";
  
  if (!contactName) {
      if (event.dialogEventType === "SUBMIT_DIALOG") {
          return { actionResponse: {
            type: "DIALOG",
            dialogAction: { actionStatus: {
              statusCode: "INVALID_ARGUMENT",
              userFacingMessage: errorMessage
            }}
          }};
      }
      return {
        privateMessageViewer: event.user,
        text: errorMessage
      };
  }
  // [END status_notification]

  // [START confirmation_success]
  // The Chat app indicates that it received form data from the dialog or card.
  // Sends private text message that confirms submission.
  const confirmationMessage = "✅ " + contactName + " has been added to your contacts.";
  
  if (event.dialogEventType === "SUBMIT_DIALOG") {
    // Jika dari Dialog, tutup dialog dan kirim status OK.
    return {
      actionResponse: {
        type: "DIALOG",
        dialogAction: { actionStatus: {
          statusCode: "OK",
          userFacingMessage: confirmationMessage // Tampilkan pesan sukses di dialog
        }}
      },
      // Bisa juga mengirim pesan ke ruang chat setelah dialog tertutup (opsional)
      // text: confirmationMessage 
    };
  }
  // [END confirmation_success]
  
  // [START confirmation_message]
  // Jika dari Card (bukan Dialog), perbarui pesan
  return {
    actionResponse: { type: "NEW_MESSAGE" },
    privateMessageViewer: event.user,
    text: confirmationMessage
  };
  // [END confirmation_message]
}

/**
 * Extracts form input value for a given widget.
 */
function fetchFormValue(event, widgetName) {
  // Cek apakah formInputs ada dan bukan null
  const formInputs = event.common?.formInputs;
  if (!formInputs) {
    console.warn("formInputs is missing in event.");
    return null;
  }
  
  const formItem = formInputs[widgetName];
  if (!formItem) return null;

  // Untuk StringInputs
  if (formItem.hasOwnProperty("stringInputs")) {
    const stringInputs = formItem.stringInputs.value;
    if (stringInputs && stringInputs.length > 0) {
      return stringInputs[0];
    }
  // Untuk DateInput
  } else if (formItem.hasOwnProperty("dateInput")) {
    const dateInput = formItem.dateInput.msSinceEpoch;
      if (dateInput != null) {
        return dateInput;
      }
  }

  return null;
}

/**
 * Converts date in milliseconds since epoch to user-friendly string.
 */
function convertMillisToDateString(millis) {
  if (!millis) return "N/A";
  
  // Pastikan 'millis' adalah Number sebelum konversi
  const date = new Date(Number(millis));
  
  // Cek apakah tanggal valid
  if (isNaN(date)) return "Invalid Date";
  
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Bagian yang paling sering menyebabkan error (server belum di-listen)
app.listen(PORT, () => {
  console.log(`✅ Server is running in port - ${PORT}`);
});