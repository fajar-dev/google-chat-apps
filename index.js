/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const express = require('express');
const PORT = process.env.PORT || 8080;

const app = express()
  .use(express.urlencoded({extended: false}))
  .use(express.json());

// Middleware untuk log semua request
app.use((req, res, next) => {
  console.log('====================================');
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('====================================');
  next();
});

app.post('/', async (req, res) => {
  console.log('[DEBUG] Received POST request');
  console.log('[DEBUG] Request Body:', JSON.stringify(req.body, null, 2));
  
  let event = req.body;
  
  // Log event type
  console.log('[DEBUG] Event Type:', event.type);
  
  let body = {};
  
  try {
    if (event.type === 'MESSAGE') {
      console.log('[DEBUG] Processing MESSAGE event');
      body = onMessage(event);
    } else if (event.type === 'CARD_CLICKED') {
      console.log('[DEBUG] Processing CARD_CLICKED event');
      console.log('[DEBUG] Invoked Function:', event.common?.invokedFunction);
      body = onCardClick(event);
    } else {
      console.log('[WARNING] Unknown event type:', event.type);
      body = { text: `Unknown event type: ${event.type}` };
    }
    
    console.log('[DEBUG] Response Body:', JSON.stringify(body, null, 2));
    return res.json(body);
    
  } catch (error) {
    console.error('[ERROR] Error processing request:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    return res.status(500).json({
      text: `Error: ${error.message}`
    });
  }
});

/**
 * Responds to a MESSAGE interaction event in Google Chat.
 *
 * @param {Object} event the MESSAGE interaction event from Chat API.
 * @return {Object} message response that opens a dialog or sends private
 *                          message with text and card.
 */
