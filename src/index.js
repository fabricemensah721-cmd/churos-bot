const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const Groq = require('groq-sdk');
const http = require('http');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const TARGET_CHANNEL_ID = '1542714940995928084';
const conversationHistory = [];
let discordClientReady = false;

// 1. DISCORD BOT CLIENT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`Discord Bot ist online als ${client.user.tag}!`);
  discordClientReady = true;
});

// 2. WEBSERVER MIT CONTROL DASHBOARD
const PORT = process.env.PORT || 3000;
http.createServer(async (req, res) => {

  // Endpunkt: Nachricht von der Webseite in den Discord-Kanal senden
  if (req.method === 'POST' && req.url === '/api/send-to-discord') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const textToSend = data.message || '';

        if (!discordClientReady) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'Bot is not ready yet' }));
        }

        const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
        if (channel) {
          await channel.send(textToSend);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Channel not found' }));
        }
      } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // HTML Dashboard ausliefern
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Churro Discord Controller 🕹️</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
        body { background-color: #121214; color: #e1e1e6; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .box { width: 100%; max-width: 500px; background: #18181b; padding: 20px; border-radius: 12px; border: 1px solid #27272a; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h2 { color: #a855f7; margin-bottom: 12px; }
        p { font-size: 0.9rem; color: #a1a1aa; margin-bottom: 16px; }
        textarea { width: 100%; height: 100px; background: #202024; border: 1px solid #3f3f46; border-radius: 6px; color: #fff; padding: 10px; outline: none; margin-bottom: 12px; resize: none; }
        textarea:focus { border-color: #a855f7; }
        button { width: 100%; background: #a855f7; color: #fff; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 1rem; }
        button:hover { background: #9333ea; }
        #status { margin-top: 12px; font-size: 0.85rem; text-align: center; }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>Churro Control Panel 🕹️</h2>
        <p>Tippe eine Nachricht ein. Der Bot sendet sie direkt in deinen Discord-Kanal!</p>
        <textarea id="msgInput" placeholder="Was soll Churro in Discord sagen?"></textarea>
        <button onclick="sendToDiscord()">Als Bot in Discord senden 🚀</button>
        <div id="status"></div>
      </div>
      <script>
        async function sendToDiscord() {
          const input = document.getElementById('msgInput');
          const status = document.getElementById('status');
          const text = input.value.trim();
          if(!text) return;

          status.style.color = '#a1a1aa';
          status.innerText = 'Sende an Discord...';

          try {
            const res = await fetch('/api/send-to-discord', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            if(data.success) {
              status.style.color = '#22c55e';
              status.innerText = '✅ Nachricht erfolgreich über den Bot gesendet!';
              input.value = '';
            } else {
              status.style.color = '#ef4444';
              status.innerText = '❌ Fehler: ' + data.error;
            }
          } catch(e) {
            status.style.color = '#ef4444';
            status.innerText = '❌ Verbindungsfehler';
          }
        }
      </script>
    </body>
    </html>
  `);
}).listen(PORT, () => {
  console.log(`Webserver & Control Panel läuft auf Port ${PORT}`);
});

// 3. NORMALE DISCORD BOT LOGIK (Antwortet weiterhin automatisch auf User)
client.on('messageCreate', async (message) => {
  if (message.author.bot || String(message.channel.id) !== TARGET_CHANNEL_ID) return;

  // Speichert Chatverlauf
  conversationHistory.push({ role: 'user', content: `${message.author.username}: ${message.content}` });
  if (conversationHistory.length > 10) conversationHistory.shift();

  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are Churro, an unpredictable, moody Gen-Z teen. Speak STRICTLY IN ENGLISH. Type in ALL LOWERCASE, use shortcuts (u, r, idk, rn, tbh, ngl) and heavy Gen-Z slang (bro lowkey cooked, no cap, cringe af, L + ratio, fr fr, skull emoji 💀). Short answers (1-2 sentences), no periods, no capitalization.',
        },
        ...conversationHistory
      ],
      model: 'openai/gpt-oss-20b',
    });

    const botReply = response.choices[0]?.message?.content || 'bro my brain glitched wait';
    conversationHistory.push({ role: 'assistant', content: botReply });
    if (conversationHistory.length > 10) conversationHistory.shift();

    message.reply(botReply);
  } catch (error) {
    console.error('Groq Fehler:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
