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
  console.log('====================================');
  next();
});

app.post('/', async (req, res) => {
  console.log('[DEBUG] Received POST request');
  console.log('[DEBUG] Request Body:', JSON.stringify(req.body, null, 2));
  
  let event = req.body;
  
  try {
    let response = {};
    
    // Check if this is a Google Workspace Add-ons format
    if (event.chat) {
      console.log('[DEBUG] Detected Google Workspace Add-ons format');
      response = handleChatEvent(event);
    } 
    // Fallback for old format (if any)
    else if (event.type) {
      console.log('[DEBUG] Detected old Chat API format');
      response = handleOldFormatEvent(event);
    }
    else {
      console.log('[WARNING] Unknown event format');
      response = { text: "Unknown event format" };
    }
    
    console.log('[DEBUG] Response:', JSON.stringify(response, null, 2));
    return res.json(response);
    
  } catch (error) {
    console.error('[ERROR] Error processing request:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    return res.status(500).json({
      text: `Error: ${error.message}`
    });
  }
});

/**
 * Handle Google Workspace Add-ons Chat events
 */
function handleChatEvent(event) {
  console.log('[DEBUG] Processing Google Workspace Add-ons event');
  
  // Check if it's a slash command
  if (event.chat?.appCommandPayload) {
    console.log('[DEBUG] App Command Payload detected');
    const commandPayload = event.chat.appCommandPayload;
    
    if (commandPayload.message?.slashCommand) {
      console.log('[DEBUG] Slash command detected');
      const commandId = commandPayload.message.slashCommand.commandId;
      console.log('[DEBUG] Command ID:', commandId);
      
      return handleSlashCommand(commandId, event);
    }
  }
  
  // Check if it's a card click event
  if (event.commonEventObject?.invokedFunction) {
    console.log('[DEBUG] Card click event detected');
    const functionName = event.commonEventObject.invokedFunction;
    console.log('[DEBUG] Invoked function:', functionName);
    
    return handleCardClick(functionName, event);
  }
  
  // Default response for regular messages
  console.log('[DEBUG] Regular message, sending default response');
  return getDefaultResponse(event);
}

/**
 * Handle slash commands
 */
function handleSlashCommand(commandId, event) {
  console.log('[DEBUG] handleSlashCommand called with commandId:', commandId);
  
  switch (commandId) {
    case 1:
      console.log('[DEBUG] Handling /about command');
      return {
        text: "Manage your personal and business contacts 📇. To add a contact, use the slash command `/addContact`.",
        accessoryWidgets: [{
          buttonList: { 
            buttons: [{
              text: "Add Contact",
              onClick: { 
                action: {
                  function: "openInitialDialog",
                  interaction: "OPEN_DIALOG"
                }
              }
            }]
          }
        }]
      };
      
    case 2:
      console.log('[DEBUG] Handling /addContact command');
      return openInitialDialog();
      
    default:
      console.log('[WARNING] Unknown command ID:', commandId);
      return {
        text: `Unknown command ID: ${commandId}`
      };
  }
}

/**
 * Handle card click events
 */
function handleCardClick(functionName, event) {
  console.log('[DEBUG] handleCardClick called with function:', functionName);
  
  switch (functionName) {
    case "openInitialDialog":
      console.log('[DEBUG] Opening initial dialog');
      return openInitialDialog();
      
    case "openConfirmation":
      console.log('[DEBUG] Opening confirmation');
      return openConfirmation(event);
      
    case "submitForm":
      console.log('[DEBUG] Submitting form');
      return submitForm(event);
      
    default:
      console.log('[WARNING] Unknown function:', functionName);
      return {
        text: `Unknown function: ${functionName}`
      };
  }
}

/**
 * Opens the initial dialog
 */
function openInitialDialog() {
  console.log('[DEBUG] openInitialDialog called');
  
  const response = {
    action: {
      navigations: [{
        pushCard: {
          header: {
            title: "Add new contact"
          },
          sections: [{
            widgets: CONTACT_FORM_WIDGETS.concat([{
              buttonList: { 
                buttons: [{
                  text: "Review and submit",
                  onClick: { 
                    action: { 
                      function: "openConfirmation" 
                    }
                  }
                }]
              }
            }])
          }]
        }
      }]
    }
  };
  
  console.log('[DEBUG] Dialog response:', JSON.stringify(response, null, 2));
  return response;
}

/**
 * Opens confirmation card
 */