function onMessage(event) {
  console.log('[DEBUG] onMessage called');
  console.log('[DEBUG] Message object:', JSON.stringify(event.message, null, 2));
  
  if (event.message.slashCommand) {
    console.log('[DEBUG] Slash command detected');
    console.log('[DEBUG] Command ID:', event.message.slashCommand.commandId);
    
    switch (event.message.slashCommand.commandId) {
      case "1":
        console.log('[DEBUG] Handling /about command');
        // If the slash command is "/about", responds with a text message and button
        // that opens a dialog.
        return {
          text: "Manage your personal and business contacts 📇. To add a " +
                  "contact, use the slash command `/addContact`.",
          accessoryWidgets: [{
            // [START open_dialog_from_button]
            buttonList: { buttons: [{
              text: "Add Contact",
              onClick: { action: {
                function: "openInitialDialog",
                interaction: "OPEN_DIALOG"
              }}
            }]}
            // [END open_dialog_from_button]
          }]
        }
      case "2":
        console.log('[DEBUG] Handling /addContact command');
        // If the slash command is "/addContact", opens a dialog.
        return openInitialDialog();
      default:
        console.log('[WARNING] Unknown command ID:', event.message.slashCommand.commandId);
        return {
          text: `Unknown command ID: ${event.message.slashCommand.commandId}`
        };
    }
  }

  console.log('[DEBUG] No slash command, sending private message');
  // If user sends the Chat app a message without a slash command, the app responds
  // privately with a text and card to add a contact.
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
 *
 * @param {Object} event the CARD_CLICKED interaction event from Google Chat.
 * @return {Object} message responses specific to the dialog handling.
 */
function onCardClick(event) {
  console.log('[DEBUG] onCardClick called');
  console.log('[DEBUG] Common object:', JSON.stringify(event.common, null, 2));
  console.log('[DEBUG] Invoked function:', event.common?.invokedFunction);
  
  // Initial dialog form page
  if (event.common.invokedFunction === "openInitialDialog") {
    console.log('[DEBUG] Opening initial dialog');
    return openInitialDialog();
  // Confirmation dialog form page
  } else if (event.common.invokedFunction === "openConfirmation") {
    console.log('[DEBUG] Opening confirmation dialog');
    return openConfirmation(event);
  // Submission dialog form page
  } else if (event.common.invokedFunction === "submitForm") {
    console.log('[DEBUG] Submitting form');
    return submitForm(event);
  } else {
    console.log('[WARNING] Unknown function:', event.common?.invokedFunction);
    return {
      text: `Unknown function: ${event.common?.invokedFunction}`
    };
  }
}

// [START open_initial_dialog]
/**
 * Opens the initial step of the dialog that lets users add contact details.
 *
 * @return {Object} a message with an action response to open a dialog.
 */
function openInitialDialog() {
  console.log('[DEBUG] openInitialDialog called');
  const response = { actionResponse: {
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
  console.log('[DEBUG] Initial dialog response:', JSON.stringify(response, null, 2));
  return response;
}
// [END open_initial_dialog]

/**
 * Returns the second step as a dialog or card message that lets users confirm details.
 *
 * @param {Object} event the interactive event with form inputs.
 * @return {Object} returns a dialog or private card message.
 */
function openConfirmation(event) {
  console.log('[DEBUG] openConfirmation called');
  console.log('[DEBUG] Form inputs:', JSON.stringify(event.common?.formInputs, null, 2));
  console.log('[DEBUG] Is dialog event?', event.isDialogEvent);
  
  const name = fetchFormValue(event, "contactName") ?? "";
  const birthdate = fetchFormValue(event, "contactBirthdate") ?? "";
  const type = fetchFormValue(event, "contactType") ?? "";
  
  console.log('[DEBUG] Extracted values:');
  console.log('  Name:', name);
  console.log('  Birthdate:', birthdate);
  console.log('  Type:', type);
  
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
            key: "contactBirthdate", value: birthdate }, {
            key: "contactType", value: type
          }]
        }}
      }]}
      // [END set_parameters]
    }]
  };

  // Returns a dialog with contact information that the user input.
  if (event.isDialogEvent) {
    console.log('[DEBUG] Returning dialog response');
    const dialogResponse = { action_response: {
      type: "DIALOG",
      dialogAction: { dialog: { body: { sections: [ cardConfirmation ]}}}
    }};
    console.log('[DEBUG] Dialog response:', JSON.stringify(dialogResponse, null, 2));
    return dialogResponse;
  }

  console.log('[DEBUG] Returning card update response');
  // Updates existing card message with contact information that the user input.
  const cardResponse = {
    actionResponse: { type: "UPDATE_MESSAGE" },
    privateMessageViewer: event.user,
    cardsV2: [{
      card: { sections: [cardConfirmation]}
    }]
  };
  console.log('[DEBUG] Card response:', JSON.stringify(cardResponse, null, 2));
  return cardResponse;
}
// [END subsequent_steps]

/**
  * Validates and submits information from a dialog or card message
  * and notifies status.
  *
  * @param {Object} event the interactive event with parameters.
  * @return {Object} a message response that opens a dialog or posts a private
  *                  message.
  */
