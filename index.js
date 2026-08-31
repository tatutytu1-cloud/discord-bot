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
  Routes
} = require('discord.js');

// ==================== CONFIG ====================
const TICKET_CATEGORY_NAME = 'Tickets';

// Staff role IDs that can claim/close tickets
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

// Channel IDs
const TICKET_LOGS_CHANNEL_ID = '1539942205475528734';
const GIVEAWAY_CHANNEL_ID = '1539694123353772183';
const TICKET_PANEL_CHANNEL_ID = '1539692765716283403';

// Ticket types
const TICKET_TYPES = {
  'purchase': '💸 Purchase',
  'support': '🌐 Support',
  'media': '📸 Media',
  'partnership': '👥 Partnership',
  'sponsor': '💎 Sponsor',
  'invite-boost': '🎁 Invite/Boost Reward Claim',
  'claim': '🎉 Giveaway Claim'
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

// ==================== GIVEAWAY STORAGE ====================
const giveaways = new Map();

// ==================== HELPER FUNCTIONS ====================
function isStaff(member) {
  return STAFF_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
}

async function getTicketCategory(guild) {
  let category = guild.channels.cache.find(c => c.name === TICKET_CATEGORY_NAME && c.type === ChannelType.GuildCategory);
  if (!category) {
    category = await guild.channels.create({
      name: TICKET_CATEGORY_NAME,
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

  // Check existing ticket
  const existing = guild.channels.cache.find(c => c.name === `ticket-${user.id}`);
  if (existing) {
    return interaction.reply({ content: `You already have a ticket open: ${existing}`, ephemeral: true });
  }

  // Build permission overwrites
  const permissionOverwrites = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
  ];

  // Add staff roles
  for (const roleId of STAFF_ROLE_IDS) {
    permissionOverwrites.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
    });
  }

  // Create channel
  const channel = await guild.channels.create({
    name: `ticket-${user.id}`,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: permissionOverwrites
  });

  // Buttons
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

  // Welcome message
  const welcomeEmbed = new EmbedBuilder()
    .setTitle(`${ticketType} Ticket`)
    .setDescription('Hello! Our Staff Team is currently reviewing your Ticket and will respond soon! After 12 hours of no response, please Ping someone from our Staff Team! Thank You!')
    .setColor(0x00AE86)
    .setFooter({ text: 'DonutSells Manager' });

  await channel.send({ embeds: [welcomeEmbed], components: [row] });

  await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
}

async function closeTicket(interaction) {
  const channel = interaction.channel;
  const logsChannel = interaction.guild.channels.cache.get(TICKET_LOGS_CHANNEL_ID);

  // Collect all messages
  const messages = await channel.messages.fetch({ limit: 100 });
  const transcript = messages.reverse().map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`).join('\n');

  // Send transcript to logs
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

  // Random winners
  const winners = [];
  const pool = [...participants];
  for (let i = 0; i < Math.min(winnersCount, pool.length); i++) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(randomIndex, 1)[0]);
  }

  // Announce winners
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

  // Set bot profile
  await c.user.setUsername('DonutSells Manager').catch(console.error);
  await c.user.setActivity('DonutSMP Sells', { type: 3 }); // Watching

  // Register slash commands
  const commands = [
    new SlashCommandBuilder()
      .setName('ticket')
      .setDescription('Create a ticket panel with dropdown')
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

  // Auto-create ticket panel in the ticket channel
  try {
    const ticketPanelChannel = c.channels.cache.get(TICKET_PANEL_CHANNEL_ID);
    if (ticketPanelChannel) {
      const embed = new EmbedBuilder()
        .setTitle('Support Tickets')
        .setDescription('Please select the type of support you need:')
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
});

// ==================== EVENT: INTERACTION CREATE ====================
client.on(Events.InteractionCreate, async (interaction) => {
  // Handle string select menu (ticket dropdown)
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'ticket_type') {
      const selected = interaction.values[0];
      const ticketType = TICKET_TYPES[selected] || selected;
      await createTicket(interaction, ticketType);
    }
    return;
  }

  // Handle buttons
  if (interaction.isButton()) {
    // Claim ticket button
    if (interaction.customId === 'claim_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: 'Only staff can claim tickets!', ephemeral: true });
      }
      await interaction.channel.setName(`claimed-${interaction.user.username.toLowerCase()}-${interaction.channel.name.split('-').pop()}`);
      await interaction.reply({ content: `Ticket claimed by ${interaction.user}!` });
    }

    // Close ticket button
    if (interaction.customId === 'close_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: 'Only staff can close tickets!', ephemeral: true });
      }
      await closeTicket(interaction);
    }

    // Giveaway enter button
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

    // Giveaway claim button
    if (interaction.customId.startsWith('claim_giveaway_')) {
      const parts = interaction.customId.split('_');
      const winnerId = parts[parts.length - 1];
      if (interaction.user.id !== winnerId) {
        return interaction.reply({ content: 'This claim button is not for you!', ephemeral: true });
      }
      await createTicket(interaction, '🎉 Giveaway Claim');
    }
  }

  // Handle slash commands
  if (interaction.isCommand()) {
    const { commandName } = interaction;

    // /ticket
    if (commandName === 'ticket') {
      const embed = new EmbedBuilder()
        .setTitle('Support Tickets')
        .setDescription('Please select the type of support you need:')
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

    // /gcreate
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

      // Send to giveaway channel
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

    // /embed
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

    // /dm
    if (commandName === 'dm') {
      const user = interaction.options.getUser('user');
      const message = interaction.options.getString('message');
      try {
        await user.send(message);
        await interaction.reply({ content: `DM sent to ${user.tag}!`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: 'Could not send DM (user may have DMs disabled).', ephemeral: true });
      }
    }
  }
});

// ==================== LOGIN ====================
client.login(process.env.DISCORD_TOKEN);