function openConfirmation(event) {
  console.log('[DEBUG] openConfirmation called');
  
  const name = getFormValue(event, "contactName") || "";
  const birthdate = getFormValue(event, "contactBirthdate") || "";
  const type = getFormValue(event, "contactType") || "";
  
  console.log('[DEBUG] Extracted values:');
  console.log('  Name:', name);
  console.log('  Birthdate:', birthdate);
  console.log('  Type:', type);
  
  const confirmationCard = {
    action: {
      navigations: [{
        pushCard: {
          header: {
            title: "Your contact"
          },
          sections: [{
            widgets: [
              { textParagraph: { text: "Confirm contact information and submit:" }},
              { textParagraph: { text: `<b>Name:</b> ${name}` }},
              { textParagraph: { text: `<b>Birthday:</b> ${convertMillisToDateString(birthdate)}` }},
              { textParagraph: { text: `<b>Type:</b> ${type}` }},
              {
                buttonList: { 
                  buttons: [{
                    text: "Submit",
                    onClick: { 
                      action: {
                        function: "submitForm",
                        parameters: [
                          { key: "contactName", value: name },
                          { key: "contactBirthdate", value: birthdate },
                          { key: "contactType", value: type }
                        ]
                      }
                    }
                  }]
                }
              }
            ]
          }]
        }
      }]
    }
  };
  
  console.log('[DEBUG] Confirmation response:', JSON.stringify(confirmationCard, null, 2));
  return confirmationCard;
}

/**
 * Submit the form
 */
function submitForm(event) {
  console.log('[DEBUG] submitForm called');
  
  const contactName = getParameterValue(event, "contactName");
  console.log('[DEBUG] Contact name:', contactName);
  
  if (!contactName) {
    console.log('[DEBUG] No contact name, returning error');
    return {
      action: {
        notification: {
          text: "Don't forget to name your new contact!"
        }
      }
    };
  }
  
  console.log('[DEBUG] Form submitted successfully');
  const confirmationMessage = `✅ ${contactName} has been added to your contacts.`;
  
  return {
    action: {
      navigations: [{
        popToRoot: true
      }],
      notification: {
        text: confirmationMessage
      }
    },
    text: confirmationMessage
  };
}

/**
 * Get form value from event
 */
function getFormValue(event, widgetName) {
  console.log(`[DEBUG] Getting form value for: ${widgetName}`);
  
  // Check in commonEventObject.formInputs
  if (event.commonEventObject?.formInputs?.[widgetName]) {
    const formInput = event.commonEventObject.formInputs[widgetName];
    console.log(`[DEBUG] Found form input:`, formInput);
    
    // String inputs
    if (formInput.stringInputs?.value?.[0]) {
      return formInput.stringInputs.value[0];
    }
    
    // Date inputs
    if (formInput.dateInput?.msSinceEpoch) {
      return formInput.dateInput.msSinceEpoch;
    }
  }
  
  console.log(`[DEBUG] No value found for: ${widgetName}`);
  return null;
}

/**
 * Get parameter value from event
 */
function getParameterValue(event, key) {
  console.log(`[DEBUG] Getting parameter value for: ${key}`);
  
  // Check in commonEventObject.parameters
  if (event.commonEventObject?.parameters) {
    for (const param of event.commonEventObject.parameters) {
      if (param.key === key) {
        console.log(`[DEBUG] Found parameter value:`, param.value);
        return param.value;
      }
    }
  }
  
  console.log(`[DEBUG] No parameter found for: ${key}`);
  return null;
}

/**
 * Get default response for regular messages
 */
function getDefaultResponse(event) {
  return {
    text: "To add a contact, try `/addContact` or click the button below:",
    accessoryWidgets: [{
      buttonList: { 
        buttons: [{
          text: "Add Contact",
          onClick: { 
            action: {
              function: "openInitialDialog"
            }
          }
        }]
      }
    }]
  };
}

/**
 * Handle old format events (fallback)
 */
function handleOldFormatEvent(event) {
  console.log('[DEBUG] Processing old format event');
  
  if (event.type === 'MESSAGE') {
    // Handle old MESSAGE format
    if (event.message?.slashCommand?.commandId) {
      return handleSlashCommand(event.message.slashCommand.commandId, event);
    }
    return getDefaultResponse(event);
  } 
  else if (event.type === 'CARD_CLICKED') {
    // Handle old CARD_CLICKED format
    if (event.common?.invokedFunction) {
      return handleCardClick(event.common.invokedFunction, event);
    }
  }
  
  return { text: "Unknown event type" };
}

/**
 * Convert milliseconds to date string
 */
function convertMillisToDateString(millis) {
  if (!millis) return 'No date';
  
  const date = new Date(Number(millis));
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
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

// Form widgets
const CONTACT_FORM_WIDGETS = [
  {
    textInput: {
      name: "contactName",
      label: "First and last name",
      type: "SINGLE_LINE"
    }
  },
  {
    dateTimePicker: {
      name: "contactBirthdate",
      label: "Birthdate",
      type: "DATE_ONLY"
    }
  },
  {
    selectionInput: {
      name: "contactType",
      label: "Contact type",
      type: "RADIO_BUTTON",
      items: [
        {
          text: "Work",
          value: "Work",
          selected: false
        },
        {
          text: "Personal",
          value: "Personal",
          selected: false
        }
      ]
    }
  }
];
