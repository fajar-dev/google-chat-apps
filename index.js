/**
 * Google Chat App — Contact Form Example (Fixed)
 * Based on official Google sample.
 */

const express = require('express');
const PORT = process.env.PORT || 8080;

const app = express()
  .use(express.urlencoded({ extended: false }))
  .use(express.json());

// === MAIN HANDLER ===
app.post('/', async (req, res) => {
  console.log("=== EVENT MASUK ===");
  console.log(JSON.stringify(req.body, null, 2));

  const event = req.body;
  let body = { text: "Unhandled event" };

  try {
    // === AUTO-DETECT STRUCTURE ===
    let normalized = {};

    if (event.message) {
      // Struktur lama (Google Chat classic)
      normalized = event;
    } else if (event.chat?.appCommandPayload) {
      // Struktur baru (Google Chat API v2+)
      const payload = event.chat.appCommandPayload;
      normalized = {
        type: 'MESSAGE',
        message: payload.message,
        user: event.chat.user,
        space: payload.space,
        isDialogEvent: payload.isDialogEvent,
        dialogEventType: payload.dialogEventType,
      };
    } else {
      console.warn("⚠️ Tidak dikenali event formatnya");
    }

    // === PANGGIL HANDLER ===
    if (normalized.type === 'MESSAGE') {
      body = onMessage(normalized);
    } else if (normalized.type === 'CARD_CLICKED') {
      body = onCardClick(normalized);
    } else {
      body = { text: "Unhandled event" };
    }

    console.log("=== RESPON ===");
    console.log(JSON.stringify(body, null, 2));

    res.status(200).json(body);
  } catch (err) {
    console.error("=== ERROR SERVER ===");
    console.error(err);
    res.status(200).json({ text: "Server error occurred on backend." });
  }
});

// === HANDLE MESSAGE ===
function onMessage(event) {
  if (event.message.slashCommand) {
    switch (event.message.slashCommand.commandId) {
      case 1:
        // /about command
        return {
          text:
            "Manage your personal and business contacts 📇. To add a " +
            "contact, use the slash command `/addContact`.",
          accessoryWidgets: [
            {
              buttonList: {
                buttons: [
                  {
                    text: "Add Contact",
                    onClick: {
                      action: {
                        function: "openInitialDialog",
                        interaction: "OPEN_DIALOG",
                      },
                    },
                  },
                ],
              },
            },
          ],
        };

      case 2:
        // /addContact command
        return openInitialDialog();
    }
  }

  // Default response
  return {
    privateMessageViewer: event.user,
    text: "To add a contact, try `/addContact` or complete the form below:",
    cardsV2: [
      {
        cardId: "addContactForm",
        card: {
          header: { title: "Add a contact" },
          sections: [
            {
              widgets: CONTACT_FORM_WIDGETS.concat([
                {
                  buttonList: {
                    buttons: [
                      {
                        text: "Review and submit",
                        onClick: { action: { function: "openConfirmation" } },
                      },
                    ],
                  },
                },
              ]),
            },
          ],
        },
      },
    ],
  };
}

// === HANDLE CARD CLICK ===
function onCardClick(event) {
  const invoked = event.common?.invokedFunction;

  switch (invoked) {
    case "openInitialDialog":
      return openInitialDialog();
    case "openConfirmation":
      return openConfirmation(event);
    case "submitForm":
      return submitForm(event);
    default:
      return { text: "Unknown action" };
  }
}

// === DIALOG: INITIAL FORM ===
function openInitialDialog() {
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
                          text: "Review and submit",
                          onClick: {
                            action: { function: "openConfirmation" },
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

// === DIALOG: CONFIRMATION ===
function openConfirmation(event) {
  const name = fetchFormValue(event, "contactName") ?? "";
  const birthdate = fetchFormValue(event, "contactBirthdate") ?? "";
  const type = fetchFormValue(event, "contactType") ?? "";

  const cardConfirmation = {
    header: "Your contact",
    widgets: [
      { textParagraph: { text: "Confirm contact information and submit:" } },
      { textParagraph: { text: `<b>Name:</b> ${name}` } },
      {
        textParagraph: {
          text: `<b>Birthday:</b> ${convertMillisToDateString(birthdate)}`,
        },
      },
      { textParagraph: { text: `<b>Type:</b> ${type}` } },
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
                    { key: "contactBirthdate", value: birthdate },
                    { key: "contactType", value: type },
                  ],
                },
              },
            },
          ],
        },
      },
    ],
  };

  if (event.isDialogEvent) {
    return {
      actionResponse: {
        type: "DIALOG",
        dialogAction: { dialog: { body: { sections: [cardConfirmation] } } },
      },
    };
  }

  return {
    actionResponse: { type: "UPDATE_MESSAGE" },
    privateMessageViewer: event.user,
    cardsV2: [{ card: { sections: [cardConfirmation] } }],
  };
}

// === SUBMIT FORM ===
function submitForm(event) {
  const contactName = event.common.parameters["contactName"];
  const errorMessage = "Don't forget to name your new contact!";

  if (!contactName && event.dialogEventType === "SUBMIT_DIALOG") {
    return {
      actionResponse: {
        type: "DIALOG",
        dialogAction: {
          actionStatus: {
            statusCode: "INVALID_ARGUMENT",
            userFacingMessage: errorMessage,
          },
        },
      },
    };
  }

  if (!contactName) {
    return {
      privateMessageViewer: event.user,
      text: errorMessage,
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
            userFacingMessage: `Success ${contactName}`,
          },
        },
      },
    };
  }

  return {
    actionResponse: { type: "NEW_MESSAGE" },
    privateMessageViewer: event.user,
    text: confirmationMessage,
  };
}

// === HELPER ===
function fetchFormValue(event, widgetName) {
  const formItem = event.common?.formInputs?.[widgetName];
  if (!formItem) return null;

  if (formItem.stringInputs) {
    return formItem.stringInputs.value?.[0] ?? null;
  } else if (formItem.dateInput) {
    return formItem.dateInput.msSinceEpoch ?? null;
  }
  return null;
}

function convertMillisToDateString(millis) {
  if (!millis) return "-";
  const date = new Date(Number(millis));
  const options = { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

// === CARD INPUT WIDGETS ===
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
        { text: "Work", value: "Work", selected: false },
        { text: "Personal", value: "Personal", selected: false },
      ],
    },
  },
];

// === START SERVER ===
app.listen(PORT, () => {
  console.log(`🚀 Google Chat bot server running on port ${PORT}`);
});
