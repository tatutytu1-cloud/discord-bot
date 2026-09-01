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
const STAFF_APPLICATIONS_PANEL_CHANNEL_ID = '1540766710167248916';
const STAFF_APPLICATIONS_LOGS_CHANNEL_ID = '1539969669811933204';
const WELCOME_GOODBYE_CHANNEL_ID = '1540717176913399829';
const INVITE_TRACKING_CHANNEL_ID = '1539999179609481366';
const APPEALS_LOGS_CHANNEL_ID = '1539969669811933204';

const TRIAL_STAFF_ROLE_ID = '1543370588725186672';
const TRIAL_ADMIN_ROLE_ID = '1543369605333131274';

const SERVER_INVITE = 'https://discord.gg/donutsells';

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
const staffApplications = new Map();
const inviteCache = new Map();

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

// ==================== STAFF APPLICATION FUNCTIONS ====================
async function openStaffApplicationModal(interaction, roleType) {
  const modal = new ModalBuilder()
    .setCustomId(`staff_app_modal_${roleType}`)
    .setTitle('Staff Application');

  const ageInput = new TextInputBuilder()
    .setCustomId('age')
    .setLabel('1. How old are you?')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 16')
    .setMaxLength(3)
    .setRequired(true);

  const experienceInput = new TextInputBuilder()
    .setCustomId('experience')
    .setLabel('2. How long using Discord & Minecraft?')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 3 years')
    .setMaxLength(100)
    .setRequired(true);

  const previousExpInput = new TextInputBuilder()
    .setCustomId('previous_experience')
    .setLabel('3. Previous Community Management?')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe your experience...')
    .setMaxLength(1000)
    .setRequired(true);

  const aboutInput = new TextInputBuilder()
    .setCustomId('about')
    .setLabel('4. Tell us about yourself')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Tell us as much as you can...')
    .setMaxLength(1000)
    .setRequired(true);

  const activityInput = new TextInputBuilder()
    .setCustomId('activity')
    .setLabel('5. How active per day?')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 4-6 hours')
    .setMaxLength(100)
    .setRequired(true);

  const whyInput = new TextInputBuilder()
    .setCustomId('why')
    .setLabel('6. Why should we hire you?')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Your answer...')
    .setMaxLength(1000)
    .setRequired(true);

  const plusMinusInput = new TextInputBuilder()
    .setCustomId('plus_minus')
    .setLabel('7. Pluses & minuses?')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('List them...')
    .setMaxLength(1000)
    .setRequired(true);

  const inactivityInput = new TextInputBuilder()
    .setCustomId('inactivity')
    .setLabel('8. Agree to inactivity term? (Yes/No)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Yes or No')
    .setMaxLength(3)
    .setRequired(true);

  const behaviorInput = new TextInputBuilder()
    .setCustomId('behavior')
    .setLabel('9. Agree to behavior terms? (Yes/No)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Yes or No')
    .setMaxLength(3)
    .setRequired(true);

  const professionalInput = new TextInputBuilder()
    .setCustomId('professional')
    .setLabel('10. Promise to be professional? (Yes/No)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Yes or No')
    .setMaxLength(3)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(ageInput),
    new ActionRowBuilder().addComponents(experienceInput),
    new ActionRowBuilder().addComponents(previousExpInput),
    new ActionRowBuilder().addComponents(aboutInput),
    new ActionRowBuilder().addComponents(activityInput),
    new ActionRowBuilder().addComponents(whyInput),
    new ActionRowBuilder().addComponents(plusMinusInput),
    new ActionRowBuilder().addComponents(inactivityInput),
    new ActionRowBuilder().addComponents(behaviorInput),
    new ActionRowBuilder().addComponents(professionalInput)
  );

  await interaction.showModal(modal);
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

  // Invite tracking
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

