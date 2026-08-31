// ==================== DONUTSELLS MANAGER BOT ====================
// Most Powerful Bot of DonutSMP Sells
// Made by pingpongble

require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  WebhookClient,
  SlashCommandBuilder,
  REST,
  Routes,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

// ==================== CONFIG ====================
const TICKET_CATEGORY_ID = '1539692257979142185';

const STAFF_ROLE_IDS = [
  '1539698431021424650',
  '1543348513558110338',
  '1541257643140845658',
  '1543377234700673115',
  '1543377495263281284',
  '1539698976624869487',
  '1539699510056460450',
  '1543369605333131274',
  '1543370588725186672'
];

const PING_ROLE_IDS = [
  '1543369605333131274',
  '1543370588725186672'
];

const TICKET_LOGS_CHANNEL_ID = '1539942205475528734';
const GIVEAWAY_CHANNEL_ID = '1539694123353772183';
const TICKET_PANEL_CHANNEL_ID = '1539692765716283403';
const SUGGESTION_PANEL_CHANNEL_ID = '1539949080493694986'; // Kde je panel
const SUGGESTIONS_LOGS_CHANNEL_ID = '1539969669811933204'; // Kam se posílají suggesce

const SERVER_INVITE = 'https://discord.gg/TVUJ_INVITE_LINK'; // ZMĚŇ!

const TICKET_TYPES = {
  'purchase': 'purchase',
  'support': 'support',
  'media': 'media',
  'partnership': 'partnership',
  'sponsor': 'sponsor',
  'invite-boost': 'invite-boost',
  'claim': 'claim'
};

const TICKET_EMOJIS = {
  'purchase': '💸',
  'support': '🌐',
  'media': '📸',
  'partnership': '👥',
  'sponsor': '💎',
  'invite-boost': '🎁',
  'claim': '🎉'
};

const TICKET_LABELS = {
  'purchase': 'Purchase',
  'support': 'Support',
  'media': 'Media',
  'partnership': 'Partnership',
  'sponsor': 'Sponsor',
  'invite-boost': 'Invite/Boost Reward Claim',
  'claim': 'Giveaway Claim'
};

// ==================== CLIENT SETUP ====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildMessageReactions
  ]
});

const giveaways = new Map();

function isStaff(member) {
  return STAFF_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
}

async function getTicketCategory(guild) {
  let category = guild.channels.cache.get(TICKET_CATEGORY_ID);
  if (!category || category.type !== ChannelType.GuildCategory) {
    category = await guild.channels.create({
      name: 'Tickets',
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] }
      ]
    });
  }
  return category;
}

// ==================== TICKET FUNCTIONS ====================
async function createTicket(interaction, ticketType) {
  const guild = interaction.guild;
  const user = interaction.user;
  const category = await getTicketCategory(guild);

  const safeUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
  const shortType = TICKET_TYPES[ticketType] || ticketType.toLowerCase().replace(/[^a-z0-9]/g, '');
  const channelName = `${shortType}-${safeUsername}`;

  const existing = guild.channels.cache.find(c => c.name === channelName);
  if (existing) {
    return interaction.reply({ content: `You already have a ticket open: ${existing}`, ephemeral: true });
  }

  const permissionOverwrites = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
  ];

  for (const roleId of STAFF_ROLE_IDS) {
    permissionOverwrites.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: permissionOverwrites
  });

  const claimButton = new ButtonBuilder()
    .setCustomId('claim_ticket')
    .setLabel('Claim')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅');

  const closeButton = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel('Close')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🔒');

  const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

  const pingRoles = PING_ROLE_IDS.map(id => `<@&${id}>`).join(' ');
  const emoji = TICKET_EMOJIS[ticketType] || '🎫';
  const label = TICKET_LABELS[ticketType] || ticketType;

  const welcomeEmbed = new EmbedBuilder()
    .setTitle(`${emoji} ${label} Ticket`)
    .setDescription('Hello! Our Staff Team is currently reviewing your Ticket and will respond soon! After 12 hours of no response, please Ping someone from our Staff Team! Thank You!')
    .setColor(0x00AE86)
    .setFooter({ text: 'DonutSells Manager' });

  await channel.send({ content: `${pingRoles}`, embeds: [welcomeEmbed], components: [row] });

  await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
}

