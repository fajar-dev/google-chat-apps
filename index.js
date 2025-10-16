const express = require('express');
const bodyParser = require('body-parser');
const app = express();
// Gunakan port yang Anda pakai (misalnya 8080)
const port = 8080; 

// Middleware untuk memproses body permintaan dalam format JSON
app.use(bodyParser.json());

// Endpoint untuk menerima event dari Google Chat
app.post('/webhook', (req, res) => {
    const event = req.body;
    console.log('Event dari Google Chat diterima:', event);

    let replyMessage = {}; // Objek balasan default

    // Ambil type event dan teks pesan dengan aman
    const eventType = event.type;
    const message = event.message || {};
    const messageText = (message.text || '').trim().toLowerCase(); 

    console.log('Event Type:', eventType);
    console.log('Pesan Diterima:', messageText);
    
    // --- LOGIKA RESPON BOT ---

    // 1. Jika event bertipe PESAN
    if (eventType === 'MESSAGE') {
        
        // Logika untuk /about (Prioritas pertama)
        if (messageText.includes('/about')) {
            replyMessage.text = "halo saya siap membantu anda";
        
        // Logika untuk balasan default (Jika bukan /about)
        } else {
            // Ini adalah balasan yang Anda minta untuk semua pesan lain
            replyMessage.text = "saya adalah bot"; 
        }
        
    // 2. Jika event bertipe DITAMBAHKAN KE RUANG
    } else if (eventType === 'ADDED_TO_SPACE') {
        // Respon saat bot ditambahkan ke ruang
        replyMessage.text = `Halo ${event.user.displayName}! Saya telah ditambahkan.`;
    }
    // Untuk event lain (misalnya REMOVED_FROM_SPACE), replyMessage akan tetap kosong {}

    // Mengirim balasan ke Google Chat
    if (Object.keys(replyMessage).length > 0) {
        // Jika ada pesan balasan, kirim JSON balasan
        res.status(200).json(replyMessage);
    } else {
        // Jika tidak ada balasan, kirim status 200 OK dengan body kosong
        res.status(200).send({});
    }
});

// Server mulai mendengarkan
app.listen(port, () => {
    console.log(`Google Chat Bot berjalan di http://localhost:${port}/webhook`);
});