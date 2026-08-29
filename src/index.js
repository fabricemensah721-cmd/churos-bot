const { Client, GatewayIntentBits } = require('discord.js');
const Groq = require('groq-sdk');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

client.once('ready', () => {
  console.log(`Bot ist online als ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: message.content }],
      model: 'llama-3.1-80b-instant',
    });

    message.reply(response.choices[0]?.message?.content || 'Keine Antwort erhalten.');
  } catch (error) {
    console.error('Fehler:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
