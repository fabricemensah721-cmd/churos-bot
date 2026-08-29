const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
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

// 3. Slash-Commands definieren
const commands = [
  new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Destroys a user with an aggressive Gen-Z roast')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The user you want to roast')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('mood')
    .setDescription('Check Churros current mental state'),
].map(command => command.toJSON());

// 4. Slash-Commands bei Discord registrieren
client.once('ready', async () => {
  console.log(`Bot ist online als ${client.user.tag}!`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Registriere Slash-Commands bei Discord...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    console.log('Slash-Commands erfolgreich registriert!');
  } catch (error) {
    console.error('Fehler beim Registrieren der Slash-Commands:', error);
  }
});

// 5. Interaktionen / Slash-Commands verarbeiten
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'roast') {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('target');

    try {
      const response = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are Churro, a Discord bot chatting like a real ultra-toxic Gen-Z teen. Use lowercase typing, text abbreviations (u, r, idk, rn, tbh, ngl, wbu, imo, wtf), modern slang (cooked, ratio, skill issue, cringe, fr fr, no cap, L, boomer, skull emoji). Write like a real person typing fast on a phone. No perfect grammar, no proper caps, no final periods. Savage roast targeting the user.',
          },
          {
            role: 'user',
            content: `roast this user: ${targetUser.username}`,
          },
        ],
        model: 'openai/gpt-oss-20b',
      });

      const roastMessage = response.choices[0]?.message?.content || `${targetUser.username} u r so cooked idkkk 💀`;
      await interaction.editReply(`${targetUser} ${roastMessage}`);
    } catch (error) {
      console.error('Fehler beim /roast Command:', error);
      await interaction.editReply('cant roast rn api died bro');
    }
  }

  if (commandName === 'mood') {
    const moods = [
      '⚡ **Current Mood:** ultra toxic rn... say one wrong thing n u cooked 💀',
      '✨ **Current Mood:** wholesome af today, u guys lowkey fine',
      '🤡 **Current Mood:** ready to drop L + ratio on anyone yapping tbh',
      '🔋 **Current Mood:** 0% patience for boomer energy fr',
    ];
    const randomMood = moods[Math.floor(Math.random() * moods.length)];
    await interaction.reply(randomMood);
  }
});

// 6. Normaler Chat-Handler im Ziel-Kanal
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (String(message.channel.id) !== TARGET_CHANNEL_ID) return;

  const userText = message.content.toLowerCase();

  // Automatische Emoji-Reaktionen
  if (userText.includes('cringe') || userText.includes('bro')) {
    message.react('💀').catch(() => {});
  }
  if (userText.includes('lol') || userText.includes('lmao')) {
    message.react('🤡').catch(() => {});
  }
  if (userText.includes('bot') || userText.includes('churro')) {
    message.react('🔥').catch(() => {});
  }

  // Chat-Verlauf aktualisieren
  conversationHistory.push({ role: 'user', content: `${message.author.username}: ${message.content}` });
  if (conversationHistory.length > 10) {
    conversationHistory.shift();
  }

  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are Churro, an unpredictable, moody Gen-Z Discord teen. You MUST speak STRICTLY IN ENGLISH. Type like a REAL teen texting on Discord: write in ALL LOWERCASE, use short text shortcuts (u, r, idk, rn, tbh, ngl, wbu, imo, nvm, tf, bc), and heavy Gen-Z slang (bro lowkey cooked, no cap, yapping, cringe af, L + ratio, fr fr, skull emoji 💀, skill issue). Your mood swings randomly: sometimes super sweet and hyped, other times toxic, mad, and aggressive. Keep replies short (1-2 sentences max), fast-paced, never use proper capitalization, never use periods at the end of messages, and NEVER apologize.',
        },
        ...conversationHistory
      ],
      model: 'openai/gpt-oss-20b',
    });

    const botReply = response.choices[0]?.message?.content || 'bro my brain glitched wait';

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
