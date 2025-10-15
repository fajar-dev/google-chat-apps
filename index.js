import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 8080;

// === MAIN ENDPOINT ===
app.post("/", async (req, res) => {
  const event = req.body;
  console.log("=== EVENT MASUK ===");
  console.log(JSON.stringify(event, null, 2));

  let body = {};

  // === DETEKSI STRUKTUR EVENT BARU (Google Chat API 2025) ===
  if (event.chat?.appCommandPayload) {
    const payload = event.chat.appCommandPayload;
    const messageText = payload.message?.text?.trim() || "";

    if (messageText === "/addContact") {
      body = onAddContactDialog();
    } else if (payload.dialogEventType === "SUBMIT_DIALOG") {
      body = onDialogSubmit(payload);
    } else {
      body = { text: "Perintah tidak dikenal." };
    }

  // === BACKWARD COMPAT (format lama) ===
  } else if (event.type === "MESSAGE") {
    const text = event.message?.text?.trim() || "";
    if (text === "/addContact") {
      body = onAddContactDialog();
    } else {
      body = { text: "Unknown command." };
    }

  } else {
    body = { text: "Unhandled event structure." };
  }

  console.log("=== RESPON ===");
  console.log(JSON.stringify(body, null, 2));

  res.json(body);
});

// === HANDLER: Menampilkan dialog form ===
function onAddContactDialog() {
  return {
    actionResponse: {
      type: "DIALOG",
      dialogAction: {
        dialog: {
          header: {
            title: "Add new contact",
          },
          body: {
            sections: [
              {
                widgets: [
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
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: "Review and submit",
                          onClick: {
                            action: {
                              function: "openConfirmation",
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
      },
    },
  };
}

// === HANDLER: Ketika user submit dialog ===
function onDialogSubmit(payload) {
  const inputs = payload?.formInputs || {};
  const name = inputs?.contactName?.stringInputs?.value?.[0] || "(unknown)";
  const type = inputs?.contactType?.stringInputs?.value?.[0] || "(none)";
  const birthdate = inputs?.contactBirthdate?.dateInput || "(no date)";

  return {
    text: `✅ Contact submitted:\n\n👤 *${name}*\n📅 ${birthdate}\n🏷️ ${type}`,
  };
}

// === HEALTHCHECK ===
app.get("/", (_, res) => {
  res.send("✅ Google Chat Bot is running!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
