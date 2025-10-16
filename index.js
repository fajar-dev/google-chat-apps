/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * http://www.apache.org/licenses/LICENSE-2.0
 */

const express = require('express');
const PORT = process.env.PORT || 8080;

const app = express()
  .use(express.urlencoded({ extended: false }))
  .use(express.json());

// === Middleware Logging Sederhana ===
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.post('/', async (req, res) => {
  const event = req.body;

  try {
    let response = {};

    if (event.chat) {
      response = handleChatEvent(event);
    } else if (event.type) {
      response = handleChatAPIEvent(event);
    } else {
      response = { text: "Unknown event format" };
    }

    return res.json(response);
  } catch (error) {
    console.error('[ERROR]', error);
    return res.status(500).json({ text: `Error: ${error.message}` });
  }
});

/* ===================== HANDLER: Add-ons ===================== */
function handleChatEvent(event) {
  if (event.chat?.appCommandPayload?.message?.slashCommand) {
    const id = event.chat.appCommandPayload.message.slashCommand.commandId;
    return handleSlashCommand(id, event);
  }

  if (event.commonEventObject?.invokedFunction) {
    return handleCardClick(event.commonEventObject.invokedFunction, event);
  }

  return getDefaultResponse();
}

/* ===================== HANDLER: Chat API ===================== */
function handleChatAPIEvent(event) {
  if (event.type === 'MESSAGE') {
    const id = event.message?.slashCommand?.commandId;
    return id ? handleSlashCommandChatAPI(id, event) : getDefaultResponseChatAPI();
  }
  if (event.type === 'CARD_CLICKED' && event.common?.invokedFunction) {
    return handleCardClickChatAPI(event.common.invokedFunction, event);
  }

  return { text: "Unknown event type" };
}

/* ===================== SLASH COMMANDS ===================== */
function handleSlashCommand(commandId, event) {
  switch (commandId) {
    case 1:
      return {
        action: {
          navigations: [{
            pushCard: {
              header: { title: "📇 Contact Manager", subtitle: "Your Personal Contact Assistant" },
              sections: [{
                widgets: [
                  { textParagraph: { text: "<b>Welcome to Contact Manager!</b>" } },
                  { textParagraph: { text: "Easily manage your personal and business contacts." } },
                  {
                    buttonList: {
                      buttons: [
                        { text: "Add Contact", onClick: { action: { function: "openInitialDialog" } } },
                        { text: "Close", onClick: { action: { function: "closeCard" } } }
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
      return openInitialDialog();
    default:
      return { text: `Unknown command ID: ${commandId}` };
  }
}

function handleSlashCommandChatAPI(commandId) {
  switch (commandId) {
    case 1:
      return {
        text: "Manage your contacts 📇. Use `/addContact` to add one.",
        accessoryWidgets: [{
          buttonList: {
            buttons: [{
              text: "Add Contact",
              onClick: { action: { function: "openInitialDialog", interaction: "OPEN_DIALOG" } }
            }]
          }
        }]
      };
    case 2:
      return openInitialDialogChatAPI();
    default:
      return { text: `Unknown command ID: ${commandId}` };
  }
}

/* ===================== CARD CLICK HANDLERS ===================== */
function handleCardClick(fn, event) {
  switch (fn) {
    case "openInitialDialog": return openInitialDialog();
    case "openConfirmation": return openConfirmation(event);
    case "submitForm": return submitForm(event);
    case "closeCard": return { action: { navigations: [{ popToRoot: true }] } };
    default: return { text: `Unknown function: ${fn}` };
  }
}

function handleCardClickChatAPI(fn, event) {
  switch (fn) {
    case "openInitialDialog": return openInitialDialogChatAPI();
    case "openConfirmation": return openConfirmationChatAPI(event);
    case "submitForm": return submitFormChatAPI(event);
    case "closeCard":
      return {
        actionResponse: { type: "UPDATE_MESSAGE" },
        text: "Card closed."
      };
    default:
      return { text: `Unknown function: ${fn}` };
  }
}

/* ===================== FORM & CONFIRMATION ===================== */
function openInitialDialog() {
  return {
    action: {
      navigations: [{
        pushCard: {
          header: { title: "Add New Contact" },
          sections: [{
            widgets: CONTACT_FORM_WIDGETS.concat([{
              buttonList: {
                buttons: [{ text: "Review and Submit", onClick: { action: { function: "openConfirmation" } } }]
              }
            }])
          }]
        }
      }]
    }
  };
}

function openInitialDialogChatAPI() {
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
                  buttons: [{ text: "Review and Submit", onClick: { action: { function: "openConfirmation" } } }]
                }
              }])
            }]
          }
        }
      }
    }
  };
}

