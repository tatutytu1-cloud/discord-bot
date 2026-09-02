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

// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = 'https://dcatveajcltilgkjcwqa.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYXR2ZWFqY2x0aWxna2pjd3FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODM1NTM0NiwiZXhwIjoyMTAzOTMxMzQ2fQ.CrG3OVCRn_-lMDJ2gs_GDr0U25NFQ3FWoK2poX219wY';

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
const CASHOUT_PANEL_CHANNEL_ID = '1544425577577058444';
const RULES_CHANNEL_ID = '1539693023061876806';
const PRICES_CHANNEL_ID = '1539697766257659954';
const MEDIA_REQUIREMENTS_CHANNEL_ID = '1539693647443001454';
const REWARDS_INFO_CHANNEL_ID = '1539999315307667456';
const LEADERBOARD_CHANNEL_ID = '1544673976226414613';

const SERVER_INVITE = 'https://discord.gg/pingpongshangout';
const BOT_NAME = "PingPong's Hangout Manager";

// Sightengine API
const SIGHTENGINE_API_USER = '136018423';
const SIGHTENGINE_API_SECRET = 'JobAdkm7oXGYw3pz8DE2Hyz5UbCY2XxF';

// Reward values
const INVITE_REWARD_MONEY = 5;
const BOOST_REWARD_MONEY = 20;

// ==================== BAD WORDS FILTER ====================
const BAD_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'nigger', 'faggot',
  'retard', 'dick', 'pussy', 'whore', 'slut', 'bastard', 'damn',
  'motherfucker', 'cock', 'twat', 'wanker', 'prick', 'ass',
  'douche', 'dumbass', 'jackass', 'arse', 'bugger', 'bollocks',
  'wank', 'tosser', 'bellend', 'knob', 'crap', 'piss', 'hell',
  'idiot', 'moron', 'stupid', 'fool', 'loser', 'sucker', 'coward'
];

function containsBadWord(text) {
  const lower = text.toLowerCase();
  return BAD_WORDS.some(word => lower.includes(word));
}

// ==================== SIGHTENGINE AI FILTER ====================
async function checkToxicityWithSightengine(text) {
  try {
    const response = await fetch('https://api.sightengine.com/1.0/text/check.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        mode: 'standard',
        lang: 'en',
        api_user: SIGHTENGINE_API_USER,
        api_secret: SIGHTENGINE_API_SECRET
      })
    });

    const data = await response.json();
    
    const profanityMatches = data?.profanity?.matches?.length || 0;
    const insultMatches = data?.insult?.matches?.length || 0;
    const toxicityMatches = data?.toxicity?.matches?.length || 0;
    
    return profanityMatches + insultMatches + toxicityMatches > 0;
  } catch (error) {
    console.error('Sightengine error:', error);
    return null;
  }
}

// ==================== SUPABASE FUNCTIONS ====================
async function sbGetBalance(userId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/balances?user_id=eq.${userId}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        invites: data[0].invites || 0,
        boosts: data[0].boosts || 0,
        money: data[0].money || 0
      };
    }
    return null;
  } catch (error) {
    console.error('Supabase GET error:', error);
    return null;
  }
}

async function sbUpdateBalance(userId, invites, boosts, money) {
  try {
    const existing = await sbGetBalance(userId);
    if (existing) {
      await fetch(`${SUPABASE_URL}/rest/v1/balances?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invites, boosts, money })
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/balances`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, invites, boosts, money })
      });
    }
  } catch (error) {
    console.error('Supabase UPDATE error:', error);
  }
}

async function sbIsProcessed(messageId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/processed_rewards?message_id=eq.${messageId}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    const data = await response.json();
    return data && data.length > 0;
  } catch (error) {
    console.error('Supabase processed check error:', error);
    return false;
  }
}

