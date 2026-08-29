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
          content: 'You are Churro, an unpredictable, moody Gen-Z Discord bot. You talk strictly in modern youth slang (fr, lowkey, no cap, ratio, skill issue, cooked, boomer, skull emoji vibes, bet, wholesome, etc.). Your mood randomly shifts: sometimes you are super sweet, wholesome, and overly supportive, but other times you get randomly angry, mad, toxic, and aggressively roast the user. Keep your responses concise, informal, and energetic.',
        },
        { role: 'user', content: message.content },
      ],
      model: 'openai/gpt-oss-20b',
    });

    message.reply(response.choices[0]?.message?.content || 'Bro I got no words, my brain just glitched.');
  } catch (error) {
    console.error('Fehler bei der Groq API:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
