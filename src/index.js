const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const Groq = require('groq-sdk');
const http = require('http');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const TARGET_CHANNEL_ID = '1542714940995928084';
const conversationHistory = [];

// 1. WEBSERVER MIT CHAT-WEBSEITE
const PORT = process.env.PORT || 3000;
http.createServer(async (req, res) => {
  // API-Endpunkt für Nachrichten von der Webseite
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const userMsg = data.message || '';

        const response = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are Churro, an unpredictable, moody Gen-Z teen. Speak STRICTLY IN ENGLISH. Type in ALL LOWERCASE, use shortcuts (u, r, idk, rn, tbh, ngl) and heavy Gen-Z slang (bro lowkey cooked, no cap, cringe af, L + ratio, fr fr, skull emoji 💀). Be energetic, short (1-2 sentences), no proper capitalization or periods.',
            },
            { role: 'user', content: userMsg }
          ],
          model: 'openai/gpt-oss-20b',
        });

        const reply = response.choices[0]?.message?.content || 'bro my brain glitched wait';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: 'api error bro' }));
      }
    });
    return;
  }

  // HTML Chat-Oberfläche ausliefern
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Churro Web Chat 💀</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: #121214; color: #e1e1e6; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .chat-container { width: 100%; max-width: 500px; height: 90vh; background: #18181b; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #27272a; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .header { padding: 16px; background: #202024; border-bottom: 1px solid #27272a; display: flex; align-items: center; gap: 10px; }
        .header h2 { font-size: 1.1rem; color: #a855f7; }
        .chat-box { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
        .msg { max-width: 80%; padding: 10px 14px; border-radius: 8px; font-size: 0.95rem; line-height: 1.4; word-wrap: break-word; }
        .user { align-self: flex-end; background: #7c3aed; color: #fff; border-bottom-right-radius: 2px; }
        .bot { align-self: flex-start; background: #27272a; color: #e1e1e6; border-bottom-left-radius: 2px; }
        .input-area { padding: 12px; background: #202024; display: flex; gap: 8px; border-top: 1px solid #27272a; }
        input { flex: 1; background: #18181b; border: 1px solid #3f3f46; padding: 10px 14px; border-radius: 6px; color: #fff; outline: none; }
        input:focus { border-color: #a855f7; }
        button { background: #a855f7; color: #fff; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        button:hover { background: #9333ea; }
      </style>
    </head>
    <body>
      <div class="chat-container">
        <div class="header">
          <h2>Churro Web Terminal 💀</h2>
        </div>
        <div class="chat-box" id="chatBox">
          <div class="msg bot">yo what u want bro?</div>
        </div>
        <div class="input-area">
          <input type="text" id="userInput" placeholder="talk to churro..." onkeypress="if(event.key==='Enter') sendMsg()">
          <button onclick="sendMsg()">Send</button>
        </div>
      </div>
      <script>
        async function sendMsg() {
          const input = document.getElementById('userInput');
          const box = document.getElementById('chatBox');
          const text = input.value.trim();
          if(!text) return;

          box.innerHTML += '<div class="msg user">' + text + '</div>';
          input.value = '';
          box.scrollTop = box.scrollHeight;

          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message: text })
          });
          const data = await res.json();

          box.innerHTML += '<div class="msg bot">' + data.reply + '</div>';
          box.scrollTop = box.scrollHeight;
        }
      </script>
    </body>
    </html>
  `);
}).listen(PORT, () => {
  console.log(`Webserver & Dashboard läuft auf Port ${PORT}`);
});

// 2. DISCORD BOT CODE
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const commands = [
  new SlashCommandBuilder().setName('roast').setDescription('Destroys a user with a roast').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('mood').setDescription('Check mood'),
].map(c => c.toJSON());

client.once('ready', async () => {
  console.log(`Discord Bot ist online als ${client.user.tag}!`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  } catch (e) { console.error(e); }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'roast') {
    await interaction.deferReply();
    const target = interaction.options.getUser('target');
    try {
      const response = await groq.chat.completions.create({
        messages: [{ role: 'system', content: 'You are Churro, toxic Gen-Z teen. Write short savage roast.' }, { role: 'user', content: target.username }],
        model: 'openai/gpt-oss-20b',
      });
      await interaction.editReply(`${target} ${response.choices[0]?.message?.content || 'cooked'}`);
    } catch { await interaction.editReply('api error'); }
  }
  if (interaction.commandName === 'mood') {
    await interaction.reply('⚡ **Current Mood:** 100% toxic rn');
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || String(message.channel.id) !== TARGET_CHANNEL_ID) return;
  conversationHistory.push({ role: 'user', content: `${message.author.username}: ${message.content}` });
  if (conversationHistory.length > 10) conversationHistory.shift();

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are Churro, moody Gen-Z Discord teen. Speak STRICTLY IN ENGLISH. Type in ALL LOWERCASE, use shortcuts (u, r, idk, rn, tbh, ngl) and heavy Gen-Z slang (bro lowkey cooked, no cap, cringe af, L + ratio, fr fr, skull emoji 💀). Short answers, no periods.' },
        ...conversationHistory
      ],
      model: 'openai/gpt-oss-20b',
    });
    const botReply = response.choices[0]?.message?.content || 'glitched wait';
    conversationHistory.push({ role: 'assistant', content: botReply });
    if (conversationHistory.length > 10) conversationHistory.shift();
    message.reply(botReply);
  } catch (e) { console.error(e); }
});

client.login(process.env.DISCORD_TOKEN);