async function sbMarkProcessed(messageId) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/processed_rewards`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message_id: messageId })
    });
  } catch (error) {
    console.error('Supabase mark processed error:', error);
  }
}

// ==================== TICKET TYPES ====================
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
async function createTicket(interaction, ticketType, extraMessage) {
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

  const description = extraMessage || 'Hello! Our Staff Team is currently reviewing your Ticket and will respond soon! After 12 hours of no response, please Ping someone from our Staff Team! Thank You!';

  const welcomeEmbed = new EmbedBuilder()
    .setTitle(`${emoji} ${label} Ticket`)
    .setDescription(description)
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

  const { channelId, prize, winnersCount, messageId, hosterId } = giveaway;
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

    const rerollButton = new ButtonBuilder()
      .setCustomId(`reroll_giveaway_${giveawayId}`)
      .setLabel('REROLL')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔄');

    const row = new ActionRowBuilder().addComponents(claimButton, rerollButton);
    await channel.send({ embeds: [winnerEmbed], components: [row] });
  }

  // Save winners to giveaway for reroll
  giveaway.winners = winners;
  giveaways.set(giveawayId, giveaway);
}

async function rerollGiveaway(giveawayId, interaction) {
  const giveaway = giveaways.get(giveawayId);
  if (!giveaway) {
    return interaction.reply({ content: 'Giveaway not found!', ephemeral: true });
  }

  // Check if user is staff or hoster
  if (!isStaff(interaction.member) && interaction.user.id !== giveaway.hosterId) {
    return interaction.reply({ content: 'Only staff or the giveaway hoster can reroll!', ephemeral: true });
  }

  const { channelId, prize, winnersCount, messageId, participants } = giveaway;
  const channel = client.channels.cache.get(channelId);
  if (!channel) return;

  if (!participants || participants.length === 0) {
    return interaction.reply({ content: 'No participants to reroll!', ephemeral: true });
  }

  // Remove previous winners from pool
  const previousWinners = giveaway.winners || [];
  const pool = participants.filter(id => !previousWinners.includes(id));
  
  if (pool.length === 0) {
    return interaction.reply({ content: 'No eligible participants for reroll!', ephemeral: true });
  }

  const winners = [];
  for (let i = 0; i < Math.min(winnersCount, pool.length); i++) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(randomIndex, 1)[0]);
  }

  for (const winnerId of winners) {
    const winnerEmbed = new EmbedBuilder()
      .setTitle('🎉 Giveaway Winner (Reroll)!')
      .setDescription(`<@${winnerId}> You've won the Giveaway! Prize: **${prize}**`)
      .setColor(0xFFD700);

    const claimButton = new ButtonBuilder()
      .setCustomId(`claim_giveaway_${giveawayId}_${winnerId}`)
      .setLabel('CLAIM')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🎉');

    const rerollButton = new ButtonBuilder()
      .setCustomId(`reroll_giveaway_${giveawayId}`)
      .setLabel('REROLL')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔄');

    const row = new ActionRowBuilder().addComponents(claimButton, rerollButton);
    await channel.send({ embeds: [winnerEmbed], components: [row] });
  }

  // Update winners
  giveaway.winners = [...(giveaway.winners || []), ...winners];
  giveaways.set(giveawayId, giveaway);

  await interaction.reply({ content: 'Giveaway rerolled!', ephemeral: true });
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

            const saveButton = new ButtonBuilder()
              .setCustomId(`invite_reward_save_${inviter.id}`)
              .setLabel('SAVE IT')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('💾');

            const row = new ActionRowBuilder().addComponents(claimButton, saveButton);
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

client.on(Events.InviteCreate, async (invite) => {
  inviteCache.set(invite.code, {
    inviterId: invite.inviter?.id,
    uses: invite.uses || 0
  });
});

client.on(Events.InviteDelete, async (invite) => {
  inviteCache.delete(invite.code);
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

// ==================== BOOST TRACKING ====================
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const oldBoosting = Boolean(oldMember.premiumSince);
  const newBoosting = Boolean(newMember.premiumSince);

  if (!oldBoosting && newBoosting) {
    const balance = await sbGetBalance(newMember.id);
    const currentBoosts = balance ? balance.boosts : 0;
    const currentMoney = balance ? balance.money : 0;
    const currentInvites = balance ? balance.invites : 0;
    
    await sbUpdateBalance(newMember.id, currentInvites, currentBoosts + 1, currentMoney + BOOST_REWARD_MONEY);
    console.log(`✅ ${newMember.user.tag} started boosting!`);
  }
});

