// ==================== PINGPONG'S HANGOUT MANAGER BOT ====================
// Most Powerful Bot of PingPong's Hangout
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
  TextInputStyle,
  AuditLogEvent
} = require('discord.js');

// ==================== CONFIG ====================
const TICKET_CATEGORY_ID = '1539692257979142185';
const STAFF_APP_TICKET_CATEGORY_ID = '1544116851083055224';

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
const SUGGESTION_PANEL_CHANNEL_ID = '1539949080493694986';
const SUGGESTIONS_LOGS_CHANNEL_ID = '1539969669811933204';
const WELCOME_GOODBYE_CHANNEL_ID = '1540717176913399829';
const INVITE_TRACKING_CHANNEL_ID = '1539999179609481366';
const APPEALS_LOGS_CHANNEL_ID = '1539969669811933204';

const SERVER_INVITE = 'https://discord.gg/pingpongshangout';
const BOT_NAME = "PingPong's Hangout Manager";

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
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites
  ]
});

const giveaways = new Map();
const inviteCache = new Map();
const claimedTickets = new Map();
const ticketCreatedAt = new Map();

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

  ticketCreatedAt.set(channel.id, Date.now());

  const claimButton = new ButtonBuilder()
    .setCustomId('claim_ticket')
    .setLabel('Claim')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅');

  const renameButton = new ButtonBuilder()
    .setCustomId('rename_ticket')
    .setLabel('Rename')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('✏️');

  const closeButton = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel('Close')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🔒');

  const row = new ActionRowBuilder().addComponents(claimButton, renameButton, closeButton);

  const pingRoles = PING_ROLE_IDS.map(id => `<@&${id}>`).join(' ');
  const emoji = TICKET_EMOJIS[ticketType] || '🎫';
  const label = TICKET_LABELS[ticketType] || ticketType;

  const welcomeEmbed = new EmbedBuilder()
    .setTitle(`${emoji} ${label} Ticket`)
    .setDescription('Hello! Our Staff Team is currently reviewing your Ticket and will respond soon! After 12 hours of no response, please Ping someone from our Staff Team! Thank You!')
    .setColor(0x00AE86)
    .setFooter({ text: BOT_NAME });

  await channel.send({ content: `${pingRoles}`, embeds: [welcomeEmbed], components: [row] });

  setTimeout(async () => {
    const claimed = claimedTickets.get(channel.id);
    if (!claimed) {
      const channelStillExists = guild.channels.cache.get(channel.id);
      if (channelStillExists) {
        const pingMessage = PING_ROLE_IDS.map(id => `<@&${id}>`).join(' ');
        await channelStillExists.send({ content: `${pingMessage} Reminder: This ticket has not been claimed yet!` });
      }
    }
  }, 12 * 60 * 60 * 1000);

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

  claimedTickets.delete(channel.id);
  ticketCreatedAt.delete(channel.id);

  await interaction.reply({ content: 'Closing ticket...', ephemeral: true });
  setTimeout(async () => {
    await channel.delete().catch(() => {});
  }, 5000);
}