function submitForm(event) {
  console.log('[DEBUG] submitForm called');
  console.log('[DEBUG] Parameters:', JSON.stringify(event.common?.parameters, null, 2));
  console.log('[DEBUG] Dialog event type:', event.dialogEventType);
  
  // [START status_notification]
  const contactName = event.common.parameters["contactName"];
  console.log('[DEBUG] Contact name:', contactName);
  
  // Checks to make sure the user entered a contact name.
  // If no name value detected, returns an error message.
  const errorMessage = "Don't forget to name your new contact!";
  if (!contactName && event.dialogEventType === "SUBMIT_DIALOG") {
    console.log('[DEBUG] No contact name in dialog submission, returning error');
    return { actionResponse: {
      type: "DIALOG",
      dialogAction: { actionStatus: {
        statusCode: "INVALID_ARGUMENT",
        userFacingMessage: errorMessage
      }}
    }};
  }
  // [END status_notification]
  if (!contactName) {
    console.log('[DEBUG] No contact name in card submission, returning error message');
    return {
      privateMessageViewer: event.user,
      text: errorMessage
    };
  }

  // [START confirmation_success]
  // The Chat app indicates that it received form data from the dialog or card.
  // Sends private text message that confirms submission.
  const confirmationMessage = "✅ " + contactName + " has been added to your contacts.";
  if (event.dialogEventType === "SUBMIT_DIALOG") {
    console.log('[DEBUG] Returning dialog success response');
    return {
      actionResponse: {
        type: "DIALOG",
        dialogAction: { actionStatus: {
          statusCode: "OK",
          userFacingMessage: "Success " + contactName
        }}
      }
    };
  }
  // [END confirmation_success]
  // [START confirmation_message]
  console.log('[DEBUG] Returning new message response');
  return {
    actionResponse: { type: "NEW_MESSAGE" },
    privateMessageViewer: event.user,
    text: confirmationMessage
  };
  // [END confirmation_message]
}

/**
 * Extracts form input value for a given widget.
 *
 * @param {Object} event the CARD_CLICKED interaction event from Google Chat.
 * @param {String} widgetName a unique ID for the widget, specified in the widget's name field.
 * @returns the value inputted by the user, null if no value can be found.
 */
function fetchFormValue(event, widgetName) {
  console.log(`[DEBUG] fetchFormValue called for widget: ${widgetName}`);
  
  if (!event.common || !event.common.formInputs) {
    console.log('[WARNING] No formInputs found in event.common');
    return null;
  }
  
  const formItem = event.common.formInputs[widgetName];
  
  if (!formItem) {
    console.log(`[WARNING] No form item found for widget: ${widgetName}`);
    return null;
  }
  
  console.log(`[DEBUG] Form item for ${widgetName}:`, JSON.stringify(formItem, null, 2));
  
  // For widgets that receive StringInputs data, the value input by the user.
  if (formItem.hasOwnProperty("stringInputs")) {
    const stringInput = event.common.formInputs[widgetName].stringInputs.value[0];
    console.log(`[DEBUG] String input value for ${widgetName}: ${stringInput}`);
    if (stringInput != null) {
      return stringInput;
    }
  // For widgets that receive dateInput data, the value input by the user.
  } else if (formItem.hasOwnProperty("dateInput")) {
    const dateInput = event.common.formInputs[widgetName].dateInput.msSinceEpoch;
    console.log(`[DEBUG] Date input value for ${widgetName}: ${dateInput}`);
     if (dateInput != null) {
       return dateInput;
     }
  }

  console.log(`[WARNING] No valid value found for widget: ${widgetName}`);
  return null;
}

/**
 * Converts date in milliseconds since epoch to user-friendly string.
 *
 * @param {Object} millis the milliseconds since epoch time.
 * @return {string} Display-friend date (English US).
 */
function convertMillisToDateString(millis) {
  console.log(`[DEBUG] Converting millis to date: ${millis}`);
  if (!millis) {
    console.log('[WARNING] No millis value provided');
    return 'No date';
  }
  const date = new Date(Number(millis));
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const result = date.toLocaleDateString('en-US', options);
  console.log(`[DEBUG] Converted date: ${result}`);
  return result;
}

// Health check endpoint
app.get('/', (req, res) => {
  console.log('[DEBUG] Health check requested');
  res.send('Google Chat App is running!');
});

app.listen(PORT, () => {
  console.log('====================================');
  console.log(`[INFO] Server is running on port ${PORT}`);
  console.log(`[INFO] Timestamp: ${new Date().toISOString()}`);
  console.log('====================================');
});

// [START input_widgets]
/**
 * The section of the contact card that contains the form input widgets. Used in a dialog and card message.
 * To add and preview widgets, use the Card Builder: https://addons.gsuite.google.com/uikit/builder
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