function openConfirmation(event) {
  const name = getFormValue(event, "contactName") || "";
  const birthdate = getFormValue(event, "contactBirthdate") || "";
  const type = getFormValue(event, "contactType") || "";

  if (!name) return { action: { notification: { text: "Please enter a contact name" } } };

  return {
    action: {
      navigations: [{
        pushCard: {
          header: { title: "Confirm Contact" },
          sections: [{
            widgets: [
              { textParagraph: { text: "<b>Confirm contact information:</b>" } },
              { decoratedText: { topLabel: "Name", text: name } },
              { decoratedText: { topLabel: "Birthday", text: convertMillisToDateString(birthdate) } },
              { decoratedText: { topLabel: "Type", text: type || "Not specified" } },
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
                    { text: "Back", onClick: { action: { function: "openInitialDialog" } } }
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

function submitForm(event) {
  const contactName = getParameterValue(event, "contactName");
  if (!contactName) {
    return { action: { notification: { text: "❌ Please enter a name." } } };
  }

  const message = `✅ ${contactName} has been added to your contacts!`;

  return {
    action: {
      navigations: [{ popToRoot: true }],
      notification: { text: message }
    },
    text: message,
    cardsV2: [{
      card: {
        header: { title: "Success!" },
        sections: [{ widgets: [{ textParagraph: { text: message } }] }]
      }
    }]
  };
}

/* ===================== UTILITIES ===================== */
function getFormValue(event, widgetName) {
  const input = event.commonEventObject?.formInputs?.[widgetName];
  if (!input) return null;
  return input.stringInputs?.value?.[0] || input.dateInput?.msSinceEpoch || null;
}

function getParameterValue(event, key) {
  return event.commonEventObject?.parameters?.find(p => p.key === key)?.value || null;
}

function convertMillisToDateString(millis) {
  if (!millis) return 'No date specified';
  try {
    return new Date(Number(millis)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'Invalid date';
  }
}

/* ===================== DEFAULT RESPONSES ===================== */
function getDefaultResponse() {
  return {
    text: "To add a contact, use /addContact command",
    cardsV2: [{
      card: {
        sections: [{
          widgets: [
            { textParagraph: { text: "Use <b>/addContact</b> or click below:" } },
            { buttonList: { buttons: [{ text: "Add Contact", onClick: { action: { function: "openInitialDialog" } } }] } }
          ]
        }]
      }
    }]
  };
}

function getDefaultResponseChatAPI() {
  return {
    text: "To add a contact, try `/addContact`",
    cardsV2: [{
      cardId: "defaultCard",
      card: {
        header: { title: "Contact Manager" },
        sections: [{
          widgets: [
            { textParagraph: { text: "Use <b>/addContact</b> or click below:" } },
            { buttonList: { buttons: [{ text: "Add Contact", onClick: { action: { function: "openInitialDialog" } } }] } }
          ]
        }]
      }
    }]
  };
}

/* ===================== SERVER ===================== */
app.get('/', (_, res) => res.send('Google Chat App is running! (v4-clean)'));
app.listen(PORT, () => console.log(`[INFO] Server running on port ${PORT}`));

/* ===================== FORM WIDGETS ===================== */
const CONTACT_FORM_WIDGETS = [
  { textInput: { name: "contactName", label: "First and last name", type: "SINGLE_LINE" } },
  { dateTimePicker: { name: "contactBirthdate", label: "Birthdate", type: "DATE_ONLY" } },
  {
    selectionInput: {
      name: "contactType",
      label: "Contact type",
      type: "RADIO_BUTTON",
      items: [
        { text: "Work", value: "Work" },
        { text: "Personal", value: "Personal" }
      ]
    }
  }
];