// ==================== GIVEAWAY FUNCTIONS ====================
async function endGiveaway(giveawayId) {
  const giveaway = giveaways.get(giveawayId);
  if (!giveaway) return;

  const { channelId, prize, winnersCount } = giveaway;
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

// ==================== WELCOME/FAREWELL/BAN/KICK ====================
client.on(Events.GuildMemberAdd, async (member) => {
  const channel = member.guild.channels.cache.get(WELCOME_GOODBYE_CHANNEL_ID);
  if (channel) {
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('👋 Welcome!')
      .setDescription(`Welcome <@${member.id}>! Hope you will enjoy your time here with our Community!`)
      .setColor(0x00FF00)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
    
    await channel.send({ embeds: [welcomeEmbed] });
  }

  try {
    const newInvites = await member.guild.invites.fetch();
    for (const invite of newInvites.values()) {
      const cachedInvite = inviteCache.get(invite.code);
      
      if (cachedInvite && invite.uses > cachedInvite.uses) {
        const inviter = invite.inviter;
        
        if (inviter && inviter.id !== member.id) {
          const trackingChannel = member.guild.channels.cache.get(INVITE_TRACKING_CHANNEL_ID);
          if (trackingChannel) {
            const inviteEmbed = new EmbedBuilder()
              .setDescription(`<@${member.id}> have just joined through <@${inviter.id}> link! Use button below to claim your money!`)
              .setColor(0xFFD700)
              .setTimestamp();

            const claimButton = new ButtonBuilder()
              .setCustomId(`invite_reward_claim_${inviter.id}`)
              .setLabel('CLAIM')
              .setStyle(ButtonStyle.Success)
              .setEmoji('✅');

            const row = new ActionRowBuilder().addComponents(claimButton);
            await trackingChannel.send({ embeds: [inviteEmbed], components: [row] });
          }
        }

        inviteCache.set(invite.code, {
          inviterId: invite.inviter?.id,
          uses: invite.uses || 0
        });
      }
    }
  } catch (error) {
    console.error('Error tracking invites:', error);
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  const channel = member.guild.channels.cache.get(WELCOME_GOODBYE_CHANNEL_ID);
  if (!channel) return;
  
  const farewellEmbed = new EmbedBuilder()
    .setTitle('👋 Goodbye!')
    .setDescription(`<@${member.id}> has officially left us :( \nGoodbye!`)
    .setColor(0xFF0000)
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();
  
  await channel.send({ embeds: [farewellEmbed] });
});

client.on(Events.GuildBanAdd, async (ban) => {
  const channel = ban.guild.channels.cache.get(WELCOME_GOODBYE_CHANNEL_ID);
  if (!channel) return;
  
  const banEmbed = new EmbedBuilder()
    .setTitle('🔨 User Banned')
    .setDescription(`<@${ban.user.id}> had flew too close to the sun and got banned! Farewell!`)
    .setColor(0xFF0000)
    .setTimestamp();
  
  await channel.send({ embeds: [banEmbed] });
});

client.on(Events.InviteCreate, async (invite) => {
  inviteCache.set(invite.code, {
    inviterId: invite.inviter?.id,
    uses: invite.uses || 0
  });
});

// ==================== MESSAGE CREATE - AUTO CLAIM ====================
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  
  const channel = message.channel;
  
  if (channel.parentId !== TICKET_CATEGORY_ID) return;
  if (!channel.name.startsWith('ticket-') && !channel.name.startsWith('claimed-')) return;
  
  if (claimedTickets.has(channel.id)) return;
  
  if (!isStaff(message.member)) return;
  
  claimedTickets.set(channel.id, message.author.id);
  
  const originalName = channel.name.replace(/^(ticket-|claimed-)/, '');
  const safeStaffName = message.author.username.toLowerCase().replace(/[^a-z0-9]/g, '');
  await channel.setName(`claimed-${safeStaffName}-${originalName}`).catch(() => {});
  
  const claimEmbed = new EmbedBuilder()
    .setTitle('✅ Ticket Claimed')
    .setDescription(`This ticket has been claimed by <@${message.author.id}>`)
    .setColor(0x00FF00)
    .setFooter({ text: BOT_NAME })
    .setTimestamp();
  
  await channel.send({ embeds: [claimEmbed] });
});