// ==================== MESSAGE CREATE - AI FILTER + AUTO CLAIM ====================
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  
  const isToxic = await checkToxicityWithSightengine(message.content);
  if (isToxic === true) {
    await message.delete().catch(() => {});
    
    const warnEmbed = new EmbedBuilder()
      .setTitle('⚠️ Message Removed')
      .setDescription('Your message was flagged by AI as inappropriate.')
      .setColor(0xFF0000)
      .setFooter({ text: BOT_NAME })
      .setTimestamp();
    
    await message.author.send({ embeds: [warnEmbed] }).catch(() => {});
    return;
  }
  
  if (containsBadWord(message.content)) {
    await message.delete().catch(() => {});
    
    const warnEmbed = new EmbedBuilder()
      .setTitle('⚠️ Message Removed')
      .setDescription('Your message was removed for containing inappropriate language.')
      .setColor(0xFF0000)
      .setFooter({ text: BOT_NAME })
      .setTimestamp();
    
    await message.author.send({ embeds: [warnEmbed] }).catch(() => {});
    return;
  }

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
        inviteCache.set(invite.code, { inviterId: invite.inviter?.id, uses: invite.uses || 0 });
      }
    } catch (error) {}
  }

  // Cool panels
  try {
    const rulesChannel = c.channels.cache.get(RULES_CHANNEL_ID);
    if (rulesChannel) {
      const embed = new EmbedBuilder().setTitle('📜 **SERVER RULES** 📜').setDescription('@everyone\n\n**Please read the rules below.**\n\n🚫 **Advertising**\nWe do not allow any forms of advertising, without Staff Approval.\n\n👮 **Respect the staff team**\nBe polite to our staff team. They\'re here to help. Use manners when asking for support.\n\n📢 **Mentions**\nWe do not allow mass mentions, or randomly pinging users without reason.\n\n🆘 **Support**\nWhen asking for support please ensure you are giving us as much information as you can including screenshots, this will help us get to the root of your issue!\n\n🚫 **Discrimination not tolerated**\nWe do not tolerate any form of racism, homophobia or sexism or generally any other -ism or phobia.\n\n📧 **Spamming**\nSpamming, Character Flooding, Voguer language, Cussing, and harassing any members/channels on our Discord is prohibited.\n\n🚫 **Don\'t ping staff!**\nUnless its urgent, pinging staff when you opened a ticket will make us not answer for longer.\n\n🔧 **Use support channels for help**\nOpen a ticket for help, we have a turn around time of up to 48 hours for some tickets when busy.').setColor(0xFF0000).setFooter({ text: BOT_NAME }).setTimestamp();
      await rulesChannel.send({ embeds: [embed] });
    }
  } catch (error) {}

  try {
    const pricesChannel = c.channels.cache.get(PRICES_CHANNEL_ID);
    if (pricesChannel) {
      const embed = new EmbedBuilder().setTitle('💰 **PRICES** 💰').setDescription('These are the prices we offer for now. Each day can bring discounts or discount codes. Check our Promo Codes Channel everyday to be well informed.\n\n**SELL**\n50M - 1.5$\n100M - 3$\n150M - 5$\n200M - 6.5$\n250M - 7.5$\n500M - 13$\n1B - 26$\nElytra (NON DUPED!) - 13$\n\nWe accept PayPal/Card/Giftcards/LTC/BTC/Stripe\n\nIf you are interested, please open a ***ticket.***\n\n**BUY**\n1B/14$').setColor(0xFFD700).setFooter({ text: BOT_NAME }).setTimestamp();
      await pricesChannel.send({ embeds: [embed] });
    }
  } catch (error) {}

  try {
    const mediaChannel = c.channels.cache.get(MEDIA_REQUIREMENTS_CHANNEL_ID);
    if (mediaChannel) {
      const embed = new EmbedBuilder().setTitle('📸 **MEDIA REQUIREMENTS** 📸').setDescription('**These are the current Media Requirements. These can change depending on the spot availability.**\n\n📺 At least **500 subscribers** when posting on YouTube.\n\n📱 At least **1000 followers** when posting on TikTok or Instagram.\n\n🎬 Post at least **2 videos per week**.\n\n✅ Need to have **verified Discord account** (Email Address).\n\n🎮 Play on **DonutSMP**.\n\n🔗 Put our **Discord server link** visible on screen during videos/streams for full duration and make it completely visible and readable.\n\n📝 Put our **Discord server link** in your channel BIO.').setColor(0x9B59B6).setFooter({ text: BOT_NAME }).setTimestamp();
      await mediaChannel.send({ embeds: [embed] });
    }
  } catch (error) {}

  try {
    const rewardsChannel = c.channels.cache.get(REWARDS_INFO_CHANNEL_ID);
    if (rewardsChannel) {
      const embed = new EmbedBuilder().setTitle('🎁 **HOW TO EARN REWARDS** 🎁').setDescription('**You can earn saved rewards in two ways:**\n\n💌 **Invite Someone** – When a user joins through YOUR invite link, you get 1 Invite Reward (5M).\n\n🚀 **Boost The Server** – When you boost our server, you get 1 Boost Reward (20M).\n\n**Saving Your Rewards:**\n\nWhen someone joins through your link, you\'ll see two buttons:\n✅ **CLAIM** – Opens a ticket immediately to claim your reward.\n💾 **SAVE IT** – Saves your reward to your balance for later.\n\n💡 *Pro Tip: Save up multiple rewards and cash them out all at once!*\n\n**Checking Your Balance:**\n\nHead over to the Cashout Panel channel and click **CHECK BALANCE**.\n\nYou\'ll see your saved invites, boosts and total balance.\n\n**Cashing Out:**\n\nWhen you\'re ready to claim your rewards, go to the Cashout Panel and click **CASH OUT**.\n\nA ticket will be opened with your total balance for staff to process.\n\n🎉 **Happy Earning!** 🎉').setColor(0x9B59B6).setFooter({ text: BOT_NAME }).setTimestamp();
      await rewardsChannel.send({ embeds: [embed] });
    }
  } catch (error) {}

  try {
    const ticketPanelChannel = c.channels.cache.get(TICKET_PANEL_CHANNEL_ID);
    if (ticketPanelChannel) {
      const embed = new EmbedBuilder().setTitle('🎫 **CREATE A TICKET** 🎫').setDescription('**Need help? Select a category below and our Staff Team will assist you!**\n\n✨ **How it works:**\n1️⃣ Choose the type of support you need from the dropdown menu\n2️⃣ A private ticket channel will be created for you\n3️⃣ Our Staff Team will claim and assist you shortly\n\n⏳ *Please wait patiently after creating your ticket.*').setColor(0x00AE86).setFooter({ text: BOT_NAME }).setTimestamp();
      const select = new StringSelectMenuBuilder().setCustomId('ticket_type').setPlaceholder('🔍 Choose a ticket type...').addOptions([
        { label: '💸 Purchase', value: 'purchase' }, { label: '🌐 Support', value: 'support' }, { label: '📸 Media', value: 'media' }, { label: '👥 Partnership', value: 'partnership' }, { label: '💎 Sponsor', value: 'sponsor' }, { label: '🎁 Invite/Boost Reward Claim', value: 'invite-boost' }
      ]);
      const row = new ActionRowBuilder().addComponents(select);
      await ticketPanelChannel.send({ embeds: [embed], components: [row] });
    }
  } catch (error) {}

  try {
    const suggestionPanelChannel = c.channels.cache.get(SUGGESTION_PANEL_CHANNEL_ID);
    if (suggestionPanelChannel) {
      const embed = new EmbedBuilder().setTitle('💡 **SUGGESTIONS** 💡').setDescription('**Got an idea to improve our server or bot? We\'d love to hear it!**\n\n✨ **How to submit:**\n1️⃣ Click the button below\n2️⃣ Write your suggestion in the form\n3️⃣ Submit it for our Staff Team to review\n\n🌟 *Your feedback helps us grow!*').setColor(0x9B59B6).setFooter({ text: BOT_NAME }).setTimestamp();
      const suggestButton = new ButtonBuilder().setCustomId('open_suggestion_modal').setLabel('Suggest').setStyle(ButtonStyle.Primary).setEmoji('💡');
      const row = new ActionRowBuilder().addComponents(suggestButton);
      await suggestionPanelChannel.send({ embeds: [embed], components: [row] });
    }
  } catch (error) {}

  try {
    const cashoutChannel = c.channels.cache.get(CASHOUT_PANEL_CHANNEL_ID);
    if (cashoutChannel) {
      const cashoutEmbed = new EmbedBuilder().setTitle('💰 **REWARD CASHOUT** 💰').setDescription('✨ **Click the button below to check your balance or cash out!** ✨\n\n**Available actions:**\n🔄 **CASH OUT** – Choose amount and open a ticket\n📊 **CHECK BALANCE** – Shows your saved invites, boosts and balance\n\n🎉 *Good luck and thank you for supporting our community!* 🎉').setColor(0x9B59B6).setFooter({ text: BOT_NAME }).setTimestamp();
      const cashoutButton = new ButtonBuilder().setCustomId('cashout_button').setLabel('CASH OUT').setStyle(ButtonStyle.Success).setEmoji('💰');
      const checkBalanceButton = new ButtonBuilder().setCustomId('check_balance_button').setLabel('CHECK BALANCE').setStyle(ButtonStyle.Primary).setEmoji('📊');
      const row = new ActionRowBuilder().addComponents(cashoutButton, checkBalanceButton);
      await cashoutChannel.send({ embeds: [cashoutEmbed], components: [row] });
    }
  } catch (error) {}

  // Leaderboard panels
  try {
    const lbChannel = c.channels.cache.get(LEADERBOARD_CHANNEL_ID);
    if (lbChannel) {
      const inviteEmbed = new EmbedBuilder()
        .setTitle('💌 **TOP 5 INVITES**')
        .setDescription('Loading leaderboard...')
        .setColor(0x3498DB)
        .setFooter({ text: BOT_NAME })
        .setTimestamp();
      const invitePositionButton = new ButtonBuilder()
        .setCustomId('lb_invite_position')
        .setLabel('My Position')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📊');
      const inviteRow = new ActionRowBuilder().addComponents(invitePositionButton);
      await lbChannel.send({ embeds: [inviteEmbed], components: [inviteRow] });

      const boostEmbed = new EmbedBuilder()
        .setTitle('🚀 **TOP 5 BOOSTS**')
        .setDescription('Loading leaderboard...')
        .setColor(0xE74C3C)
        .setFooter({ text: BOT_NAME })
        .setTimestamp();
      const boostPositionButton = new ButtonBuilder()
        .setCustomId('lb_boost_position')
        .setLabel('My Position')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📊');
      const boostRow = new ActionRowBuilder().addComponents(boostPositionButton);
      await lbChannel.send({ embeds: [boostEmbed], components: [boostRow] });

      const moneyEmbed = new EmbedBuilder()
        .setTitle('💰 **TOP 5 MONEY**')
        .setDescription('Loading leaderboard...')
        .setColor(0xF1C40F)
        .setFooter({ text: BOT_NAME })
        .setTimestamp();
      const moneyPositionButton = new ButtonBuilder()
        .setCustomId('lb_money_position')
        .setLabel('My Position')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📊');
      const moneyRow = new ActionRowBuilder().addComponents(moneyPositionButton);
      await lbChannel.send({ embeds: [moneyEmbed], components: [moneyRow] });
    }
  } catch (error) {}

  const commands = [
    new SlashCommandBuilder().setName('ticket').setDescription('Create a ticket panel').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('suggest').setDescription('Create a suggestion panel').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('gcreate').setDescription('Create a giveaway').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(opt => opt.setName('name').setDescription('Giveaway name').setRequired(true))
      .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
      .addStringOption(opt => opt.setName('prize').setDescription('Prize description').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Giveaway description').setRequired(false))
      .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(false)),
    new SlashCommandBuilder().setName('embed').setDescription('Send an embed via webhook').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))
      .addStringOption(opt => opt.setName('title').setDescription('Embed title').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Embed description').setRequired(true))
      .addStringOption(opt => opt.setName('color').setDescription('Hex color').setRequired(false)),
    new SlashCommandBuilder().setName('dm').setDescription('Send DM to a user').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
      .addStringOption(opt => opt.setName('message').setDescription('Message content').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Delete a number of messages').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addIntegerOption(opt => opt.setName('count').setDescription('Number of messages to delete').setRequired(true)),
    new SlashCommandBuilder().setName('ban').setDescription('Ban a user').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),
    new SlashCommandBuilder().setName('kick').setDescription('Kick a user').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),
    new SlashCommandBuilder().setName('timeout').setDescription('Timeout a user').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('user').setDescription('User to timeout').setRequired(true))
      .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),
    new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout from a user').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('user').setDescription('User to untimeout').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Unban a user').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(opt => opt.setName('userid').setDescription('User ID to unban').setRequired(true)),
    new SlashCommandBuilder().setName('baladd').setDescription('Add money (M) to a user').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('user').setDescription('User to add money to').setRequired(true))
      .addIntegerOption(opt => opt.setName('amount').setDescription('Amount in M').setRequired(true)),
    new SlashCommandBuilder().setName('balremove').setDescription('Remove money (M) from a user').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('user').setDescription('User to remove money from').setRequired(true))
      .addIntegerOption(opt => opt.setName('amount').setDescription('Amount in M').setRequired(true)),
    new SlashCommandBuilder().setName('lb').setDescription('Show your position in leaderboards')
      .addStringOption(opt => opt.setName('type').setDescription('Leaderboard type').setRequired(true)
        .addChoices(
          { name: 'Invites', value: 'invite' },
          { name: 'Boosts', value: 'boost' },
          { name: 'Money', value: 'money' }
        ))
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
      if (!isStaff(interaction.member)) return interaction.reply({ content: 'Only staff can claim tickets!', ephemeral: true });
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
      if (!isStaff(interaction.member)) return interaction.reply({ content: 'Only staff can rename tickets!', ephemeral: true });
      const modal = new ModalBuilder().setCustomId('rename_ticket_modal').setTitle('Rename Ticket');
      const nameInput = new TextInputBuilder().setCustomId('new_ticket_name').setLabel('New Ticket Name').setStyle(TextInputStyle.Short).setPlaceholder('e.g. purchase-username').setMaxLength(100).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
      await interaction.showModal(modal);
    }

    if (interaction.customId === 'close_ticket') {
      if (!isStaff(interaction.member)) return interaction.reply({ content: 'Only staff can close tickets!', ephemeral: true });
      await closeTicket(interaction);
    }

    if (interaction.customId.startsWith('enter_giveaway_')) {
      const giveawayId = interaction.customId.split('_')[2];
      const giveaway = giveaways.get(giveawayId);
      if (!giveaway) return interaction.reply({ content: 'This giveaway has ended!', ephemeral: true });
      if (!giveaway.participants) giveaway.participants = [];
      if (giveaway.participants.includes(interaction.user.id)) return interaction.reply({ content: 'You are already entered!', ephemeral: true });
      giveaway.participants.push(interaction.user.id);
      const updatedButton = new ButtonBuilder().setCustomId(`enter_giveaway_${giveawayId}`).setLabel(`Enter Giveaway (${giveaway.participants.length})`).setStyle(ButtonStyle.Primary).setEmoji('🎉');
      const updatedRow = new ActionRowBuilder().addComponents(updatedButton);
      try { await interaction.message.edit({ components: [updatedRow] }); } catch (error) {}
      await interaction.reply({ content: 'You entered the giveaway! Good luck! 🎉', ephemeral: true });
    }

    if (interaction.customId.startsWith('claim_giveaway_')) {
      const parts = interaction.customId.split('_');
      const winnerId = parts[parts.length - 1];
      if (interaction.user.id !== winnerId) return interaction.reply({ content: 'This claim button is not for you!', ephemeral: true });
      await createTicket(interaction, 'claim');
    }

    if (interaction.customId.startsWith('reroll_giveaway_')) {
      const giveawayId = interaction.customId.replace('reroll_giveaway_', '');
      await rerollGiveaway(giveawayId, interaction);
    }

    if (interaction.customId === 'open_suggestion_modal') {
      const modal = new ModalBuilder().setCustomId('suggestion_modal').setTitle('Submit a Suggestion');
      const suggestionInput = new TextInputBuilder().setCustomId('suggestion_text').setLabel('Your Suggestion').setStyle(TextInputStyle.Paragraph).setPlaceholder('Write your suggestion here...').setMaxLength(1000).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(suggestionInput));
      await interaction.showModal(modal);
    }

    if (interaction.customId.startsWith('invite_reward_claim_')) {
      const inviterId = interaction.customId.replace('invite_reward_claim_', '');
      if (interaction.user.id !== inviterId) return interaction.reply({ content: 'This claim button is only for the inviter!', ephemeral: true });
      
      const messageId = interaction.message.id;
      const isProcessed = await sbIsProcessed(messageId);
      if (isProcessed) {
        return interaction.reply({ content: 'This reward has already been claimed or saved!', ephemeral: true });
      }
      await sbMarkProcessed(messageId);
      
      const balance = await sbGetBalance(interaction.user.id);
      const totalInvites = balance ? balance.invites : 0;
      const totalBoosts = balance ? balance.boosts : 0;
      const totalMoney = balance ? balance.money : 0;
      const extraMessage = `💌 **INVITE CLAIM**\n<@${interaction.user.id}> wants to claim their invite reward.\n💌 Saved Invites: ${totalInvites}\n🚀 Saved Boosts: ${totalBoosts}\n💰 **Saved Balance:** ${totalMoney}M`;
      await createTicket(interaction, 'invite-boost', extraMessage);
    }

    if (interaction.customId.startsWith('invite_reward_save_')) {
      const inviterId = interaction.customId.replace('invite_reward_save_', '');
      if (interaction.user.id !== inviterId) return interaction.reply({ content: 'This button is only for the inviter!', ephemeral: true });
      
      const messageId = interaction.message.id;
      const isProcessed = await sbIsProcessed(messageId);
      if (isProcessed) {
        return interaction.reply({ content: 'This reward has already been claimed or saved!', ephemeral: true });
      }
      await sbMarkProcessed(messageId);
      
      const balance = await sbGetBalance(interaction.user.id);
      const currentInvites = balance ? balance.invites : 0;
      const currentBoosts = balance ? balance.boosts : 0;
      const currentMoney = balance ? balance.money : 0;
      
      await sbUpdateBalance(interaction.user.id, currentInvites + 1, currentBoosts, currentMoney + INVITE_REWARD_MONEY);
      
      await interaction.reply({ content: `You saved your invite reward! Saved invites: **${currentInvites + 1}**\n💰 **Saved Balance:** ${currentMoney + INVITE_REWARD_MONEY}M`, ephemeral: true });
    }

    if (interaction.customId === 'cashout_button') {
      const balance = await sbGetBalance(interaction.user.id);
      const totalMoney = balance ? balance.money : 0;
      if (totalMoney <= 0) return interaction.reply({ content: 'You have no balance to cash out.', ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId('cashout_amount_modal')
        .setTitle('Cash Out');

      const amountInput = new TextInputBuilder()
        .setCustomId('cashout_amount')
        .setLabel(`How much do you want to cash out? (Max: ${totalMoney}M)`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. 25')
        .setMaxLength(10)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(amountInput));

      await interaction.showModal(modal);
    }

    if (interaction.customId === 'check_balance_button') {
      const balance = await sbGetBalance(interaction.user.id);
      const totalInvites = balance ? balance.invites : 0;
      const totalBoosts = balance ? balance.boosts : 0;
      const totalMoney = balance ? balance.money : 0;
      const balanceEmbed = new EmbedBuilder()
        .setTitle('📊 **Your Balance**')
        .setDescription(
          `💌 **Saved Invites:** ${totalInvites}\n` +
          `🚀 **Saved Boosts:** ${totalBoosts}\n\n` +
          `💰 **SAVED BALANCE - ${totalMoney}M**`
        )
        .setColor(0x9B59B6)
        .setFooter({ text: BOT_NAME })
        .setTimestamp();
      await interaction.reply({ embeds: [balanceEmbed], ephemeral: true });
    }

    if (interaction.customId === 'lb_invite_position') {
      await interaction.reply({ content: 'Leaderboard positions are temporarily unavailable.', ephemeral: true });
    }

    if (interaction.customId === 'lb_boost_position') {
      await interaction.reply({ content: 'Leaderboard positions are temporarily unavailable.', ephemeral: true });
    }

    if (interaction.customId === 'lb_money_position') {
      await interaction.reply({ content: 'Leaderboard positions are temporarily unavailable.', ephemeral: true });
    }

    if (interaction.customId === 'appeal_button') {
      const modal = new ModalBuilder().setCustomId('appeal_modal').setTitle('Appeal Form');
      const appealInput = new TextInputBuilder().setCustomId('appeal_text').setLabel('Why should we unpunish you?').setStyle(TextInputStyle.Paragraph).setPlaceholder('Write your appeal here...').setMaxLength(1000).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(appealInput));
      await interaction.showModal(modal);
    }

    if (interaction.customId.startsWith('appeal_accept_')) {
      if (!isStaff(interaction.member)) return interaction.reply({ content: 'Only staff can manage appeals!', ephemeral: true });
      const userId = interaction.customId.replace('appeal_accept_', '');
      const member = interaction.guild.members.cache.get(userId);
      if (member && member.communicationDisabledUntil) await member.timeout(null).catch(() => {});
      try { await interaction.guild.members.unban(userId).catch(() => {}); } catch (error) {}
      await interaction.reply({ content: 'Appeal accepted!', ephemeral: true });
    }

    if (interaction.customId.startsWith('appeal_deny_')) {
      if (!isStaff(interaction.member)) return interaction.reply({ content: 'Only staff can manage appeals!', ephemeral: true });
      await interaction.reply({ content: 'Appeal denied.', ephemeral: true });
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'suggestion_modal') {
      const suggestion = interaction.fields.getTextInputValue('suggestion_text');
      const suggestionEmbed = new EmbedBuilder().setTitle('💡 New Suggestion').setDescription(suggestion).setColor(0x9B59B6).setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() }).setTimestamp();
      const channel = interaction.guild.channels.cache.get(SUGGESTIONS_LOGS_CHANNEL_ID);
      if (channel) { await channel.send({ embeds: [suggestionEmbed] }); await interaction.reply({ content: 'Suggestion submitted!', ephemeral: true }); }
    }
    if (interaction.customId === 'rename_ticket_modal') {
      const newName = interaction.fields.getTextInputValue('new_ticket_name');
      try { await interaction.channel.setName(newName); await interaction.reply({ content: 'Ticket renamed!', ephemeral: true }); } catch (error) { await interaction.reply({ content: 'Could not rename ticket.', ephemeral: true }); }
    }
    if (interaction.customId === 'appeal_modal') {
      const appealText = interaction.fields.getTextInputValue('appeal_text');
      const appealEmbed = new EmbedBuilder().setTitle('📝 New Appeal').setDescription(appealText).setColor(0xFFA500).setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() }).setTimestamp();
      const acceptButton = new ButtonBuilder().setCustomId(`appeal_accept_${interaction.user.id}`).setLabel('Accept').setStyle(ButtonStyle.Success).setEmoji('✅');
      const denyButton = new ButtonBuilder().setCustomId(`appeal_deny_${interaction.user.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger).setEmoji('❌');
      const row = new ActionRowBuilder().addComponents(acceptButton, denyButton);
      const appealsChannel = interaction.guild.channels.cache.get(APPEALS_LOGS_CHANNEL_ID);
      if (appealsChannel) { await appealsChannel.send({ embeds: [appealEmbed], components: [row] }); await interaction.reply({ content: 'Your appeal has been submitted!', ephemeral: true }); }
    }
    if (interaction.customId === 'cashout_amount_modal') {
      const amountStr = interaction.fields.getTextInputValue('cashout_amount');
      const amount = parseInt(amountStr);
      
      if (isNaN(amount) || amount <= 0) {
        return interaction.reply({ content: 'Please enter a valid number.', ephemeral: true });
      }
      
      const balance = await sbGetBalance(interaction.user.id);
      const currentMoney = balance ? balance.money : 0;
      if (amount > currentMoney) {
        return interaction.reply({ content: `You only have ${currentMoney}M. Please enter a smaller amount.`, ephemeral: true });
      }
      
      const currentInvites = balance ? balance.invites : 0;
      const currentBoosts = balance ? balance.boosts : 0;
      await sbUpdateBalance(interaction.user.id, currentInvites, currentBoosts, currentMoney - amount);
      
      const extraMessage = `💰 **CASH OUT**\n<@${interaction.user.id}> wants to cash out **${amount}M**.\n💌 Saved Invites: ${currentInvites}\n🚀 Saved Boosts: ${currentBoosts}\n💰 **Remaining Balance:** ${currentMoney - amount}M`;
      await createTicket(interaction, 'invite-boost', extraMessage);
    }
  }

  if (interaction.isCommand()) {
    const { commandName } = interaction;

    if (commandName === 'ticket') {
      const embed = new EmbedBuilder().setTitle('🎫 **CREATE A TICKET** 🎫').setDescription('**Need help? Select a category below and our Staff Team will assist you!**\n\n✨ **How it works:**\n1️⃣ Choose the type of support you need from the dropdown menu\n2️⃣ A private ticket channel will be created for you\n3️⃣ Our Staff Team will claim and assist you shortly\n\n⏳ *Please wait patiently after creating your ticket.*').setColor(0x00AE86).setFooter({ text: BOT_NAME }).setTimestamp();
      const select = new StringSelectMenuBuilder().setCustomId('ticket_type').setPlaceholder('🔍 Choose a ticket type...').addOptions([
        { label: '💸 Purchase', value: 'purchase' }, { label: '🌐 Support', value: 'support' }, { label: '📸 Media', value: 'media' }, { label: '👥 Partnership', value: 'partnership' }, { label: '💎 Sponsor', value: 'sponsor' }, { label: '🎁 Invite/Boost Reward Claim', value: 'invite-boost' }
      ]);
      const row = new ActionRowBuilder().addComponents(select);
      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: 'Ticket panel created!', ephemeral: true });
    }

    if (commandName === 'suggest') {
      const embed = new EmbedBuilder().setTitle('💡 **SUGGESTIONS** 💡').setDescription('**Got an idea to improve our server or bot? We\'d love to hear it!**\n\n✨ **How to submit:**\n1️⃣ Click the button below\n2️⃣ Write your suggestion in the form\n3️⃣ Submit it for our Staff Team to review\n\n🌟 *Your feedback helps us grow!*').setColor(0x9B59B6).setFooter({ text: BOT_NAME }).setTimestamp();
      const suggestButton = new ButtonBuilder().setCustomId('open_suggestion_modal').setLabel('Suggest').setStyle(ButtonStyle.Primary).setEmoji('💡');
      const row = new ActionRowBuilder().addComponents(suggestButton);
      await interaction.channel.send({ embeds: [embed], components: [row] });
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
      const embed = new EmbedBuilder().setTitle(`🎉 ${name}`).setDescription(`**Hosted by:** <@${interaction.user.id}>\n**Prize:** ${prize}\n**Description:** ${description}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n**Winners:** ${winnersCount}\n\nClick the button below to enter!`).setColor(0xFFD700).setFooter({ text: 'Good luck!' });
      const enterButton = new ButtonBuilder().setCustomId(`enter_giveaway_${giveawayId}`).setLabel('Enter Giveaway (0)').setStyle(ButtonStyle.Primary).setEmoji('🎉');
      const row = new ActionRowBuilder().addComponents(enterButton);
      const giveawayChannel = interaction.guild.channels.cache.get(GIVEAWAY_CHANNEL_ID);
      if (!giveawayChannel) return interaction.reply({ content: 'Giveaway channel not found!', ephemeral: true });
      const msg = await giveawayChannel.send({ embeds: [embed], components: [row] });
      giveaways.set(giveawayId, { channelId: giveawayChannel.id, messageId: msg.id, prize, winnersCount, participants: [], hosterId: interaction.user.id });
      setTimeout(() => endGiveaway(giveawayId), duration * 60000);
      await interaction.reply({ content: 'Giveaway created!', ephemeral: true });
    }

    if (commandName === 'embed') {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const colorHex = interaction.options.getString('color') || '#5865F2';
      const color = parseInt(colorHex.replace('#', ''), 16);
      const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color);
      try {
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find(wh => wh.name === BOT_NAME);
        if (!webhook) webhook = await channel.createWebhook({ name: BOT_NAME, avatar: client.user.displayAvatarURL() });
        const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
        await webhookClient.send({ embeds: [embed] });
        await interaction.reply({ content: 'Embed sent!', ephemeral: true });
      } catch (error) { await interaction.reply({ content: 'Could not send embed.', ephemeral: true }); }
    }

    if (commandName === 'dm') {
      const user = interaction.options.getUser('user');
      const message = interaction.options.getString('message');
      const dmEmbed = new EmbedBuilder().setTitle("PingPong's Hangout").setDescription(message).setColor(0x00AE86).setFooter({ text: BOT_NAME }).setTimestamp();
      const serverButton = new ButtonBuilder().setLabel("Sent from PingPong's Hangout").setStyle(ButtonStyle.Link).setURL(SERVER_INVITE);
      const row = new ActionRowBuilder().addComponents(serverButton);
      try { await user.send({ embeds: [dmEmbed], components: [row] }); await interaction.reply({ content: `DM sent to ${user.tag}!`, ephemeral: true }); } catch (error) { await interaction.reply({ content: 'Could not send DM.', ephemeral: true }); }
    }

    if (commandName === 'clear') {
      const count = interaction.options.getInteger('count');
      if (count < 1 || count > 100) return interaction.reply({ content: 'Please provide a number between 1 and 100.', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      try {
        const messages = await interaction.channel.messages.fetch({ limit: count });
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const deletableMessages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
        if (deletableMessages.size === 0) return interaction.editReply({ content: 'No messages found that are younger than 14 days.' });
        const deleted = await interaction.channel.bulkDelete(deletableMessages, true);
        await interaction.editReply({ content: `Deleted ${deleted.size} messages!` });
      } catch (error) { await interaction.editReply({ content: 'Could not delete messages.' }); }
    }

    if (commandName === 'ban') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) return interaction.reply({ content: 'User not found!', ephemeral: true });
      try {
        const banEmbed = new EmbedBuilder().setTitle('🔨 You have been banned!').setDescription(`You've been banned.\nReason: ${reason}`).setColor(0xFF0000).setTimestamp();
        const appealButton = new ButtonBuilder().setCustomId('appeal_button').setLabel('Appeal').setStyle(ButtonStyle.Primary).setEmoji('📝');
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
      if (!member) return interaction.reply({ content: 'User not found!', ephemeral: true });
      try {
        const kickEmbed = new EmbedBuilder().setTitle('👢 You have been kicked!').setDescription(`You've been kicked.\nReason: ${reason}`).setColor(0xFFA500).setTimestamp();
        const appealButton = new ButtonBuilder().setCustomId('appeal_button').setLabel('Appeal').setStyle(ButtonStyle.Primary).setEmoji('📝');
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
      if (!member) return interaction.reply({ content: 'User not found!', ephemeral: true });
      try {
        const timeoutEmbed = new EmbedBuilder().setTitle('🔇 You have been timed out!').setDescription(`You've been timed out for ${minutes} minutes.\nReason: ${reason}`).setColor(0xFFFF00).setTimestamp();
        const appealButton = new ButtonBuilder().setCustomId('appeal_button').setLabel('Appeal').setStyle(ButtonStyle.Primary).setEmoji('📝');
        const row = new ActionRowBuilder().addComponents(appealButton);
        await user.send({ embeds: [timeoutEmbed], components: [row] });
      } catch (error) {}
      await member.timeout(minutes * 60000, reason).catch(() => {});
      await interaction.reply({ content: `Timed out ${user.tag} for ${minutes} minutes!`, ephemeral: true });
    }

    if (commandName === 'untimeout') {
      const user = interaction.options.getUser('user');
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) return interaction.reply({ content: 'User not found!', ephemeral: true });
      await member.timeout(null).catch(() => {});
      await interaction.reply({ content: `Removed timeout from ${user.tag}!`, ephemeral: true });
    }

    if (commandName === 'unban') {
      const userId = interaction.options.getString('userid');
      try { await interaction.guild.members.unban(userId); await interaction.reply({ content: 'Unbanned!', ephemeral: true }); } catch (error) { await interaction.reply({ content: 'Could not unban.', ephemeral: true }); }
    }

    if (commandName === 'baladd') {
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      if (amount <= 0) return interaction.reply({ content: 'Amount must be positive.', ephemeral: true });
      const balance = await sbGetBalance(user.id);
      const currentMoney = balance ? balance.money : 0;
      const currentInvites = balance ? balance.invites : 0;
      const currentBoosts = balance ? balance.boosts : 0;
      await sbUpdateBalance(user.id, currentInvites, currentBoosts, currentMoney + amount);
      await interaction.reply({ content: `Added ${amount}M to ${user.tag}. New balance: **${currentMoney + amount}M**`, ephemeral: true });
    }

    if (commandName === 'balremove') {
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      if (amount <= 0) return interaction.reply({ content: 'Amount must be positive.', ephemeral: true });
      const balance = await sbGetBalance(user.id);
      const currentMoney = balance ? balance.money : 0;
      const currentInvites = balance ? balance.invites : 0;
      const currentBoosts = balance ? balance.boosts : 0;
      const newMoney = Math.max(0, currentMoney - amount);
      await sbUpdateBalance(user.id, currentInvites, currentBoosts, newMoney);
      await interaction.reply({ content: `Removed ${amount}M from ${user.tag}. New balance: **${newMoney}M**`, ephemeral: true });
    }

    if (commandName === 'lb') {
      await interaction.reply({ content: 'Leaderboard positions are temporarily unavailable. Please check back later.', ephemeral: true });
    }
  }
});

// ==================== LOGIN ====================
client.login(process.env.DISCORD_TOKEN);
