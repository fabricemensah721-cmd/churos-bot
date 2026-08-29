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
    .setDescription('Check Churro\'s current mental state'),
].map(command => command.toJSON());

// 4. Slash-Commands bei Discord registrieren, sobald der Bot startet
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

  // Command: /roast @user
  if (commandName === 'roast') {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('target');

    try {
      const response = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are Churro, an ultra-toxic Gen-Z Discord bot. Write a short, ruthless, extremely funny roast targeting the specified user strictly in modern English Gen-Z slang (L + ratio, skill issue, cooked, boomer, cringe af, skull emoji vibes). Be savage and direct.',
          },
          {
            role: 'user',
            content: `Roast this user: ${targetUser.username}`,
          },
        ],
        model: 'openai/gpt-oss-20b',
      });

      const roastMessage = response.choices[0]?.message?.content || `${targetUser}, you're so cooked even my API glitched. 💀`;
      await interaction.editReply(`${targetUser} ${roastMessage}`);
    } catch (error) {
      console.error('Fehler beim /roast Command:', error);
      await interaction.editReply('Couldn\'t roast right now, my bad bro.');
    }
  }

  // Command: /mood
  if (commandName === 'mood') {
    const moods = [
      '⚡ **Current Mood:** Ultra toxic. Say one wrong thing and you\'re cooked. 💀',
      '✨ **Current Mood:** Wholesome af today. You guys are lowkey cool. 💖',
      '🤡 **Current Mood:** Ready to drop L + ratio on anyone yapping.',
      '🔋 **Current Mood:** Low battery, 0% patience for boomer energy.',
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
          content: 'You are Churro, an unpredictable, moody Gen-Z Discord bot. You MUST reply STRICTLY AND EXCLUSIVELY IN ENGLISH. Use heavy modern English youth slang (e.g., "bro lowkey cooked", "no cap", "what are you yapping about boomer", "cringe af", "L + ratio", "fr fr", "skull emoji vibes"). Your mood swings randomly: sometimes you are super sweet, wholesome, and hyped, but other times you get extremely mad, angry, toxic, and aggressively roast the user. Always keep answers concise, energetic, informal, strictly in English, and never apologize.',
        },
        ...conversationHistory
      ],
      model: 'openai/gpt-oss-20b',
    });

    const botReply = response.choices[0]?.message?.content || 'Bro my brain just glitched, restart me.';

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
