/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * http://www.apache.org/licenses/LICENSE-2.0
 */

const express = require("express");
const PORT = process.env.PORT || 8080;

const app = express()
  .use(express.urlencoded({ extended: false }))
  .use(express.json());

// === Middleware Logging Sederhana ===
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// === Entry point utama ===
app.post("/", async (req, res) => {
  const event = req.body;

  try {
    if (!event?.type) {
      return res.status(400).json({ text: "Invalid Chat event format" });
    }

    const response = handleChatAPIEvent(event);
    return res.json(response);
  } catch (error) {
    console.error("[ERROR]", error);
    return res.status(500).json({ text: `Error: ${error.message}` });
  }
});

/* ===================== HANDLER: Chat API ===================== */
function handleChatAPIEvent(event) {
  switch (event.type) {
    case "MESSAGE": {
      const commandId = event.message?.slashCommand?.commandId;
      return commandId
        ? handleSlashCommandChatAPI(commandId, event)
        : getDefaultResponseChatAPI();
    }

    case "CARD_CLICKED": {
      const fn = event.common?.invokedFunction || event.action?.actionMethodName;
      return handleCardClickChatAPI(fn, event);
    }

    default:
      return { text: "Unknown event type" };
  }
}

/* ===================== SLASH COMMANDS ===================== */
function handleSlashCommandChatAPI(commandId) {
  switch (commandId) {
    case 1:
      return {
        text: "📇 Manage your contacts. Use `/addContact` to add one.",
        cardsV2: [
          {
            cardId: "contactManagerCard",
            card: {
              header: { title: "Contact Manager" },
              sections: [
                {
                  widgets: [
                    {
                      textParagraph: {
                        text: "<b>Welcome to Contact Manager!</b><br>Manage your contacts easily.",
                      },
                    },
                    {
                      buttonList: {
                        buttons: [
                          {
                            text: "Add Contact",
                            onClick: {
                              action: {
                                actionMethodName: "openInitialDialog",
                                interaction: "OPEN_DIALOG",
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      };

    case 2:
      return openInitialDialogChatAPI();

    default:
      return { text: `Unknown command ID: ${commandId}` };
  }
}

/* ===================== CARD CLICK HANDLER ===================== */
function handleCardClickChatAPI(fn, event) {
  switch (fn) {
    case "openInitialDialog":
      return openInitialDialogChatAPI();
    case "openConfirmation":
      return openConfirmationChatAPI(event);
    case "submitForm":
      return submitFormChatAPI(event);
    case "closeCard":
      return {
        actionResponse: { type: "UPDATE_MESSAGE" },
        text: "Card closed.",
      };
    default:
      return { text: `Unknown function: ${fn}` };
  }
}

/* ===================== FORM & CONFIRMATION ===================== */
function openInitialDialogChatAPI() {
  return {
    actionResponse: {
      type: "DIALOG",
      dialogAction: {
        dialog: {
          body: {
            sections: [
              {
                header: "Add new contact",
                widgets: CONTACT_FORM_WIDGETS.concat([
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: "Review and Submit",
                          onClick: {
                            action: {
                              actionMethodName: "openConfirmation",
                            },
                          },
                        },
                      ],
                    },
                  },
                ]),
              },
            ],
          },
        },
      },
    },
  };
}

function openConfirmationChatAPI(event) {
  const name = getFormValue(event, "contactName");
  const birthdate = getFormValue(event, "contactBirthdate");
  const type = getFormValue(event, "contactType");

  if (!name) {
    return { text: "❌ Please enter a contact name." };
  }

  return {
    actionResponse: { type: "UPDATE_MESSAGE" },
    text: `✅ Confirm contact:\n- Name: ${name}\n- Birthday: ${birthdate}\n- Type: ${type}`,
  };
}

function submitFormChatAPI(event) {
  const name = getFormValue(event, "contactName");
  if (!name) return { text: "❌ Please enter a contact name." };

  const message = `✅ ${name} has been added to your contacts!`;

  return {
    text: message,
    cardsV2: [
      {
        card: {
          header: { title: "Success!" },
          sections: [{ widgets: [{ textParagraph: { text: message } }] }],
        },
      },
    ],
  };
}

/* ===================== UTILITIES ===================== */
function getFormValue(event, field) {
  const formInputs = event.common?.formInputs || event.action?.formInputs;
  const input = formInputs?.[field];
  if (!input) return "";
  return (
    input.stringInputs?.value?.[0] ||
    input.dateInput?.msSinceEpoch ||
    input.selectionInput?.value?.[0] ||
    ""
  );
}

/* ===================== DEFAULT RESPONSE ===================== */
function getDefaultResponseChatAPI() {
  return {
    text: "To add a contact, try `/addContact`",
    cardsV2: [
      {
        cardId: "defaultCard",
        card: {
          header: { title: "Contact Manager" },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: "Use <b>/addContact</b> or click below:",
                  },
                },
                {
                  buttonList: {
                    buttons: [
                      {
                        text: "Add Contact",
                        onClick: {
                          action: {
                            actionMethodName: "openInitialDialog",
                            interaction: "OPEN_DIALOG",
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

/* ===================== SERVER ===================== */
app.get("/", (_, res) =>
  res.send("Google Chat API Bot is running! (v5-clean)")
);
app.listen(PORT, () =>
  console.log(`[INFO] Google Chat Bot running on port ${PORT}`)
);

/* ===================== FORM WIDGETS ===================== */
const CONTACT_FORM_WIDGETS = [
  {
    textInput: {
      name: "contactName",
      label: "First and last name",
      type: "SINGLE_LINE",
    },
  },
  {
    dateTimePicker: {
      name: "contactBirthdate",
      label: "Birthdate",
      type: "DATE_ONLY",
    },
  },
  {
    selectionInput: {
      name: "contactType",
      label: "Contact type",
      type: "RADIO_BUTTON",
      items: [
        { text: "Work", value: "Work" },
        { text: "Personal", value: "Personal" },
      ],
    },
  },
];
