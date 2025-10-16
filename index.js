const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 8080; // Pastikan port ini sama dengan yang digunakan oleh server Anda

// --- Middleware ---
// Gunakan body-parser untuk memproses body permintaan dalam format JSON
app.use(bodyParser.json());

// --- Logika Webhook ---
app.post('/webhook', (req, res) => {
    // Objek event lengkap dari Google Chat
    const event = req.body;
    
    // Inisialisasi objek balasan
    let replyMessage = {}; 

    // Ambil properti utama dengan aman
    const eventType = event.type;
    const userDisplayName = (event.user && event.user.displayName) || 'Pengguna';
    
    // Coba ambil pesan dan teks. Jika tidak ada, anggap kosong.
    const message = event.message || {};
    // Pengecekan aman untuk teks, dan konversi ke huruf kecil untuk perbandingan
    const messageText = (message.text || '').trim().toLowerCase(); 

    // --- LOG UNTUK DEBUGGING ---
    console.log('--- Event Baru Diterima ---');
    console.log('Event Type:', eventType);
    console.log('Pesan Diterima:', messageText);
    console.log('Event Body Lengkap (Hanya untuk Debugging Awal):', JSON.stringify(event, null, 2));
    
    // --- LOGIKA RESPON BOT ---

    if (eventType === 'MESSAGE') {
        
        // 1. Logika untuk /about
        if (messageText.includes('/about')) {
            replyMessage.text = "halo saya siap membantu anda";
        
        // 2. Logika untuk /hist (jika Anda ingin menambahkannya)
        } else if (messageText.includes('/hist')) {
            replyMessage.text = "Saya akan mencari histori untuk Anda, tapi saat ini saya adalah bot.";

        // 3. Logika untuk balasan default (Jika pesan tidak dikenali)
        } else {
            replyMessage.text = "saya adalah bot"; 
        }
        
    } else if (eventType === 'ADDED_TO_SPACE') {
        // Respon saat bot ditambahkan ke ruang
        replyMessage.text = `Halo ${userDisplayName}! Saya telah ditambahkan. Silakan ketik /about atau pesan apa pun.`;
        
    } 
    // Untuk event lain seperti REMOVED_FROM_SPACE, replyMessage tetap kosong.

    // --- Mengirim Balasan ---
    if (Object.keys(replyMessage).length > 0) {
        // Jika ada pesan balasan, kirim JSON balasan
        console.log('Mengirim Balasan:', replyMessage.text);
        res.status(200).json(replyMessage);
    } else {
        // Jika tidak ada balasan (untuk event yang tidak perlu direspons), kirim status 200 OK
        console.log('Tidak ada balasan yang dikirim (200 OK).');
        res.status(200).send({});
    }
});

// --- Server Startup ---
app.listen(port, () => {
    console.log(`Google Chat Bot berjalan di http://localhost:${port}/webhook`);
    console.log('Pastikan server ini terekspos ke publik (misalnya dengan ngrok) di URL yang sama dengan konfigurasi Google Chat App Anda.');
});