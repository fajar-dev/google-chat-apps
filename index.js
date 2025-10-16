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

// === MAIN ENDPOINT ===
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
    case 1: // /open-ticket
      return showHelpCard();
    case 2: // /help
      return openTicketForm();
    default:
      return { text: `Unknown command ID: ${commandId}` };
  }
}

function handleSlashCommandChatAPI(commandId) {
  switch (commandId) {
    case 1:
      return showHelpCard();
      case 2:
      return openTicketFormChatAPI();
    default:
      return { text: `Unknown command ID: ${commandId}` };
  }
}

/* ===================== CARD CLICK HANDLERS ===================== */
function handleCardClick(fn, event) {
  switch (fn) {
    case "submitTicket":
      return submitTicket(event);
    default:
      return { text: `Unknown function: ${fn}` };
  }
}

function handleCardClickChatAPI(fn, event) {
  switch (fn) {
    case "submitTicket":
      return submitTicket(event);
    default:
      return { text: `Unknown function: ${fn}` };
  }
}

/* ===================== FORM TIKET ===================== */
function openTicketForm() {
  return {
    action: {
      navigations: [{
        pushCard: {
          header: { title: "🧾 Open Engineer Ticket" },
          sections: [{
            widgets: TICKET_FORM_WIDGETS.concat([{
              buttonList: {
                buttons: [{ text: "Submit Ticket", onClick: { action: { function: "submitTicket" } } }]
              }
            }])
          }]
        }
      }]
    }
  };
}

function openTicketFormChatAPI() {
  return {
    actionResponse: {
      type: "DIALOG",
      dialogAction: {
        dialog: {
          body: {
            sections: [{
              header: "Open Engineer Ticket",
              widgets: TICKET_FORM_WIDGETS.concat([{
                buttonList: {
                  buttons: [{ text: "Submit Ticket", onClick: { action: { function: "submitTicket" } } }]
                }
              }])
            }]
          }
        }
      }
    }
  };
}

function submitTicket(event) {
  const name = getFormValue(event, "reporterName");
  const department = getFormValue(event, "department");
  const desc = getFormValue(event, "issueDescription");
  const priority = getFormValue(event, "priority");

  if (!name || !desc) {
    return { action: { notification: { text: "❌ Please fill all required fields." } } };
  }

  const message = `✅ Ticket submitted by ${name}\n📍 Department: ${department}\n⚙️ Priority: ${priority}\n📝 Issue: ${desc}`;

  return {
    text: message,
    cardsV2: [{
      card: {
        header: { title: "Ticket Submitted Successfully!" },
        sections: [{
          widgets: [{ textParagraph: { text: message.replace(/\n/g, "<br>") } }]
        }]
      }
    }]
  };
}

/* ===================== HELP CARD ===================== */
function showHelpCard() {
  return {
    header: [{
      title: "Nusa Assistant",
      subtitle: "Nusa Ticketing Support Assistant",
      imageUrl: "https://www.nusa.net.id/kb/favicon.png",
    }],
    sections: [{
      widgets: [{
        decoratedText: { 
          text: "Hi! 👋 Feel free to use the following " + featureName + "s:",
          wrapText: true
        }
      }, {
        decoratedText: { 
          text: "<b>💬 /greeting</b>: Say Hello.", 
          wrapText: true 
        }
      }, {
        decoratedText: { 
          text: "<b>🩸 /blood-stock</b>: Show current blood stock at UDD PMI Kota Medan.", 
          wrapText: true 
        }
      }, {
        decoratedText: { 
          text: "<b>🚐 /mobile-unit</b>: Show today’s mobile unit schedule at UDD PMI Kota Medan.", 
          wrapText: true 
        }
      }]
    }]
  };
}

/* ===================== UTILITIES ===================== */
function getFormValue(event, widgetName) {
  const input = event.commonEventObject?.formInputs?.[widgetName];
  if (!input) return null;
  return input.stringInputs?.value?.[0] || input.dateInput?.msSinceEpoch || null;
}

/* ===================== DEFAULT RESPONSE ===================== */
function getDefaultResponse() {
  return showHelpCard();
}

function getDefaultResponseChatAPI() {
  return showHelpCard();
}

/* ===================== SERVER ===================== */
app.get('/', (_, res) => res.send('Google Chat Ticket Bot is running! 🚀'));
app.listen(PORT, () => console.log(`[INFO] Server running on port ${PORT}`));

/* ===================== FORM WIDGETS ===================== */
const TICKET_FORM_WIDGETS = [
  { textInput: { name: "reporterName", label: "Your Name", type: "SINGLE_LINE" } },
  { textInput: { name: "department", label: "Department", type: "SINGLE_LINE" } },
  { textInput: { name: "issueDescription", label: "Issue Description", type: "MULTIPLE_LINE" } },
  {
    selectionInput: {
      name: "priority",
      label: "Priority",
      type: "RADIO_BUTTON",
      items: [
        { text: "Low", value: "Low" },
        { text: "Medium", value: "Medium" },
        { text: "High", value: "High" }
      ]
    }
  }
];
