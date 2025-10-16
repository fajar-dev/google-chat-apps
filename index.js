const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 8080; 

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
    const event = req.body;
    let replyMessage = {}; 

    // --- PENGAMBILAN DATA AMAN DARI EVENT ---

    // 1. Coba ambil eventType dari root. Jika tidak ada, anggap "UNKNOWN" atau ambil dari tempat lain jika ada.
    const eventType = event.type || (event.messagePayload ? 'MESSAGE_ALT' : 'UNKNOWN'); 
    
    // 2. Coba ambil data pesan dari lokasi yang berbeda (root.message atau chat.messagePayload.message)
    const messagePayload = event.message || event.chat?.messagePayload?.message || {};
    
    // 3. Ambil teks pesan. Log Anda menunjukkan event.chat.messagePayload.message.text
    const messageText = (messagePayload.text || '').trim().toLowerCase(); 
    
    const userDisplayName = (event.user && event.user.displayName) || 'Pengguna';

    // --- LOG UNTUK DEBUGGING ---
    console.log('--- Event Baru Diterima ---');
    console.log('Event Type Ditebak:', eventType);
    console.log('Pesan Diterima:', messageText);
    console.log('Event Body Lengkap (Hanya untuk Debugging Awal):', JSON.stringify(event, null, 2));
    
    // --- LOGIKA RESPON BOT ---

    // Gunakan eventType yang ditemukan (termasuk 'MESSAGE_ALT')
    if (eventType === 'MESSAGE' || eventType === 'MESSAGE_ALT') {
        
        // Logika untuk /about
        if (messageText.includes('/about')) {
            replyMessage.text = "halo saya siap membantu anda";
        
        // Logika untuk /hist
        } else if (messageText.includes('/hist')) {
            replyMessage.text = "Ini adalah balasan untuk hist"; 

        // Logika untuk balasan default 
        } else {
            replyMessage.text = "saya adalah bot"; 
        }
        
    } else if (eventType === 'ADDED_TO_SPACE') {
        replyMessage.text = `Halo ${userDisplayName}! Saya telah ditambahkan.`;
        
    } 

    // --- Mengirim Balasan ---
    if (Object.keys(replyMessage).length > 0) {
        console.log('Mengirim Balasan:', replyMessage.text);
        res.status(200).json(replyMessage);
    } else {
        console.log('Tidak ada balasan yang dikirim (200 OK).');
        res.status(200).send({});
    }
});

app.listen(port, () => {
    console.log(`Google Chat Bot berjalan di http://localhost:${port}/webhook`);
});