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
    // Fallback for Chat API format
    else if (event.type) {
      console.log('[DEBUG] Detected Chat API format');
      response = handleChatAPIEvent(event);
    }
    else {
      console.log('[WARNING] Unknown event format');
      response = {
        text: "Unknown event format"
      };
    }
    
    console.log('[DEBUG] Final Response:', JSON.stringify(response, null, 2));
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
  return getDefaultResponse();
}

/**
 * Handle Chat API format events
 */
function handleChatAPIEvent(event) {
  console.log('[DEBUG] Processing Chat API event');
  
  if (event.type === 'MESSAGE') {
    if (event.message?.slashCommand?.commandId) {
      const commandId = event.message.slashCommand.commandId;
      console.log('[DEBUG] Chat API slash command, ID:', commandId);
      return handleSlashCommandChatAPI(commandId, event);
    }
    return getDefaultResponseChatAPI();
  } 
  else if (event.type === 'CARD_CLICKED') {
    if (event.common?.invokedFunction) {
      return handleCardClickChatAPI(event.common.invokedFunction, event);
    }
  }
  
  return {
    text: "Unknown event type"
  };
}

/**
 * Handle slash commands for Google Workspace Add-ons
 */
function handleSlashCommand(commandId, event) {
  console.log('[DEBUG] handleSlashCommand called with commandId:', commandId);
  
  switch (commandId) {
    case 1:
      console.log('[DEBUG] Handling /about command');
      // Use the same format as /addContact (which works!)
      return {
        action: {
          navigations: [{
            pushCard: {
              header: {
                title: "📇 Contact Manager",
                subtitle: "Your Personal Contact Assistant"
              },
              sections: [{
                widgets: [
                  {
                    textParagraph: {
                      text: "<b>Welcome to Contact Manager!</b>"
                    }
                  },
                  {
                    textParagraph: {
                      text: "This app helps you manage your personal and business contacts easily."
                    }
                  },
                  {
                    decoratedText: {
                      topLabel: "Features",
                      text: "• Add new contacts\n• Track birthdays\n• Organize by type (Work/Personal)",
                      startIcon: {
                        iconUrl: "https://fonts.gstatic.com/s/i/googlematerialicons/star/v14/48px.svg"
                      }
                    }
                  },
                  {
                    decoratedText: {
                      topLabel: "Getting Started",
                      text: "Use /addContact command or click the button below",
                      startIcon: {
                        iconUrl: "https://fonts.gstatic.com/s/i/googlematerialicons/info/v14/48px.svg"
                      }
                    }
                  },
                  {
                    buttonList: { 
                      buttons: [
                        {
                          text: "Add Your First Contact",
                          onClick: { 
                            action: { 
                              function: "openInitialDialog" 
                            }
                          }
                        },
                        {
                          text: "Close",
                          onClick: {
                            action: {
                              function: "closeCard"
                            }
                          }
                        }
                      ]
                    }
                  }
                ]
              }]
            }
          }]
        }
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
 * Handle slash commands for Chat API
 */
function handleSlashCommandChatAPI(commandId, event) {
  console.log('[DEBUG] handleSlashCommandChatAPI called with commandId:', commandId);
  
  switch (commandId) {
    case 1:
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
      break;
      
    case 2:
      return openInitialDialogChatAPI();
      break;
      
    default:
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
      
    case "closeCard":
      console.log('[DEBUG] Closing card');
      return {
        action: {
          navigations: [{
            popToRoot: true
          }]
        }
      };
      
    default:
      console.log('[WARNING] Unknown function:', functionName);
      return {
        text: `Unknown function: ${functionName}`
      };
  }
}

/**
 * Handle card click for Chat API
 */
function handleCardClickChatAPI(functionName, event) {
  console.log('[DEBUG] handleCardClickChatAPI called with function:', functionName);
  
  switch (functionName) {
    case "openInitialDialog":
      return openInitialDialogChatAPI();
      
    case "openConfirmation":
      return openConfirmationChatAPI(event);
      
    case "submitForm":
      return submitFormChatAPI(event);
      
    case "closeCard":
      console.log('[DEBUG] Closing card');
      return {
        actionResponse: {
          type: "UPDATE_MESSAGE"
        },
        text: "Card closed."
      };
      
    default:
      return {
        text: `Unknown function: ${functionName}`
      };
  }
}

/**
 * Opens the initial dialog for Google Workspace Add-ons
 */
function openInitialDialog() {
  console.log('[DEBUG] openInitialDialog called');
  
  return {
    action: {
      navigations: [{
        pushCard: {
          header: {
            title: "Add New Contact"
          },
          sections: [{
            widgets: CONTACT_FORM_WIDGETS.concat([{
              buttonList: { 
                buttons: [{
                  text: "Review and Submit",
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
}

/**
 * Opens the initial dialog for Chat API
 */
function openInitialDialogChatAPI() {
  console.log('[DEBUG] openInitialDialogChatAPI called');
  
  return {
    actionResponse: {
      type: "DIALOG",
      dialogAction: {
        dialog: {
          body: {
            sections: [{
              header: "Add new contact",
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
        }
      }
    }
  };
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
  
  if (!name) {
    return {
      action: {
        notification: {
          text: "Please enter a contact name"
        }
      }
    };
  }
  
  return {
    action: {
      navigations: [{
        pushCard: {
          header: {
            title: "Confirm Contact"
          },
          sections: [{
            widgets: [
              {
                textParagraph: {
                  text: "<b>Please confirm the contact information:</b>"
                }
              },
              {
                decoratedText: {
                  topLabel: "Name",
                  text: name
                }
              },
              {
                decoratedText: {
                  topLabel: "Birthday",
                  text: convertMillisToDateString(birthdate)
                }
              },
              {
                decoratedText: {
                  topLabel: "Contact Type",
                  text: type || "Not specified"
                }
              },
              {
                buttonList: { 
                  buttons: [
                    {
                      text: "Submit",
                      onClick: { 
                        action: {
                          function: "submitForm",
                          parameters: [
                            { key: "contactName", value: name },
                            { key: "contactBirthdate", value: birthdate.toString() },
                            { key: "contactType", value: type }
                          ]
                        }
                      }
                    },
                    {
                      text: "Back",
                      onClick: {
                        action: {
                          function: "openInitialDialog"
                        }
                      }
                    }
                  ]
                }
              }
            ]
          }]
        }
      }]
    }
  };
}

/**
 * Opens confirmation for Chat API
 */
function openConfirmationChatAPI(event) {
  console.log('[DEBUG] openConfirmationChatAPI called');
  
  const name = fetchFormValue(event, "contactName") || "";
  const birthdate = fetchFormValue(event, "contactBirthdate") || "";
  const type = fetchFormValue(event, "contactType") || "";
  
  const cardConfirmation = {
    header: "Your contact",
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
                  { key: "contactBirthdate", value: birthdate.toString() },
                  { key: "contactType", value: type }
                ]
              }
            }
          }]
        }
      }
    ]
  };

  if (event.isDialogEvent) {
    return {
      action_response: {
        type: "DIALOG",
        dialogAction: { 
          dialog: { 
            body: { 
              sections: [cardConfirmation]
            }
          }
        }
      }
    };
  }

  return {
    actionResponse: { type: "UPDATE_MESSAGE" },
    privateMessageViewer: event.user,
    cardsV2: [{
      card: { 
        sections: [cardConfirmation]
      }
    }]
  };
}

/**
 * Submit the form
 */
function submitForm(event) {
  console.log('[DEBUG] submitForm called');
  
  const contactName = getParameterValue(event, "contactName");
  console.log('[DEBUG] Contact name:', contactName);
  
  if (!contactName) {
    return {
      action: {
        notification: {
          text: "❌ Don't forget to name your new contact!"
        }
      }
    };
  }
  
  const confirmationMessage = `✅ ${contactName} has been added to your contacts!`;
  
  return {
    action: {
      navigations: [{
        popToRoot: true
      }],
      notification: {
        text: confirmationMessage
      }
    },
    text: confirmationMessage,
    cardsV2: [{
      card: {
        header: {
          title: "Success!"
        },
        sections: [{
          widgets: [{
            textParagraph: {
              text: confirmationMessage
            }
          }]
        }]
      }
    }]
  };
}

/**
 * Submit form for Chat API
 */
function submitFormChatAPI(event) {
  console.log('[DEBUG] submitFormChatAPI called');
  
  const contactName = event.common.parameters?.["contactName"];
  
  if (!contactName && event.dialogEventType === "SUBMIT_DIALOG") {
    return {
      actionResponse: {
        type: "DIALOG",
        dialogAction: {
          actionStatus: {
            statusCode: "INVALID_ARGUMENT",
            userFacingMessage: "Don't forget to name your new contact!"
          }
        }
      }
    };
  }
  
  if (!contactName) {
    return {
      privateMessageViewer: event.user,
      text: "Don't forget to name your new contact!"
    };
  }

  const confirmationMessage = `✅ ${contactName} has been added to your contacts.`;
  
  if (event.dialogEventType === "SUBMIT_DIALOG") {
    return {
      actionResponse: {
        type: "DIALOG",
        dialogAction: {
          actionStatus: {
            statusCode: "OK",
            userFacingMessage: `Success ${contactName}`
          }
        }
      }
    };
  }
  
  return {
    actionResponse: { type: "NEW_MESSAGE" },
    privateMessageViewer: event.user,
    text: confirmationMessage
  };
}

/**
 * Get form value from event
 */
function getFormValue(event, widgetName) {
  console.log(`[DEBUG] Getting form value for: ${widgetName}`);
  
  if (event.commonEventObject?.formInputs?.[widgetName]) {
    const formInput = event.commonEventObject.formInputs[widgetName];
    console.log(`[DEBUG] Found form input:`, JSON.stringify(formInput, null, 2));
    
    if (formInput.stringInputs?.value?.[0]) {
      return formInput.stringInputs.value[0];
    }
    
    if (formInput.dateInput?.msSinceEpoch) {
      return formInput.dateInput.msSinceEpoch;
    }
  }
  
  console.log(`[DEBUG] No value found for: ${widgetName}`);
  return null;
}

/**
 * Fetch form value for Chat API
 */
function fetchFormValue(event, widgetName) {
  const formItem = event.common?.formInputs?.[widgetName];
  
  if (!formItem) return null;
  
  if (formItem.hasOwnProperty("stringInputs")) {
    return formItem.stringInputs.value?.[0] || null;
  }
  
  if (formItem.hasOwnProperty("dateInput")) {
    return formItem.dateInput.msSinceEpoch || null;
  }
  
  return null;
}

/**
 * Get parameter value from event
 */
function getParameterValue(event, key) {
  console.log(`[DEBUG] Getting parameter value for: ${key}`);
  
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
 * Get default response
 */
function getDefaultResponse() {
  return {
    text: "To add a contact, use /addContact command",
    cardsV2: [{
      card: {
        sections: [{
          widgets: [{
            textParagraph: {
              text: "Use <b>/addContact</b> or click below:"
            }
          },
          {
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
        }]
      }
    }]
  };
}

/**
 * Get default response for Chat API
 */
function getDefaultResponseChatAPI() {
  return {
    text: "To add a contact, try `/addContact`",
    cardsV2: [{
      cardId: "defaultCard",
      card: {
        header: {
          title: "Contact Manager"
        },
        sections: [{
          widgets: [{
            textParagraph: {
              text: "Use <b>/addContact</b> or click below:"
            }
          },
          {
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
        }]
      }
    }]
  };
}

/**
 * Convert milliseconds to date string
 */
function convertMillisToDateString(millis) {
  if (!millis) return 'No date specified';
  
  try {
    const date = new Date(Number(millis));
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    console.log('[ERROR] Date conversion error:', error);
    return 'Invalid date';
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  console.log('[DEBUG] Health check requested');
  res.send('Google Chat App is running! (v4 - Fixed /about command)');
});

app.listen(PORT, () => {
  console.log('====================================');
  console.log(`[INFO] Server is running on port ${PORT}`);
  console.log(`[INFO] Timestamp: ${new Date().toISOString()}`);
  console.log('[INFO] Supporting both Chat API and Google Workspace Add-ons formats');
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