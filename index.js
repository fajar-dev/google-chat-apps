const express = require('express');
const PORT = process.env.PORT || 8080;

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

const app = express()
  .use(express.urlencoded({extended: false}))
  .use(express.json());

app.post('/', async (req, res) => {
  let event = req.body;
  
  try {
    let body = {};
    let eventType = event.type || event.chat?.appCommandPayload ? 'MESSAGE' : null;

    if (eventType === 'MESSAGE') {
      body = onMessage(event);
    } else if (event.type === 'CARD_CLICKED') {
      body = onCardClick(event);
    } else if (event.type === 'ADDED_TO_SPACE' || event.type === 'REMOVED_FROM_SPACE') {
      body = { text: "Terima kasih sudah menambahkan saya!" };
    }

    if (Object.keys(body).length === 0) {
        return res.json({});
    }

    return res.json(body);
  } catch (error) {
    console.error('Error processing event:', error);
    return res.json({ text: `❌ Server error: ${error.message}` });
  }
});

function onMessage(event) {
  const message = event.chat?.message;

  if (!message) {
    return { text: "Pesan tidak ditemukan dalam payload." };
  }

  if (message.slashCommand) {
    switch (message.slashCommand.commandId) {
      case 1:
      case "1":
        return {
          text: "Manage your personal and business contacts 📇. To add a " +
                "contact, use the slash command `/addContact`.",
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
      case 2:
      case "2":
        return openInitialDialog();
    }
  }

  return {
    privateMessageViewer: event.chat.user,
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

function onCardClick(event) {
  if (event.common.invokedFunction === "openInitialDialog") {
    return openInitialDialog();
  } else if (event.common.invokedFunction === "openConfirmation") {
    return openConfirmation(event);
  } else if (event.common.invokedFunction === "submitForm") {
    return submitForm(event);
  }
}

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

function openConfirmation(event) {
  const name = fetchFormValue(event, "contactName") ?? "";
  const birthdate = fetchFormValue(event, "contactBirthdate") ?? "";
  const type = fetchFormValue(event, "contactType") ?? "";
  
  const cardConfirmation = {
    header: "Your contact",
    widgets: [{
      textParagraph: { text: "Confirm contact information and submit:" }}, {
      textParagraph: { text: "<b>Name:</b> " + name }}, {
      textParagraph: {
        text: "<b>Birthday:</b> " + convertMillisToDateString(birthdate)
      }}, {
      textParagraph: { text: "<b>Type:</b> " + type }}, {
      buttonList: { buttons: [{
        text: "Submit",
        onClick: { action: {
          function: "submitForm",
          parameters: [{
            key: "contactName", value: name }, {
            key: "contactBirthdate", value: birthdate.toString() }, {
            key: "contactType", value: type
          }]
        }}
      }]}
    }]
  };

  if (event.isDialogEvent) {
    return { actionResponse: {
      type: "DIALOG",
      dialogAction: { dialog: { body: { sections: [ cardConfirmation ]}}}
    }};
  }

  return {
    actionResponse: { type: "UPDATE_MESSAGE" },
    privateMessageViewer: event.chat.user,
    cardsV2: [{
      card: { sections: [cardConfirmation]}
    }]
  }
}

function submitForm(event) {
  const contactName = event.common.parameters["contactName"];
  const confirmationMessage = "✅ " + contactName + " has been added to your contacts.";
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
        privateMessageViewer: event.chat.user,
        text: errorMessage
      };
  }
  
  if (event.dialogEventType === "SUBMIT_DIALOG") {
    return {
      actionResponse: {
        type: "DIALOG",
        dialogAction: { actionStatus: {
          statusCode: "OK",
          userFacingMessage: confirmationMessage
        }}
      }
    };
  }

  return {
    actionResponse: { type: "NEW_MESSAGE" },
    privateMessageViewer: event.chat.user,
    text: confirmationMessage
  };
}

function fetchFormValue(event, widgetName) {
  const formInputs = event.common?.formInputs;
  if (!formInputs) return null;
  
  const formItem = formInputs[widgetName];
  if (!formItem) return null;

  if (formItem.hasOwnProperty("stringInputs")) {
    const stringInputs = formItem.stringInputs.value;
    if (stringInputs && stringInputs.length > 0) {
      return stringInputs[0];
    }
  } else if (formItem.hasOwnProperty("dateInput")) {
    const dateInput = formItem.dateInput.msSinceEpoch;
      if (dateInput != null) {
        return dateInput;
      }
  }

  return null;
}

function convertMillisToDateString(millis) {
  if (!millis) return "N/A";
  
  const date = new Date(Number(millis));
  if (isNaN(date)) return "Invalid Date";
  
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

app.listen(PORT, () => {
  console.log(`✅ Server is running in port - ${PORT}`);
});