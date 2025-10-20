/**
 * ===================== HANDLER UTAMA =====================
 */
function handleChatEvent(event) {
  switch (event.chat.appCommandPayload.appCommandMetadata.appCommandId) {
    case 1: 
      return help();
    case 2:    
      return openTicketForm();
    default:
      return help();
  }
}

/**
 * ===================== FORM TICKET =====================
 */
function openTicketForm() {
  return {
    header: { title: "🧾 Open Engineer Ticket" },
    sections: [{
      widgets: [
        {
          textInput: {
            name: "title",
            label: "Title",
            type: "SINGLE_LINE"
          }
        },
        {
          textInput: {
            name: "issueDescription",
            label: "Issue Description",
            type: "MULTIPLE_LINE"
          }
        },
        {
          selectionInput: {
            name: "priority",
            label: "Priority",
            type: "RADIO_BUTTON",
            items: [
              { text: "Minor", value: "Minor", selected: true },
              { text: "Major", value: "Major" },
              { text: "Critical", value: "Critical" }
            ]
          }
        },
        {
          buttonList: {
            buttons: [{
              text: "Submit Ticket",
              onClick: {
                action: { function: "submitTicket()" }
              }
            }]
          }
        }
      ]
    }]
  };
}

/**
 * ===================== SUBMIT TICKET =====================
 */
function submitTicket(event) {
  const inputs = event.commonEventObject?.formInputs || {};
  const title = inputs.title?.stringInputs?.value?.[0] || "";
  const desc = inputs.issueDescription?.stringInputs?.value?.[0] || "";
  const priority = inputs.priority?.stringInputs?.value?.[0] || "";

  if (!title || !desc || !priority) {
    return {
      action: { notification: { text: "❌ Please fill all required fields." } }
    };
  }

  const message = [
    "✅ <b>Ticket Submitted</b>",
    `📌 <b>Title:</b> ${title}`,
    `📝 <b>Description:</b> ${desc}`,
    `⚙️ <b>Priority:</b> ${priority}`
  ].join("<br>");

  return {
    header: { title: "🎟️ Ticket Summary" },
    sections: [{
      widgets: [{
        textParagraph: { text: message }
      }]
    }]
  };
}

/**
 * ===================== HELP CARD =====================
 */
function help() {
  return {
    cardsV2: [
      {
        card: {
          header: addOnCardHeader(),
          sections: [
            {
              widgets: [
                {
                  decoratedText: {
                    text: "👋 Hi! Here are the available commands:",
                    wrapText: true,
                  },
                },
                {
                  decoratedText: {
                    text: "<b>💬 /help</b>: Show this help message.",
                    wrapText: true,
                  },
                },
                {
                  decoratedText: {
                    text: "<b>💼 /open-ticket</b>: Open an engineer support ticket form.",
                    wrapText: true,
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

// ----------------------
// Card util functions
// ----------------------

function addOnCardHeader() {
  return {
      title: "Nusa Assistant",
      subtitle: "Nusa Ticketing Support Assistant",
      imageUrl: "https://www.nusa.net.id/kb/favicon.png",
    };
}

module.exports = { handleChatEvent };
