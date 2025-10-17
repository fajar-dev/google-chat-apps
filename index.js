/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * http://www.apache.org/licenses/LICENSE-2.0
 */

const express = require('express');
const { handleChatEvent } = require('./common');

const PORT = process.env.PORT || 8080;
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// === Logging ===
app.use((req, _, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// === Endpoint utama ===
app.post('/', (req, res) => {
  const event = req.body;
  if (!event?.chat) return res.json({ text: 'Invalid event structure.' });

  const response = handleChatEvent(event);
  res.json(response);
});

// === Health check ===
app.get('/', (_, res) => res.send('🚀 Google Chat Ticket Bot is running!'));

app.listen(PORT, () => console.log(`[INFO] Server listening on port ${PORT}`));
