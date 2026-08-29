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

// Exakte Kanal-ID als String
const TARGET_CHANNEL_ID = '1542714940995928084';

client.once('ready', () => {
  console.log(`Bot ist online als ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  // 1. Ignoriere Bot-Nachrichten
  if (message.author.bot) return;

  // 2. Erzwungener Kanal-Filter (bricht ab, wenn die ID nicht exakt übereinstimmt)
  if (String(message.channel.id) !== TARGET_CHANNEL_ID) {
    return;
  }

  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are Churro, a Discord bot speaking casual Gen-Z / youth slang English. Use terms like fr, ngl, lowkey, bet, no cap, bro, etc. Keep replies concise, naturally informal, and energetic.',
        },
        { role: 'user', content: message.content },
      ],
      model: 'openai/gpt-oss-20b',
    });

    message.reply(response.choices[0]?.message?.content || 'No response, my bad.');
  } catch (error) {
    console.error('Fehler:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