async function closeTicket(interaction) {
  const channel = interaction.channel;
  const logsChannel = interaction.guild.channels.cache.get(TICKET_LOGS_CHANNEL_ID);

  const messages = await channel.messages.fetch({ limit: 100 });
  const transcript = messages.reverse().map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`).join('\n');

  if (logsChannel) {
    const transcriptEmbed = new EmbedBuilder()
      .setTitle(`Ticket Closed: ${channel.name}`)
      .setDescription('```\n' + transcript.slice(0, 4000) + '\n```')
      .setColor(0xFF0000)
      .setFooter({ text: `Closed by ${interaction.user.tag}` });

    await logsChannel.send({ embeds: [transcriptEmbed] });
  }

  await interaction.reply({ content: 'Closing ticket...', ephemeral: true });
  setTimeout(async () => {
    await channel.delete().catch(console.error);
  }, 5000);
}

// ==================== GIVEAWAY FUNCTIONS ====================
async function endGiveaway(giveawayId) {
  const giveaway = giveaways.get(giveawayId);
  if (!giveaway) return;

  const { channelId, prize, winnersCount, messageId } = giveaway;
  const channel = client.channels.cache.get(channelId);
  if (!channel) return;

  const participants = giveaway.participants || [];
  if (participants.length === 0) {
    await channel.send('No one entered the giveaway!');
    giveaways.delete(giveawayId);
    return;
  }

  const winners = [];
  const pool = [...participants];
  for (let i = 0; i < Math.min(winnersCount, pool.length); i++) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(randomIndex, 1)[0]);
  }

  for (const winnerId of winners) {
    const winnerEmbed = new EmbedBuilder()
      .setTitle('🎉 Giveaway Winner!')
      .setDescription(`<@${winnerId}> You've won the Giveaway! Prize: **${prize}**`)
      .setColor(0xFFD700);

    const claimButton = new ButtonBuilder()
      .setCustomId(`claim_giveaway_${giveawayId}_${winnerId}`)
      .setLabel('CLAIM')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🎉');

    const row = new ActionRowBuilder().addComponents(claimButton);
    await channel.send({ embeds: [winnerEmbed], components: [row] });
  }

  giveaways.delete(giveawayId);
}