// ==================== EVENT: CLIENT READY ====================
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot logged in as ${c.user.tag}`);

  await c.user.setUsername(BOT_NAME).catch(() => {});
  await c.user.setActivity("PingPong's Hangout", { type: 3 });

  for (const guild of c.guilds.cache.values()) {
    try {
      const invites = await guild.invites.fetch();
      for (const invite of invites.values()) {
        inviteCache.set(invite.code, {
          inviterId: invite.inviter?.id,
          uses: invite.uses || 0
        });
      }
      console.log(`✅ Cached ${invites.size} invites for ${guild.name}`);
    } catch (error) {
      console.error(`Error caching invites for ${guild.name}:`, error);
    }
  }

  const commands = [
    new SlashCommandBuilder()
      .setName('ticket')
      .setDescription('Create a ticket panel')
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
      .setDescription('Send an embed via webhook')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))
      .addStringOption(opt => opt.setName('title').setDescription('Embed title').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Embed description').setRequired(true))
      .addStringOption(opt => opt.setName('color').setDescription('Hex color').setRequired(false)),

    new SlashCommandBuilder()
      .setName('dm')
      .setDescription('Send DM to a user')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
      .addStringOption(opt => opt.setName('message').setDescription('Message content').setRequired(true)),

    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a user')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),

    new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a user')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),

    new SlashCommandBuilder()
      .setName('timeout')
      .setDescription('Timeout a user')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('user').setDescription('User to timeout').setRequired(true))
      .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),

    new SlashCommandBuilder()
      .setName('untimeout')
      .setDescription('Remove timeout from a user')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('user').setDescription('User to untimeout').setRequired(true)),

    new SlashCommandBuilder()
      .setName('unban')
      .setDescription('Unban a user')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(opt => opt.setName('userid').setDescription('User ID to unban').setRequired(true))
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands.map(cmd => cmd.toJSON()) });
    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

// ==================== EVENT: INTERACTION CREATE ====================
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'ticket_type') {
      const selected = interaction.values[0];
      await createTicket(interaction, selected);
      return;
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'claim_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: 'Only staff can claim tickets!', ephemeral: true });
      }
      
      if (claimedTickets.has(interaction.channel.id)) {
        const claimedBy = claimedTickets.get(interaction.channel.id);
        return interaction.reply({ content: `This ticket is already claimed by <@${claimedBy}>!`, ephemeral: true });
      }
      
      claimedTickets.set(interaction.channel.id, interaction.user.id);
      
      const originalName = interaction.channel.name.replace(/^(ticket-|claimed-)/, '');
      const safeStaffName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
      await interaction.channel.setName(`claimed-${safeStaffName}-${originalName}`).catch(() => {});
      await interaction.reply({ content: `Ticket claimed by ${interaction.user}!` });
    }

    if (interaction.customId === 'rename_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: 'Only staff can rename tickets!', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId('rename_ticket_modal')
        .setTitle('Rename Ticket');

      const nameInput = new TextInputBuilder()
        .setCustomId('new_ticket_name')
        .setLabel('New Ticket Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. purchase-username')
        .setMaxLength(100)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(nameInput));

      await interaction.showModal(modal);
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
      
      const updatedButton = new ButtonBuilder()
        .setCustomId(`enter_giveaway_${giveawayId}`)
        .setLabel(`Enter Giveaway (${giveaway.participants.length})`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎉');
      
      const updatedRow = new ActionRowBuilder().addComponents(updatedButton);
      
      try {
        const giveawayMessage = interaction.message;
        if (giveawayMessage) {
          await giveawayMessage.edit({ components: [updatedRow] });
        }
      } catch (error) {
        console.error('Could not update button:', error);
      }
      
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

      modal.addComponents(new ActionRowBuilder().addComponents(suggestionInput));

      await interaction.showModal(modal);
    }

    if (interaction.customId.startsWith('invite_reward_claim_')) {
      const inviterId = interaction.customId.replace('invite_reward_claim_', '');
      
      if (interaction.user.id !== inviterId) {
        return interaction.reply({ content: 'This claim button is only for the inviter!', ephemeral: true });
      }
      
      await createTicket(interaction, 'invite-boost');
    }

    if (interaction.customId === 'appeal_button') {
      const modal = new ModalBuilder()
        .setCustomId('appeal_modal')
        .setTitle('Appeal Form');

      const appealInput = new TextInputBuilder()
        .setCustomId('appeal_text')
        .setLabel('Why should we unpunish you?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Write your appeal here...')
        .setMaxLength(1000)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(appealInput));

      await interaction.showModal(modal);
    }

    if (interaction.customId.startsWith('appeal_accept_')) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: 'Only staff can manage appeals!', ephemeral: true });
      }
      const userId = interaction.customId.replace('appeal_accept_', '');
      const member = interaction.guild.members.cache.get(userId);
      
      if (member && member.communicationDisabledUntil) {
        await member.timeout(null).catch(() => {});
      }
      
      try {
        await interaction.guild.members.unban(userId).catch(() => {});
      } catch (error) {}

      await interaction.reply({ content: 'Appeal accepted!', ephemeral: true });
    }

    if (interaction.customId.startsWith('appeal_deny_')) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: 'Only staff can manage appeals!', ephemeral: true });
      }
      await interaction.reply({ content: 'Appeal denied.', ephemeral: true });
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

      const channel = interaction.guild.channels.cache.get(SUGGESTIONS_LOGS_CHANNEL_ID);
      if (channel) {
        await channel.send({ embeds: [suggestionEmbed] });
        await interaction.reply({ content: 'Suggestion submitted!', ephemeral: true });
      }
    }

    if (interaction.customId === 'rename_ticket_modal') {
      const newName = interaction.fields.getTextInputValue('new_ticket_name');
      
      try {
        await interaction.channel.setName(newName);
        await interaction.reply({ content: 'Ticket renamed!', ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: 'Could not rename ticket.', ephemeral: true });
      }
    }

    if (interaction.customId === 'appeal_modal') {
      const appealText = interaction.fields.getTextInputValue('appeal_text');
      
      const appealEmbed = new EmbedBuilder()
        .setTitle('📝 New Appeal')
        .setDescription(appealText)
        .setColor(0xFFA500)
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      const acceptButton = new ButtonBuilder()
        .setCustomId(`appeal_accept_${interaction.user.id}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');

      const denyButton = new ButtonBuilder()
        .setCustomId(`appeal_deny_${interaction.user.id}`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');

      const row = new ActionRowBuilder().addComponents(acceptButton, denyButton);

      const appealsChannel = interaction.guild.channels.cache.get(APPEALS_LOGS_CHANNEL_ID);
      if (appealsChannel) {
        await appealsChannel.send({ embeds: [appealEmbed], components: [row] });
        await interaction.reply({ content: 'Your appeal has been submitted!', ephemeral: true });
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
        .setDescription(`**Hosted by:** <@${interaction.user.id}>\n**Prize:** ${prize}\n**Description:** ${description}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n**Winners:** ${winnersCount}\n\nClick the button below to enter!`)
        .setColor(0xFFD700)
        .setFooter({ text: 'Good luck!' });

      const enterButton = new ButtonBuilder()
        .setCustomId(`enter_giveaway_${giveawayId}`)
        .setLabel('Enter Giveaway (0)')
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
        let webhook = webhooks.find(wh => wh.name === BOT_NAME);
        if (!webhook) {
          webhook = await channel.createWebhook({
            name: BOT_NAME,
            avatar: client.user.displayAvatarURL()
          });
        }
        const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
        await webhookClient.send({ embeds: [embed] });
        await interaction.reply({ content: 'Embed sent!', ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: 'Could not send embed.', ephemeral: true });
      }
    }

    if (commandName === 'dm') {
      const user = interaction.options.getUser('user');
      const message = interaction.options.getString('message');
      
      const dmEmbed = new EmbedBuilder()
        .setTitle("PingPong's Hangout")
        .setDescription(message)
        .setColor(0x00AE86)
        .setFooter({ text: BOT_NAME })
        .setTimestamp();
      
      const serverButton = new ButtonBuilder()
        .setLabel("Sent from PingPong's Hangout")
        .setStyle(ButtonStyle.Link)
        .setURL(SERVER_INVITE);
      
      const row = new ActionRowBuilder().addComponents(serverButton);
      
      try {
        await user.send({ embeds: [dmEmbed], components: [row] });
        await interaction.reply({ content: `DM sent to ${user.tag}!`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: 'Could not send DM.', ephemeral: true });
      }
    }

    if (commandName === 'ban') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) {
        return interaction.reply({ content: 'User not found!', ephemeral: true });
      }

      try {
        const banEmbed = new EmbedBuilder()
          .setTitle('🔨 You have been banned!')
          .setDescription(`You've been banned.\nReason: ${reason}`)
          .setColor(0xFF0000)
          .setTimestamp();

        const appealButton = new ButtonBuilder()
          .setCustomId('appeal_button')
          .setLabel('Appeal')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📝');

        const row = new ActionRowBuilder().addComponents(appealButton);
        await user.send({ embeds: [banEmbed], components: [row] });
      } catch (error) {}

      await member.ban({ reason }).catch(() => {});
      await interaction.reply({ content: `Banned ${user.tag}!`, ephemeral: true });
    }

    if (commandName === 'kick') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) {
        return interaction.reply({ content: 'User not found!', ephemeral: true });
      }

      try {
        const kickEmbed = new EmbedBuilder()
          .setTitle('👢 You have been kicked!')
          .setDescription(`You've been kicked.\nReason: ${reason}`)
          .setColor(0xFFA500)
          .setTimestamp();

        const appealButton = new ButtonBuilder()
          .setCustomId('appeal_button')
          .setLabel('Appeal')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📝');

        const row = new ActionRowBuilder().addComponents(appealButton);
        await user.send({ embeds: [kickEmbed], components: [row] });
      } catch (error) {}

      await member.kick(reason).catch(() => {});
      await interaction.reply({ content: `Kicked ${user.tag}!`, ephemeral: true });
    }

    if (commandName === 'timeout') {
      const user = interaction.options.getUser('user');
      const minutes = interaction.options.getInteger('minutes');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) {
        return interaction.reply({ content: 'User not found!', ephemeral: true });
      }

      try {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('🔇 You have been timed out!')
          .setDescription(`You've been timed out for ${minutes} minutes.\nReason: ${reason}`)
          .setColor(0xFFFF00)
          .setTimestamp();

        const appealButton = new ButtonBuilder()
          .setCustomId('appeal_button')
          .setLabel('Appeal')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📝');

        const row = new ActionRowBuilder().addComponents(appealButton);
        await user.send({ embeds: [timeoutEmbed], components: [row] });
      } catch (error) {}

      await member.timeout(minutes * 60000, reason).catch(() => {});
      await interaction.reply({ content: `Timed out ${user.tag} for ${minutes} minutes!`, ephemeral: true });
    }

    if (commandName === 'untimeout') {
      const user = interaction.options.getUser('user');
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) {
        return interaction.reply({ content: 'User not found!', ephemeral: true });
      }

      await member.timeout(null).catch(() => {});
      await interaction.reply({ content: `Removed timeout from ${user.tag}!`, ephemeral: true });
    }

    if (commandName === 'unban') {
      const userId = interaction.options.getString('userid');
      
      try {
        await interaction.guild.members.unban(userId);
        await interaction.reply({ content: 'Unbanned!', ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: 'Could not unban.', ephemeral: true });
      }
    }
  }
});

// ==================== LOGIN ====================
client.login(process.env.DISCORD_TOKEN);
