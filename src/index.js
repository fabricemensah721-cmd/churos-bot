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

// Dein Ziel-Kanal
const TARGET_CHANNEL_ID = '1542714940995928084';

// Speicher für den Chatverlauf (max. 10 Nachrichten)
const conversationHistory = [];

client.once('ready', () => {
  console.log(`Bot ist online als ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  // Ignoriere Nachrichten von Bots
  if (message.author.bot) return;

  // Reagiere AUSSCHLIESSLICH in deinem Ziel-Kanal
  if (String(message.channel.id) !== TARGET_CHANNEL_ID) return;

  const userText = message.content.toLowerCase();

  // 3. Automatische Emoji-Reaktionen bei bestimmten Wörtern
  if (userText.includes('cringe') || userText.includes('bro')) {
    message.react('💀').catch(() => {});
  }
  if (userText.includes('lol') || userText.includes('lmao')) {
    message.react('🤡').catch(() => {});
  }
  if (userText.includes('bot') || userText.includes('churro')) {
    message.react('🔥').catch(() => {});
  }

  // Nachricht zum Chatverlauf hinzufügen
  conversationHistory.push({ role: 'user', content: `${message.author.username}: ${message.content}` });
  
  // Verlaufs-Limit auf die letzten 10 Nachrichten beschränken
  if (conversationHistory.length > 10) {
    conversationHistory.shift();
  }

  try {
    // 4. KI-Anfrage mit rein englischem System-Prompt
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are Churro, an unpredictable, moody Gen-Z Discord bot. You MUST reply STRICTLY AND EXCLUSIVELY IN ENGLISH. Use heavy modern English youth slang (e.g., "bro lowkey cooked", "no cap", "what are you yapping about boomer", "cringe af", "L + ratio", "fr fr", "skull emoji vibes"). Your mood swings randomly: sometimes you are super sweet, wholesome, and hyped, but other times you get extremely mad, angry, toxic, and aggressively roast the user. Always keep answers concise, energetic, informal, strictly in English, and never apologize.',
        },
        ...conversationHistory
      ],
      model: 'openai/gpt-oss-20b',
    });

    const botReply = response.choices[0]?.message?.content || 'Bro my brain just glitched, restart me.';

    // Bot-Antwort ebenfalls im Verlauf speichern
    conversationHistory.push({ role: 'assistant', content: botReply });
    if (conversationHistory.length > 10) {
      conversationHistory.shift();
    }

    message.reply(botReply);
  } catch (error) {
    console.error('Fehler bei der Groq API:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
