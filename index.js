const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 8080; // Pilih port yang sesuai

// Middleware untuk memproses body permintaan dalam format JSON
app.use(bodyParser.json());

// Endpoint untuk menerima event dari Google Chat
app.post('/webhook', (req, res) => {
    const event = req.body;
    console.log('Event dari Google Chat diterima:', event);

    let replyMessage = {
        // Objek balasan akan selalu berupa pesan.
        // Teks atau kartu, tergantung kebutuhan.
    };

    // --- LOGIKA RESPON BOT ---

    // Memeriksa jenis event
    if (event.type === 'MESSAGE') {
        const messageText = event.message.text ? event.message.text.trim().toLowerCase() : '';

        // Bot hanya akan merespons jika pesan menyebut (mention) bot, 
        // atau jika itu adalah pesan langsung di ruang 1-ke-1.

        // Logika untuk /about
        if (messageText.includes('/about')) {
            replyMessage.text = "halo saya siap membantu anda";
        } else {
            // Balasan default jika pesan tidak dikenali
            replyMessage.text = "Saya adalah bot Google Chat. Coba ketik `/about` untuk info.";
        }
    } else if (event.type === 'ADDED_TO_SPACE') {
        // Respon saat bot ditambahkan ke ruang
        replyMessage.text = `Terima kasih telah menambahkan saya, ${event.user.displayName}! Saya siap membantu. Coba ketik @NamaBot /about.`;
    } else {
        // Respon default untuk event lain (misalnya REMOVED_FROM_SPACE, dll.)
        return res.status(200).send({});
    }

    // Mengirim balasan ke Google Chat
    res.status(200).json(replyMessage);
});

// Server mulai mendengarkan
app.listen(port, () => {
    console.log(`Google Chat Bot berjalan di http://localhost:${port}/webhook`);
});