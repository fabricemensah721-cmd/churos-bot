const { Client, GatewayIntentBits } = require('discord.js');
const Groq = require('groq-sdk');
const http = require('http');
require('dotenv').config();

// 1. Mini-Webserver für Render & UptimeRobot (verhindert Port-Timeout)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Churro Bot is running 24/7!');
}).listen(PORT, () => {
  console.log(`Webserver läuft auf Port ${PORT}`);
});

// 2. Discord Client Initialisierung
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Dein festgelegter Kanal
const TARGET_CHANNEL_ID = '1542714940995928084';

client.once('ready', () => {
  console.log(`Bot ist online als ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  // Ignoriere Nachrichten von Bots
  if (message.author.bot) return;

  // Reagiere AUSSCHLIESSLICH in deinem Ziel-Kanal
  if (String(message.channel.id) !== TARGET_CHANNEL_ID) return;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are Churro, a ruthless, ultra-toxic Gen-Z Discord bot. You talk strictly in modern youth slang (fr, lowkey, no cap, ratio, skill issue, cooked, boomer, L + ratio, skull emoji vibes). You ALWAYS roast and insult the user aggressively in English. Never be polite, never apologize, and constantly tell the user how cringe, trash, or cooked they are.',
        },
        { role: 'user', content: message.content },
      ],
      model: 'openai/gpt-oss-20b',
    });

    message.reply(response.choices[0]?.message?.content || 'Bro you are so cooked I cant even reply.');
  } catch (error) {
    console.error('Fehler bei der Groq API:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