// ==================== EVENT: CLIENT READY ====================
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot logged in as ${c.user.tag}`);

  await c.user.setUsername('DonutSells Manager').catch(console.error);
  await c.user.setActivity('DonutSMP Sells', { type: 3 });

  // Cache invites on startup
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
      .setName('staffapp')
      .setDescription('Create a staff application panel')
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
    await interaction.deferUpdate().catch(() => {});
    
    if (interaction.customId === 'ticket_type') {
      const selected = interaction.values[0];
      await createTicket(interaction, selected);
    }

    if (interaction.customId === 'staff_application_type') {
      const selected = interaction.values[0];
      await openStaffApplicationModal(interaction, selected);
    }
    return;
  }

  if (interaction.isButton()) {
    await interaction.deferUpdate().catch(() => {});

    if (interaction.customId === 'claim_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.editReply({ content: 'Only staff can claim tickets!' });
      }
      await interaction.channel.setName(`claimed-${interaction.user.username.toLowerCase()}-${interaction.channel.name.split('-').pop()}`);
      await interaction.editReply({ content: `Ticket claimed by ${interaction.user}!` });
    }

    if (interaction.customId === 'rename_ticket') {
      if (!isStaff(interaction.member)) {
        return interaction.editReply({ content: 'Only staff can rename tickets!' });
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
        return interaction.editReply({ content: 'Only staff can close tickets!' });
      }
      await closeTicket(interaction);
    }

    if (interaction.customId.startsWith('enter_giveaway_')) {
      const giveawayId = interaction.customId.split('_')[2];
      const giveaway = giveaways.get(giveawayId);
      if (!giveaway) {
        return interaction.editReply({ content: 'This giveaway has ended!' });
      }
      if (!giveaway.participants) giveaway.participants = [];
      if (giveaway.participants.includes(interaction.user.id)) {
        return interaction.editReply({ content: 'You are already entered!' });
      }
      giveaway.participants.push(interaction.user.id);
      await interaction.editReply({ content: 'You entered the giveaway! Good luck! 🎉' });
    }

    if (interaction.customId.startsWith('claim_giveaway_')) {
      const parts = interaction.customId.split('_');
      const winnerId = parts[parts.length - 1];
      if (interaction.user.id !== winnerId) {
        return interaction.editReply({ content: 'This claim button is not for you!' });
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
        return interaction.editReply({ content: 'This claim button is only for the inviter!' });
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

    if (interaction.customId.startsWith('staff_app_accept_')) {
      if (!isStaff(interaction.member)) {
        return interaction.editReply({ content: 'Only staff can manage applications!' });
      }
      const appId = interaction.customId.split('_').pop();
      const application = staffApplications.get(appId);
      if (!application) {
        return interaction.editReply({ content: 'Application not found!' });
      }
      const roleId = application.roleType === 'trial_staff' ? TRIAL_STAFF_ROLE_ID : TRIAL_ADMIN_ROLE_ID;
      const member = interaction.guild.members.cache.get(application.userId);
      if (member) {
        await member.roles.add(roleId).catch(() => {});
      }
      await interaction.editReply({ content: `Application accepted!` });
      staffApplications.delete(appId);
    }

    if (interaction.customId.startsWith('staff_app_deny_')) {
      if (!isStaff(interaction.member)) {
        return interaction.editReply({ content: 'Only staff can manage applications!' });
      }
      const appId = interaction.customId.split('_').pop();
      await interaction.editReply({ content: 'Application denied.' });
      staffApplications.delete(appId);
    }

    if (interaction.customId.startsWith('staff_app_open_ticket_')) {
      if (!isStaff(interaction.member)) {
        return interaction.editReply({ content: 'Only staff can open tickets!' });
      }
      const appId = interaction.customId.split('_').pop();
      const application = staffApplications.get(appId);
      if (!application) {
        return interaction.editReply({ content: 'Application not found!' });
      }

      const guild = interaction.guild;
      const user = guild.members.cache.get(application.userId);
      if (!user) {
        return interaction.editReply({ content: 'User not found!' });
      }

      const category = guild.channels.cache.get(STAFF_APP_TICKET_CATEGORY_ID);
      if (!category) {
        return interaction.editReply({ content: 'Category not found!' });
      }

      const safeUsername = user.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const channel = await guild.channels.create({
        name: `staff-app-${safeUsername}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
      });

      for (const roleId of STAFF_ROLE_IDS) {
        await channel.permissionOverwrites.create(roleId, {
          ViewChannel: true,
          SendMessages: true,
          ManageChannels: true
        }).catch(() => {});
      }

      await channel.send({ content: `<@${user.id}> Staff wants to talk about your application.` });
      await interaction.editReply({ content: `Ticket opened: ${channel}` });
    }

    if (interaction.customId.startsWith('appeal_accept_')) {
      if (!isStaff(interaction.member)) {
        return interaction.editReply({ content: 'Only staff can manage appeals!' });
      }
      const userId = interaction.customId.replace('appeal_accept_', '');
      const member = interaction.guild.members.cache.get(userId);
      
      if (member && member.communicationDisabledUntil) {
        await member.timeout(null).catch(() => {});
      }
      
      try {
        await interaction.guild.members.unban(userId).catch(() => {});
      } catch (error) {}

      await interaction.editReply({ content: `Appeal accepted!` });
    }

    if (interaction.customId.startsWith('appeal_deny_')) {
      if (!isStaff(interaction.member)) {
        return interaction.editReply({ content: 'Only staff can manage appeals!' });
      }
      await interaction.editReply({ content: 'Appeal denied.' });
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
        await interaction.reply({ content: `Ticket renamed!`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: 'Could not rename ticket.', ephemeral: true });
      }
    }

    if (interaction.customId.startsWith('staff_app_modal_')) {
      const roleType = interaction.customId.replace('staff_app_modal_', '');
      const age = interaction.fields.getTextInputValue('age');
      const experience = interaction.fields.getTextInputValue('experience');
      const previousExperience = interaction.fields.getTextInputValue('previous_experience');
      const about = interaction.fields.getTextInputValue('about');
      const activity = interaction.fields.getTextInputValue('activity');
      const why = interaction.fields.getTextInputValue('why');
      const plusMinus = interaction.fields.getTextInputValue('plus_minus');
      const inactivity = interaction.fields.getTextInputValue('inactivity');
      const behavior = interaction.fields.getTextInputValue('behavior');
      const professional = interaction.fields.getTextInputValue('professional');

      const roleLabel = roleType === 'trial_staff' ? 'Trial Staff' : 'Trial Admin';
      const appId = Date.now().toString();

      const applicationEmbed = new EmbedBuilder()
        .setTitle(`📝 Staff Application: ${roleLabel}`)
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setColor(0x3498DB)
        .addFields(
          { name: '1. How old are you?', value: age },
          { name: '2. How long using Discord & Minecraft?', value: experience },
          { name: '3. Previous Community Management?', value: previousExperience },
          { name: '4. Tell us about yourself', value: about },
          { name: '5. How active per day?', value: activity },
          { name: '6. Why should we hire you?', value: why },
          { name: '7. Pluses & minuses', value: plusMinus },
          { name: '8. Agree to inactivity term?', value: inactivity },
          { name: '9. Agree to behavior terms?', value: behavior },
          { name: '10. Promise to be professional?', value: professional }
        )
        .setTimestamp();

      const acceptButton = new ButtonBuilder()
        .setCustomId(`staff_app_accept_${appId}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');

      const denyButton = new ButtonBuilder()
        .setCustomId(`staff_app_deny_${appId}`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');
