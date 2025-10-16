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
      response = createTextResponse("Unknown event format");
    }
    
    console.log('[DEBUG] Final Response:', JSON.stringify(response, null, 2));
    return res.json(response);
    
  } catch (error) {
    console.error('[ERROR] Error processing request:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    return res.status(500).json(createTextResponse(`Error: ${error.message}`));
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
        cardsV2: [{
          cardId: "aboutCard",
          card: {
            header: {
              title: "Contact Manager",
              subtitle: "Manage your personal and business contacts 📇",
              imageUrl: "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/contact_page/default/48px.svg",
              imageType: "CIRCLE"
            },
            sections: [{
              widgets: [
                {
                  textParagraph: {
                    text: "Welcome to Contact Manager! You can:\n• Add new contacts\n• Manage personal and business contacts\n• Keep track of birthdays"
                  }
                },
                {
                  textParagraph: {
                    text: "To add a contact, use the slash command <b>/addContact</b> or click the button below:"
                  }
                },
                {
                  buttonList: {
                    buttons: [{
                      text: "Add Contact",
                      icon: {
                        iconUrl: "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/person_add/default/48px.svg"
                      },
                      onClick: {
                        action: {
                          function: "openInitialDialog"
                        }
                      },
                      color: {
                        red: 0.25,
                        green: 0.52,
                        blue: 0.96
                      }
                    }]
                  }
                }
              ]
            }]
          }
        }]
      };
      
    case 2:
      console.log('[DEBUG] Handling /addContact command');
      return openInitialDialog();
      
    default:
      console.log('[WARNING] Unknown command ID:', commandId);
      return createTextResponse(`Unknown command ID: ${commandId}`);
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
      return createTextResponse(`Unknown function: ${functionName}`);
  }
}

/**
 * Opens the initial dialog
 */
function openInitialDialog() {
  console.log('[DEBUG] openInitialDialog called');
  
  const response = {
    renderActions: {
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
                    },
                    color: {
                      red: 0.25,
                      green: 0.52,
                      blue: 0.96
                    }
                  }]
                }
              }])
            }]
          }
        }]
      }
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
  console.log('[DEBUG] Form inputs:', JSON.stringify(event.commonEventObject?.formInputs, null, 2));
  
  const name = getFormValue(event, "contactName") || "";
  const birthdate = getFormValue(event, "contactBirthdate") || "";
  const type = getFormValue(event, "contactType") || "";
  
  console.log('[DEBUG] Extracted values:');
  console.log('  Name:', name);
  console.log('  Birthdate:', birthdate);
  console.log('  Type:', type);
  
  if (!name) {
    return {
      renderActions: {
        action: {
          notification: {
            text: "Please enter a contact name"
          }
        }
      }
    };
  }
  
  const confirmationCard = {
    renderActions: {
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
                    text: name,
                    startIcon: {
                      iconUrl: "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/person/default/48px.svg"
                    }
                  }
                },
                {
                  decoratedText: {
                    topLabel: "Birthday",
                    text: convertMillisToDateString(birthdate),
                    startIcon: {
                      iconUrl: "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/cake/default/48px.svg"
                    }
                  }
                },
                {
                  decoratedText: {
                    topLabel: "Contact Type",
                    text: type || "Not specified",
                    startIcon: {
                      iconUrl: "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/category/default/48px.svg"
                    }
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
                        },
                        color: {
                          red: 0.13,
                          green: 0.66,
                          blue: 0.32
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
  console.log('[DEBUG] Parameters:', JSON.stringify(event.commonEventObject?.parameters, null, 2));
  
  const contactName = getParameterValue(event, "contactName");
  const contactBirthdate = getParameterValue(event, "contactBirthdate");
  const contactType = getParameterValue(event, "contactType");
  
  console.log('[DEBUG] Contact details:');
  console.log('  Name:', contactName);
  console.log('  Birthdate:', contactBirthdate);
  console.log('  Type:', contactType);
  
  if (!contactName) {
    console.log('[DEBUG] No contact name, returning error');
    return {
      renderActions: {
        action: {
          notification: {
            text: "❌ Don't forget to name your new contact!"
          }
        }
      }
    };
  }
  
  console.log('[DEBUG] Form submitted successfully');
  const confirmationMessage = `✅ ${contactName} has been added to your contacts!`;
  
  return {
    renderActions: {
      action: {
        navigations: [{
          popToRoot: true
        }],
        notification: {
          text: confirmationMessage
        }
      }
    },
    cardsV2: [{
      cardId: "successCard",
      card: {
        header: {
          title: "Contact Added Successfully",
          imageUrl: "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/check_circle/default/48px.svg",
          imageType: "CIRCLE"
        },
        sections: [{
          widgets: [
            {
              decoratedText: {
                topLabel: "Name",
                text: contactName,
                startIcon: {
                  iconUrl: "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/person/default/48px.svg"
                }
              }
            },
            {
              decoratedText: {
                topLabel: "Birthday",
                text: convertMillisToDateString(contactBirthdate),
                startIcon: {
                  iconUrl: "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/cake/default/48px.svg"
                }
              }
            },
            {
              decoratedText: {
                topLabel: "Type",
                text: contactType || "Not specified",
                startIcon: {
                  iconUrl: "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/category/default/48px.svg"
                }
              }
            },
            {
              buttonList: {
                buttons: [{
                  text: "Add Another Contact",
                  onClick: {
                    action: {
                      function: "openInitialDialog"
                    }
                  }
                }]
              }
            }
          ]
        }]
      }
    }]
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
    console.log(`[DEBUG] Found form input:`, JSON.stringify(formInput, null, 2));
    
    // String inputs
    if (formInput.stringInputs?.value?.[0]) {
      return formInput.stringInputs.value[0];
    }
    
    // Date inputs  
    if (formInput.dateInput?.msSinceEpoch) {
      return formInput.dateInput.msSinceEpoch;
    }
    
    // Selection inputs
    if (formInput.stringInputs?.value?.[0]) {
      return formInput.stringInputs.value[0];
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
    cardsV2: [{
      cardId: "defaultCard",
      card: {
        header: {
          title: "Contact Manager",
          subtitle: "Add and manage your contacts"
        },
        sections: [{
          widgets: [
            {
              textParagraph: {
                text: "To add a contact, try <b>/addContact</b> or click the button below:"
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
                  },
                  color: {
                    red: 0.25,
                    green: 0.52,
                    blue: 0.96
                  }
                }]
              }
            }
          ]
        }]
      }
    }]
  };
}

/**
 * Create a simple text response
 */
function createTextResponse(text) {
  return {
    cardsV2: [{
      cardId: "textCard",
      card: {
        sections: [{
          widgets: [{
            textParagraph: {
              text: text
            }
          }]
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
  
  return createTextResponse("Unknown event type");
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
  res.send('Google Chat App is running! (v2)');
});

app.listen(PORT, () => {
  console.log('====================================');
  console.log(`[INFO] Server is running on port ${PORT}`);
  console.log(`[INFO] Timestamp: ${new Date().toISOString()}`);
  console.log('[INFO] Using Google Workspace Add-ons format');
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