// ==================== EVENT: CLIENT READY ====================
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot logged in as ${c.user.tag}`);

  await c.user.setUsername('DonutSells Manager').catch(console.error);
  await c.user.setActivity('DonutSMP Sells', { type: 3 });

  const commands = [
    new SlashCommandBuilder()
      .setName('ticket')
      .setDescription('Create a ticket panel with dropdown')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('suggest')
      .setDescription('Create a suggestion panel')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('gcreate')
      .setDescription('Create a giveaway')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(opt => opt.setName('name').setDescription('Giveaway name').setRequired(true))
      .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
      .addStringOption(opt => opt.setName('prize').setDescription('Prize description').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Giveaway description').setRequired(false))
      .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(false)),

    new SlashCommandBuilder()
      .setName('embed')
      .setDescription('Send an embed message via webhook')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))
      .addStringOption(opt => opt.setName('title').setDescription('Embed title').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Embed description').setRequired(true))
      .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g. #FF0000)').setRequired(false)),

    new SlashCommandBuilder()
      .setName('dm')
      .setDescription('Send DM to a user')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
      .addStringOption(opt => opt.setName('message').setDescription('Message content').setRequired(true))
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands.map(cmd => cmd.toJSON()) });
    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('Error registering commands:', error);
  }

  // Auto-create ticket panel
  try {
    const ticketPanelChannel = c.channels.cache.get(TICKET_PANEL_CHANNEL_ID);
    if (ticketPanelChannel) {
      const embed = new EmbedBuilder()
        .setTitle('**Create a Ticket**')
        .setDescription('**Create a Ticket with the button below\nAfter creation, please wait until someone from Staff Team will *Claim* your Ticket. Thank You for understanding.**')
        .setColor(0x00AE86);

      const select = new StringSelectMenuBuilder()
        .setCustomId('ticket_type')
        .setPlaceholder('Choose a ticket type')
        .addOptions([
          { label: '💸 Purchase', value: 'purchase' },
          { label: '🌐 Support', value: 'support' },
          { label: '📸 Media', value: 'media' },
          { label: '👥 Partnership', value: 'partnership' },
          { label: '💎 Sponsor', value: 'sponsor' },
          { label: '🎁 Invite/Boost Reward Claim', value: 'invite-boost' }
        ]);

      const row = new ActionRowBuilder().addComponents(select);
      await ticketPanelChannel.send({ embeds: [embed], components: [row] });
      console.log('✅ Ticket panel created');
    }
  } catch (error) {
    console.error('Error creating ticket panel:', error);
  }

  // Auto-create suggestion panel
  try {
    const suggestionPanelChannel = c.channels.cache.get(SUGGESTION_PANEL_CHANNEL_ID);
    if (suggestionPanelChannel) {
      const suggestEmbed = new EmbedBuilder()
        .setTitle('**Suggestions**')
        .setDescription('**If you have any suggestion what should we add into our server/bot, please use the *button* below**')
        .setColor(0x9B59B6);

      const suggestButton = new ButtonBuilder()
        .setCustomId('open_suggestion_modal')
        .setLabel('Suggest')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💡');

      const row = new ActionRowBuilder().addComponents(suggestButton);
      await suggestionPanelChannel.send({ embeds: [suggestEmbed], components: [row] });
      console.log('✅ Suggestion panel created');
    }
  } catch (error) {
    console.error('Error creating suggestion panel:', error);
  }
});

// ==================== EVENT: INTERACTION CREATE ====================
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'ticket_type') {
      const selected = interaction.values[0];
      await createTicket(interaction, selected);
    }
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'claim_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: 'Only staff can claim tickets!', ephemeral: true });
      }
      await interaction.channel.setName(`claimed-${interaction.user.username.toLowerCase()}-${interaction.channel.name.split('-').pop()}`);
      await interaction.reply({ content: `Ticket claimed by ${interaction.user}!` });
    }

    if (interaction.customId === 'close_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: 'Only staff can close tickets!', ephemeral: true });
      }
      await closeTicket(interaction);
    }

    if (interaction.customId.startsWith('enter_giveaway_')) {
      const giveawayId = interaction.customId.split('_')[2];
      const giveaway = giveaways.get(giveawayId);
      if (!giveaway) {
        return interaction.reply({ content: 'This giveaway has ended!', ephemeral: true });
      }
      if (!giveaway.participants) giveaway.participants = [];
      if (giveaway.participants.includes(interaction.user.id)) {
        return interaction.reply({ content: 'You are already entered!', ephemeral: true });
      }
      giveaway.participants.push(interaction.user.id);
      await interaction.reply({ content: 'You entered the giveaway! Good luck! 🎉', ephemeral: true });
    }

    if (interaction.customId.startsWith('claim_giveaway_')) {
      const parts = interaction.customId.split('_');
      const winnerId = parts[parts.length - 1];
      if (interaction.user.id !== winnerId) {
        return interaction.reply({ content: 'This claim button is not for you!', ephemeral: true });
      }
      await createTicket(interaction, 'claim');
    }

    if (interaction.customId === 'open_suggestion_modal') {
      const modal = new ModalBuilder()
        .setCustomId('suggestion_modal')
        .setTitle('Submit a Suggestion');

      const suggestionInput = new TextInputBuilder()
        .setCustomId('suggestion_text')
        .setLabel('Your Suggestion')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Write your suggestion here...')
        .setMaxLength(1000)
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(suggestionInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'suggestion_modal') {
      const suggestion = interaction.fields.getTextInputValue('suggestion_text');
      
      const suggestionEmbed = new EmbedBuilder()
        .setTitle('💡 New Suggestion')
        .setDescription(suggestion)
        .setColor(0x9B59B6)
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      const suggestionsLogsChannel = interaction.guild.channels.cache.get(SUGGESTIONS_LOGS_CHANNEL_ID);
      if (suggestionsLogsChannel) {
        await suggestionsLogsChannel.send({ embeds: [suggestionEmbed] });
        await interaction.reply({ content: 'Your suggestion has been submitted!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Suggestions channel not found!', ephemeral: true });
      }
    }
  }

  if (interaction.isCommand()) {
    const { commandName } = interaction;

    if (commandName === 'ticket') {
      const embed = new EmbedBuilder()
        .setTitle('**Create a Ticket**')
        .setDescription('**Create a Ticket with the button below\nAfter creation, please wait until someone from Staff Team will *Claim* your Ticket. Thank You for understanding.**')
        .setColor(0x00AE86);

      const select = new StringSelectMenuBuilder()
        .setCustomId('ticket_type')
        .setPlaceholder('Choose a ticket type')
        .addOptions([
          { label: '💸 Purchase', value: 'purchase' },
          { label: '🌐 Support', value: 'support' },
          { label: '📸 Media', value: 'media' },
          { label: '👥 Partnership', value: 'partnership' },
          { label: '💎 Sponsor', value: 'sponsor' },
          { label: '🎁 Invite/Boost Reward Claim', value: 'invite-boost' }
        ]);

      const row = new ActionRowBuilder().addComponents(select);
      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: 'Ticket panel created!', ephemeral: true });
    }

    if (commandName === 'suggest') {
      const suggestEmbed = new EmbedBuilder()
        .setTitle('**Suggestions**')
        .setDescription('**If you have any suggestion what should we add into our server/bot, please use the *button* below**')
        .setColor(0x9B59B6);

      const suggestButton = new ButtonBuilder()
        .setCustomId('open_suggestion_modal')
        .setLabel('Suggest')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💡');

      const row = new ActionRowBuilder().addComponents(suggestButton);
      await interaction.channel.send({ embeds: [suggestEmbed], components: [row] });
      await interaction.reply({ content: 'Suggestion panel created!', ephemeral: true });
    }

    if (commandName === 'gcreate') {
      const name = interaction.options.getString('name');
      const duration = interaction.options.getInteger('duration');
      const prize = interaction.options.getString('prize');
      const description = interaction.options.getString('description') || 'No description';
      const winnersCount = interaction.options.getInteger('winners') || 1;

      const endTime = Date.now() + duration * 60000;
      const giveawayId = Date.now().toString();

      const embed = new EmbedBuilder()
        .setTitle(`🎉 ${name}`)
        .setDescription(`**Prize:** ${prize}\n**Description:** ${description}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n**Winners:** ${winnersCount}\n\nClick the button below to enter!`)
        .setColor(0xFFD700)
        .setFooter({ text: 'Good luck!' });

      const enterButton = new ButtonBuilder()
        .setCustomId(`enter_giveaway_${giveawayId}`)
        .setLabel('Enter Giveaway')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎉');

      const row = new ActionRowBuilder().addComponents(enterButton);

      const giveawayChannel = interaction.guild.channels.cache.get(GIVEAWAY_CHANNEL_ID);
      if (!giveawayChannel) {
        return interaction.reply({ content: 'Giveaway channel not found!', ephemeral: true });
      }

      const msg = await giveawayChannel.send({ embeds: [embed], components: [row] });

      giveaways.set(giveawayId, {
        channelId: giveawayChannel.id,
        messageId: msg.id,
        prize,
        winnersCount,
        participants: []
      });

      setTimeout(() => endGiveaway(giveawayId), duration * 60000);
      await interaction.reply({ content: 'Giveaway created!', ephemeral: true });
    }

    if (commandName === 'embed') {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const colorHex = interaction.options.getString('color') || '#5865F2';
      const color = parseInt(colorHex.replace('#', ''), 16);

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color);

      try {
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find(wh => wh.name === 'DonutSells Manager');
        if (!webhook) {
          webhook = await channel.createWebhook({
            name: 'DonutSells Manager',
            avatar: client.user.displayAvatarURL()
          });
        }
        const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
        await webhookClient.send({ embeds: [embed] });
        await interaction.reply({ content: 'Embed sent!', ephemeral: true });
      } catch (error) {
        console.error('Webhook error:', error);
        await interaction.reply({ content: 'Could not send embed. Check permissions.', ephemeral: true });
      }
    }

    if (commandName === 'dm') {
      const user = interaction.options.getUser('user');
      const message = interaction.options.getString('message');
      
      const dmEmbed = new EmbedBuilder()
        .setTitle('DonutSMP Sells')
        .setDescription(message)
        .setColor(0x00AE86)
        .setFooter({ text: 'DonutSells Manager' })
        .setTimestamp();
      
      const serverButton = new ButtonBuilder()
        .setLabel('Sent from DonutSMP Sells')
        .setStyle(ButtonStyle.Link)
        .setURL(https://discord.gg/donutsells);
      
      const row = new ActionRowBuilder().addComponents(serverButton);
      
      try {
        await user.send({ embeds: [dmEmbed], components: [row] });
        await interaction.reply({ content: `DM sent to ${user.tag}!`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: 'Could not send DM (user may have DMs disabled).', ephemeral: true });
      }
    }
  }
});

// ==================== LOGIN ====================
client.login(process.env.DISCORD_TOKEN);
