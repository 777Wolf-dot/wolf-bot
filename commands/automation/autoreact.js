// commands/owner/autoreact.js

// AutoReact Manager (State Management)
const autoReactConfig = {
  enabled: false, // OFF by default
  emoji: "😂", // Single emoji for reaction
  reactToDMs: true,
  reactToGroups: true,
  reactToCommands: false,
  activeReactions: new Set(), // Track messages we've reacted to
  botSock: null,
  isHooked: false,
  ownerOnly: true,
  allowedUsers: new Set(),
  maxReactionsPerMinute: 30,
  reactionTimestamps: [],
  cooldown: 1000, // 1 second cooldown per user
  userCooldowns: new Map()
};

class AutoReactManager {
  static initialize(sock) {
    if (!autoReactConfig.isHooked && sock) {
      autoReactConfig.botSock = sock;
      this.hookIntoBot();
      autoReactConfig.isHooked = true;
      console.log('😂 Auto-react system initialized (off by default)!');
    }
  }

  static hookIntoBot() {
    if (!autoReactConfig.botSock || !autoReactConfig.botSock.ev) {
      console.log('⚠️ Could not hook into bot events');
      return;
    }
    
    // Add our handler alongside existing ones
    autoReactConfig.botSock.ev.on('messages.upsert', async (data) => {
      await this.handleIncomingMessage(data);
    });
    
    console.log('✅ Auto-react successfully hooked into message events');
  }

  // Check rate limiting
  static isRateLimited() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old timestamps
    autoReactConfig.reactionTimestamps = autoReactConfig.reactionTimestamps.filter(
      timestamp => timestamp > oneMinuteAgo
    );
    
    // Check if we've reached the limit
    if (autoReactConfig.reactionTimestamps.length >= autoReactConfig.maxReactionsPerMinute) {
      return true;
    }
    
    // Add current timestamp
    autoReactConfig.reactionTimestamps.push(now);
    return false;
  }

  // Check user cooldown
  static isUserOnCooldown(userJid) {
    const now = Date.now();
    const lastReaction = autoReactConfig.userCooldowns.get(userJid);
    
    if (!lastReaction) return false;
    
    if (now - lastReaction < autoReactConfig.cooldown) {
      return true;
    }
    
    return false;
  }

  static async handleIncomingMessage(data) {
    try {
      if (!data || !data.messages || data.messages.length === 0) return;
      
      const m = data.messages[0];
      const sock = autoReactConfig.botSock;
      
      // CRITICAL FIX: Check if auto-react is enabled FIRST
      if (!autoReactConfig.enabled) {
        return;
      }
      
      // Check if message exists and skip if it's from the bot itself
      if (!m || !m.key || m.key.fromMe) return;
      
      const userJid = m.key.participant || m.key.remoteJid;
      const chatJid = m.key.remoteJid;
      const messageKey = m.key;
      
      if (!userJid || !chatJid || !messageKey) return;
      
      // Check if we already reacted to this message
      const messageId = `${chatJid}_${messageKey.id}`;
      if (autoReactConfig.activeReactions.has(messageId)) {
        return;
      }
      
      // Check user cooldown
      if (this.isUserOnCooldown(userJid)) {
        return;
      }
      
      // Check if it's a DM or Group
      const isGroup = chatJid.includes('@g.us');
      const isDM = !isGroup;
      
      // Check if we should react based on settings
      if (isDM && !autoReactConfig.reactToDMs) return;
      if (isGroup && !autoReactConfig.reactToGroups) return;
      
      // Get message text from various message types
      let messageText = '';
      if (m.message) {
        if (m.message.conversation) {
          messageText = m.message.conversation;
        } else if (m.message.extendedTextMessage?.text) {
          messageText = m.message.extendedTextMessage.text;
        } else if (m.message.imageMessage?.caption) {
          messageText = m.message.imageMessage.caption || '';
        } else if (m.message.videoMessage?.caption) {
          messageText = m.message.videoMessage.caption || '';
        }
      }
      
      // Check if it's a command (starts with prefix)
      if (messageText.trim().startsWith('.') && !autoReactConfig.reactToCommands) {
        return;
      }
      
      // Rate limiting check
      if (this.isRateLimited()) {
        console.log('⚠️ Rate limited: Too many reactions per minute');
        return;
      }
      
      // React to the message
      try {
        // CRITICAL FIX: Use the correct reaction format
        await sock.sendMessage(chatJid, {
          react: {
            text: autoReactConfig.emoji,
            key: messageKey
          }
        });
        
        // Mark as reacted and update cooldown
        autoReactConfig.activeReactions.add(messageId);
        autoReactConfig.userCooldowns.set(userJid, Date.now());
        
        console.log(`✅ Reacted with ${autoReactConfig.emoji} to message from ${userJid}`);
        
        // Clean up after some time (5 minutes)
        setTimeout(() => {
          autoReactConfig.activeReactions.delete(messageId);
        }, 5 * 60 * 1000);
        
        // Clean old cooldowns periodically
        setTimeout(() => {
          const now = Date.now();
          autoReactConfig.userCooldowns.forEach((timestamp, key) => {
            if (now - timestamp > 60000) { // 1 minute
              autoReactConfig.userCooldowns.delete(key);
            }
          });
        }, 60000);
        
      } catch (err) {
        console.error("Failed to react to message:", err.message || err);
      }
      
    } catch (err) {
      console.error("Auto-react handler error:", err.message || err);
    }
  }

  // Check if user is authorized to use the command
  static isAuthorized(msg, extra = {}) {
    const senderJid = msg.key.participant || msg.key.remoteJid;
    
    // Check if fromMe (bot itself)
    if (msg.key.fromMe) return true;
    
    // Check if owner only mode is enabled
    if (autoReactConfig.ownerOnly) {
      // Use the owner check logic from your mode command
      if (extra.jidManager) {
        return extra.jidManager.isOwner(msg);
      }
      // Fallback to fromMe check if jidManager not available
      return msg.key.fromMe;
    }
    
    // If not owner-only, check allowed users
    if (autoReactConfig.allowedUsers.has(senderJid)) {
      return true;
    }
    
    // Check if it's the owner using the jidManager
    if (extra.jidManager) {
      return extra.jidManager.isOwner(msg);
    }
    
    return false;
  }

  static toggle() {
    autoReactConfig.enabled = !autoReactConfig.enabled;
    console.log(`Auto-react ${autoReactConfig.enabled ? 'ENABLED' : 'DISABLED'}`);
    return autoReactConfig.enabled;
  }

  static status() {
    return {
      enabled: autoReactConfig.enabled,
      emoji: autoReactConfig.emoji,
      reactToDMs: autoReactConfig.reactToDMs,
      reactToGroups: autoReactConfig.reactToGroups,
      reactToCommands: autoReactConfig.reactToCommands,
      ownerOnly: autoReactConfig.ownerOnly,
      isHooked: autoReactConfig.isHooked,
      activeReactions: autoReactConfig.activeReactions.size,
      userCooldowns: autoReactConfig.userCooldowns.size,
      rateLimit: `${autoReactConfig.reactionTimestamps.length}/${autoReactConfig.maxReactionsPerMinute} reactions/min`
    };
  }

  static setEmoji(emoji) {
    // Basic emoji validation
    if (emoji && emoji.length <= 5) {
      autoReactConfig.emoji = emoji;
      return true;
    }
    return false;
  }

  static toggleDMs() {
    autoReactConfig.reactToDMs = !autoReactConfig.reactToDMs;
    return autoReactConfig.reactToDMs;
  }

  static toggleGroups() {
    autoReactConfig.reactToGroups = !autoReactConfig.reactToGroups;
    return autoReactConfig.reactToGroups;
  }

  static toggleCommands() {
    autoReactConfig.reactToCommands = !autoReactConfig.reactToCommands;
    return autoReactConfig.reactToCommands;
  }

  static toggleOwnerOnly() {
    autoReactConfig.ownerOnly = !autoReactConfig.ownerOnly;
    return autoReactConfig.ownerOnly;
  }

  static setBoth() {
    autoReactConfig.reactToDMs = true;
    autoReactConfig.reactToGroups = true;
    return { dms: true, groups: true };
  }

  static setDMsOnly() {
    autoReactConfig.reactToDMs = true;
    autoReactConfig.reactToGroups = false;
    return { dms: true, groups: false };
  }

  static setGroupsOnly() {
    autoReactConfig.reactToDMs = false;
    autoReactConfig.reactToGroups = true;
    return { dms: false, groups: true };
  }

  static addAllowedUser(jid) {
    autoReactConfig.allowedUsers.add(jid);
    return true;
  }

  static removeAllowedUser(jid) {
    autoReactConfig.allowedUsers.delete(jid);
    return true;
  }

  static getAllowedUsers() {
    return Array.from(autoReactConfig.allowedUsers);
  }

  static clearAllReactions() {
    autoReactConfig.activeReactions.clear();
    autoReactConfig.userCooldowns.clear();
    autoReactConfig.reactionTimestamps = [];
  }

  // Manual reaction to a specific message
  static async manualReact(sock, chatJid, emoji, messageKey) {
    try {
      if (!messageKey || !messageKey.id) {
        throw new Error("Invalid message key");
      }
      
      await sock.sendMessage(chatJid, {
        react: {
          text: emoji || autoReactConfig.emoji,
          key: messageKey
        }
      });
      
      const messageId = `${chatJid}_${messageKey.id}`;
      autoReactConfig.activeReactions.add(messageId);
      
      return true;
    } catch (err) {
      console.error("Manual reaction error:", err.message || err);
      return false;
    }
  }

  // React to quoted message
  static async reactToQuoted(sock, chatJid, quotedMsg, emoji) {
    if (!quotedMsg || !quotedMsg.key) {
      throw new Error("No quoted message found");
    }
    
    try {
      await sock.sendMessage(chatJid, {
        react: {
          text: emoji || autoReactConfig.emoji,
          key: quotedMsg.key
        }
      });
      return true;
    } catch (err) {
      console.error("React to quoted error:", err);
      throw err;
    }
  }
}

// Main Command Export
export default {
  name: "autoreact",
  alias: ["autoreaction", "reactauto", "autoemoji", "react"],
  desc: "Auto-react to messages with emojis 😂",
  category: "Owner",
  usage: ".autoreact [on/off/set/dms/groups/both/status/mode/users]",
  
  async execute(sock, m, args, PREFIX, extra) {
    try {
      const targetJid = m.key.remoteJid;
      const isGroup = targetJid.includes('@g.us');
      
      // Initialize on first command use
      if (!autoReactConfig.isHooked) {
        AutoReactManager.initialize(sock);
        console.log('😂 Auto-react system initialized!');
      }
      
      // ==================== OWNER CHECK ====================
      const isAuthorized = AutoReactManager.isAuthorized(m, extra);
      
      if (!isAuthorized) {
        const errorMsg = `❌ *Owner Only Command!*\n\nOnly the bot owner can use this command.\n\nCurrent Status: ${autoReactConfig.enabled ? '🟢 ON' : '🔴 OFF'}\nEmoji: ${autoReactConfig.emoji}`;
        
        return sock.sendMessage(targetJid, {
          text: errorMsg
        }, { quoted: m });
      }
      // ==================== END OWNER CHECK ====================
      
      if (args.length === 0) {
        // Show status
        const status = AutoReactManager.status();
        const statusText = status.enabled ? "✅ *ENABLED*" : "❌ *DISABLED*";
        const modeText = status.ownerOnly ? "🔒 *Owner Only*" : "🌍 *Public*";
        const dmStatus = status.reactToDMs ? "✅ DMs" : "❌ DMs";
        const groupStatus = status.reactToGroups ? "✅ Groups" : "❌ Groups";
        const cmdStatus = status.reactToCommands ? "✅ Commands" : "❌ Commands";
        
        await sock.sendMessage(targetJid, {
          text: `😂 *Auto-React Manager*

${statusText} (OFF by default)

📊 *Current Settings:*
• Status: ${status.enabled ? '🟢 ON' : '🔴 OFF'}
• Emoji: ${status.emoji}
• DMs: ${dmStatus}
• Groups: ${groupStatus}
• Commands: ${cmdStatus}

🔧 *Quick Commands:*
• \`${PREFIX}autoreact on\` 
• \`${PREFIX}autoreact off\`  
• \`${PREFIX}autoreact set <emoji>\` 
• \`${PREFIX}autoreact dms\`
• \`${PREFIX}autoreact groups\`
• \`${PREFIX}autoreact both\`
`
        }, { quoted: m });
        return;
      }
      
      const arg = args[0].toLowerCase();
      
      // Show detailed status
      if (arg === 'status' || arg === 'info') {
        const status = AutoReactManager.status();
        const allowedUsers = AutoReactManager.getAllowedUsers();
        
        let statusMsg = `😂 *Auto-React Status* (Owner View)\n\n`;
        statusMsg += `📊 *System Status:*\n`;
        statusMsg += `├─ Enabled: ${status.enabled ? '✅ YES' : '❌ NO (Default OFF)'}\n`;
        statusMsg += `├─ Current Emoji: ${status.emoji}\n`;
        statusMsg += `├─ React to DMs: ${status.reactToDMs ? '✅ YES' : '❌ NO'}\n`;
        statusMsg += `├─ React to Groups: ${status.reactToGroups ? '✅ YES' : '❌ NO'}\n`;
        statusMsg += `├─ React to Commands: ${status.reactToCommands ? '✅ YES' : '❌ NO'}\n`;
        statusMsg += `├─ Mode: ${status.ownerOnly ? '🔒 Owner Only' : '🌍 Public'}\n`;
        statusMsg += `├─ Active Reactions: ${status.activeReactions}\n`;
        statusMsg += `├─ Rate Limit: ${status.rateLimit}\n`;
        statusMsg += `├─ User Cooldowns: ${status.userCooldowns}\n`;
        statusMsg += `└─ Hooked: ${status.isHooked ? '✅' : '❌'}\n\n`;
        
        statusMsg += `⚙️ *Default Settings:*\n`;
        statusMsg += `• Enabled: ❌ OFF (by default)\n`;
        statusMsg += `• DMs: ✅ ON (when enabled)\n`;
        statusMsg += `• Groups: ✅ ON (when enabled)\n`;
        statusMsg += `• Commands: ❌ OFF\n\n`;
        
        if (allowedUsers.length > 0 && !status.ownerOnly) {
          statusMsg += `👥 *Allowed Users:*\n`;
          allowedUsers.forEach((user, index) => {
            statusMsg += `${index + 1}. ${user}\n`;
          });
          statusMsg += `\n`;
        }
        
        statusMsg += `💡 *Popular Emojis:*\n`;
        statusMsg += `😂 😍 😊 👍 😎 😢 😡 🎉 🚀 💯\n`;
        statusMsg += `❤️ 🥰 🤣 😘 👏 🙏 ✨ 💪 😁\n\n`;
        statusMsg += `Use \`${PREFIX}autoreact set <emoji>\` to change`;
        
        return sock.sendMessage(targetJid, {
          text: statusMsg
        }, { quoted: m });
      }
      
      // Toggle on/off - FIXED: Separate on and off commands
      if (arg === 'on' || arg === 'enable' || arg === 'start') {
        autoReactConfig.enabled = true;
        console.log('✅ Auto-react ENABLED');
        
        await sock.sendMessage(targetJid, {
          text: `😂 *Auto-React ENABLED*

I will now automatically react to messages! ✨

⚙️ *Current Settings:*
• Status: 🟢 ON
• Emoji: ${autoReactConfig.emoji}
• DMs: ${autoReactConfig.reactToDMs ? '✅ ON' : '❌ OFF'}
• Groups: ${autoReactConfig.reactToGroups ? '✅ ON' : '❌ OFF'}
• Commands: ${autoReactConfig.reactToCommands ? '✅ ON' : '❌ OFF'}

📝 *Note:* Reacts to both DMs and groups by default.
Use \`${PREFIX}autoreact dms\` or \`${PREFIX}autoreact groups\` to toggle.`
        }, { quoted: m });
        return;
      }
      
      if (arg === 'off' || arg === 'disable' || arg === 'stop') {
        autoReactConfig.enabled = false;
        console.log('❌ Auto-react DISABLED');
        
        await sock.sendMessage(targetJid, {
          text: `😂 *Auto-React DISABLED*

I will no longer auto-react to messages.

Use \`${PREFIX}autoreact on\` to enable again.`
        }, { quoted: m });
        return;
      }
      
      // Set emoji
      if (arg === 'set' || arg === 'emoji') {
        if (!args[1]) {
          return sock.sendMessage(targetJid, {
            text: `❌ *Missing Emoji*\n\nUsage: ${PREFIX}autoreact set <emoji>\n\nExample: ${PREFIX}autoreact set 😍\n\n💡 *Popular Emojis:*\n😂 😍 👍 🎉 ❤️ 🥰 👏 💯`
          }, { quoted: m });
        }
        
        const emoji = args[1];
        const success = AutoReactManager.setEmoji(emoji);
        
        if (success) {
          await sock.sendMessage(targetJid, {
            text: `✅ *Emoji Updated*\n\nNew reaction emoji: ${emoji}\n\nI will now react with ${emoji} to messages!`
          }, { quoted: m });
        } else {
          await sock.sendMessage(targetJid, {
            text: `❌ *Invalid Emoji*\n\nPlease use a valid single emoji.\n\nExamples: 😂, ❤️, 👍, 🎉\n\nNote: Some custom emojis may not work.`
          }, { quoted: m });
        }
        return;
      }
      
      // Toggle DMs
      if (arg === 'dms' || arg === 'dm') {
        const dmsEnabled = AutoReactManager.toggleDMs();
        await sock.sendMessage(targetJid, {
          text: `💬 *DM Reactions ${dmsEnabled ? 'ENABLED' : 'DISABLED'}*

${dmsEnabled ? 'I will now react to messages in DMs! 💬' : 'I will no longer react to messages in DMs.'}

📊 *Current Settings:*
• DMs: ${dmsEnabled ? '✅ ON' : '❌ OFF'}
• Groups: ${autoReactConfig.reactToGroups ? '✅ ON' : '❌ OFF'}
• Both: ${dmsEnabled && autoReactConfig.reactToGroups ? '✅ YES' : '❌ NO'}

⚠️ *Note:* Auto-react must be enabled first with \`${PREFIX}autoreact on\``
        }, { quoted: m });
        return;
      }
      
      // Toggle groups
      if (arg === 'groups' || arg === 'group') {
        const groupsEnabled = AutoReactManager.toggleGroups();
        await sock.sendMessage(targetJid, {
          text: `👥 *Group Reactions ${groupsEnabled ? 'ENABLED' : 'DISABLED'}*

${groupsEnabled ? 'I will now react to messages in groups! 👥' : 'I will no longer react to messages in groups.'}

📊 *Current Settings:*
• DMs: ${autoReactConfig.reactToDMs ? '✅ ON' : '❌ OFF'}
• Groups: ${groupsEnabled ? '✅ ON' : '❌ OFF'}
• Both: ${autoReactConfig.reactToDMs && groupsEnabled ? '✅ YES' : '❌ NO'}

⚠️ *Note:* Auto-react must be enabled first with \`${PREFIX}autoreact on\``
        }, { quoted: m });
        return;
      }
      
      // Set both DMs and groups
      if (arg === 'both' || arg === 'all') {
        const both = AutoReactManager.setBoth();
        await sock.sendMessage(targetJid, {
          text: `✅ *Both DMs & Groups Enabled*

I will now react to messages in both DMs and groups! 🎉

📊 *Current Settings:*
• DMs: ✅ ON
• Groups: ✅ ON
• Commands: ${autoReactConfig.reactToCommands ? '✅ ON' : '❌ OFF'}

⚠️ *Note:* Auto-react must be enabled first with \`${PREFIX}autoreact on\`

Use \`${PREFIX}autoreact dms\` or \`${PREFIX}autoreact groups\` to toggle individually.`
        }, { quoted: m });
        return;
      }
      
      // Set DMs only
      if (arg === 'dmsonly' || arg === 'onlydms') {
        const settings = AutoReactManager.setDMsOnly();
        await sock.sendMessage(targetJid, {
          text: `✅ *DMs Only Mode*

I will now react ONLY to messages in DMs (not groups)! 💬

📊 *Current Settings:*
• DMs: ✅ ON
• Groups: ❌ OFF
• Commands: ${autoReactConfig.reactToCommands ? '✅ ON' : '❌ OFF'}

⚠️ *Note:* Auto-react must be enabled first with \`${PREFIX}autoreact on\``
        }, { quoted: m });
        return;
      }
      
      // Set groups only
      if (arg === 'groupsonly' || arg === 'onlygroups') {
        const settings = AutoReactManager.setGroupsOnly();
        await sock.sendMessage(targetJid, {
          text: `✅ *Groups Only Mode*

I will now react ONLY to messages in groups (not DMs)! 👥

📊 *Current Settings:*
• DMs: ❌ OFF
• Groups: ✅ ON
• Commands: ${autoReactConfig.reactToCommands ? '✅ ON' : '❌ OFF'}

⚠️ *Note:* Auto-react must be enabled first with \`${PREFIX}autoreact on\``
        }, { quoted: m });
        return;
      }
      
      // Toggle command reactions
      if (arg === 'commands' || arg === 'cmds' || arg === 'cmd') {
        const commandsEnabled = AutoReactManager.toggleCommands();
        await sock.sendMessage(targetJid, {
          text: `⌨️ *Command Reactions ${commandsEnabled ? 'ENABLED' : 'DISABLED'}*

${commandsEnabled ? 'I will now react to command messages too! ⌨️' : 'I will skip reacting to command messages.'}

⚠️ *Note:* 
1. Auto-react must be enabled first with \`${PREFIX}autoreact on\`
2. Reacting to commands may cause confusion as users might think the command worked when it's just a reaction.`
        }, { quoted: m });
        return;
      }
      
      // Mode toggle (owner-only vs public)
      if (arg === 'mode' || arg === 'togglemode') {
        const ownerOnly = AutoReactManager.toggleOwnerOnly();
        await sock.sendMessage(targetJid, {
          text: `🔧 *React Mode Changed*

Mode: ${ownerOnly ? '🔒 *OWNER ONLY*' : '🌍 *PUBLIC*'}

${ownerOnly ? 
  'Only you (owner) can control auto-react now.' : 
  'Anyone can use auto-react commands now.\n\n⚠️ *Warning:* Public mode may allow others to change settings.'
}

⚙️ To add specific allowed users:
• \`${PREFIX}autoreact users add @user\`
• \`${PREFIX}autoreact users list\`

⚠️ *Note:* Auto-react is OFF by default. Enable with \`${PREFIX}autoreact on\``
        }, { quoted: m });
        return;
      }
      
      // User management
      if (arg === 'users' || arg === 'user' || arg === 'allow') {
        const subCmd = args[1]?.toLowerCase();
        
        if (!subCmd || subCmd === 'list') {
          const allowedUsers = AutoReactManager.getAllowedUsers();
          let userList = `👥 *Allowed Users* (${allowedUsers.length})\n\n`;
          
          if (allowedUsers.length === 0) {
            userList += `No users added yet.\n`;
          } else {
            allowedUsers.forEach((user, index) => {
              userList += `${index + 1}. ${user}\n`;
            });
          }
          
          userList += `\n🔧 *Commands:*\n`;
          userList += `• \`${PREFIX}autoreact users add @user\`\n`;
          userList += `• \`${PREFIX}autoreact users remove @user\`\n`;
          userList += `• \`${PREFIX}autoreact users clear\`\n`;
          
          return sock.sendMessage(targetJid, {
            text: userList
          }, { quoted: m });
        }
        
        if (subCmd === 'add' && args[2]) {
          const userToAdd = args[2].replace('@', '') + '@s.whatsapp.net';
          AutoReactManager.addAllowedUser(userToAdd);
          
          await sock.sendMessage(targetJid, {
            text: `✅ *User Added*\n\nAdded ${userToAdd} to allowed users list.\n\nThey can now use auto-react commands when mode is public.`
          }, { quoted: m });
          return;
        }
        
        if (subCmd === 'remove' && args[2]) {
          const userToRemove = args[2].replace('@', '') + '@s.whatsapp.net';
          AutoReactManager.removeAllowedUser(userToRemove);
          
          await sock.sendMessage(targetJid, {
            text: `✅ *User Removed*\n\nRemoved ${userToRemove} from allowed users list.`
          }, { quoted: m });
          return;
        }
        
        if (subCmd === 'clear') {
          autoReactConfig.allowedUsers.clear();
          
          await sock.sendMessage(targetJid, {
            text: `✅ *Users Cleared*\n\nAll allowed users have been removed.`
          }, { quoted: m });
          return;
        }
        
        // Invalid user command
        await sock.sendMessage(targetJid, {
          text: `❓ *Invalid User Command*\n\nUsage:\n• \`${PREFIX}autoreact users list\`\n• \`${PREFIX}autoreact users add @user\`\n• \`${PREFIX}autoreact users remove @user\`\n• \`${PREFIX}autoreact users clear\``
        }, { quoted: m });
        return;
      }
      
      // Manual reaction to quoted message
      if ((arg === 'react' || arg === 'manual') && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedMsg = m.message.extendedTextMessage.contextInfo;
        const emoji = args[1] || autoReactConfig.emoji;
        
        try {
          // Create message key for the quoted message
          const messageKey = {
            remoteJid: targetJid,
            fromMe: false,
            id: quotedMsg.stanzaId,
            participant: quotedMsg.participant || targetJid
          };
          
          const success = await AutoReactManager.manualReact(sock, targetJid, emoji, messageKey);
          
          if (success) {
            await sock.sendMessage(targetJid, {
              text: `✅ *Reaction Sent*\n\nReacted with ${emoji} to the quoted message!`
            }, { quoted: m });
          } else {
            await sock.sendMessage(targetJid, {
              text: `❌ *Failed to React*\n\nCould not react to the quoted message.`
            }, { quoted: m });
          }
        } catch (err) {
          await sock.sendMessage(targetJid, {
            text: `❌ *Error:* ${err.message || 'Failed to react to quoted message'}`
          }, { quoted: m });
        }
        return;
      }
      
      // Test reaction to current message
      if (arg === 'test') {
        try {
          const emoji = args[1] || autoReactConfig.emoji;
          
          // React to the current command message
          await sock.sendMessage(targetJid, {
            react: {
              text: emoji,
              key: m.key
            }
          });
          
          await sock.sendMessage(targetJid, {
            text: `✅ *Test Reaction Sent*\n\nReacted with ${emoji} to this command!\n\nAuto-react is currently: ${autoReactConfig.enabled ? '🟢 ON' : '🔴 OFF'}`
          }, { quoted: m });
        } catch (err) {
          await sock.sendMessage(targetJid, {
            text: `❌ *Test Failed:* ${err.message || 'Could not send reaction'}`
          }, { quoted: m });
        }
        return;
      }
      
      // Clear all active reactions
      if (arg === 'clear' || arg === 'reset') {
        AutoReactManager.clearAllReactions();
        await sock.sendMessage(targetJid, {
          text: `✅ *All Reactions Cleared*\n\nCleared all active reaction tracking and user cooldowns.\n\nAuto-react status: ${autoReactConfig.enabled ? '🟢 ON' : '🔴 OFF'}`
        }, { quoted: m });
        return;
      }
      
      // If no valid command, show help
      await sock.sendMessage(targetJid, {
        text: `😂 *Auto-React Owner Commands:*

⚠️ *NOTE:* Auto-react is OFF by default. Enable with \`${PREFIX}autoreact on\`

🔧 *Basic Control:*
• \`${PREFIX}autoreact on\` - Enable auto-react
• \`${PREFIX}autoreact off\` - Disable auto-react
• \`${PREFIX}autoreact set 😍\` - Set reaction emoji

🎯 *Target Control:*
• \`${PREFIX}autoreact dms\` - Toggle DM reactions
• \`${PREFIX}autoreact groups\` - Toggle group reactions  
• \`${PREFIX}autoreact both\` - React to both DMs & groups
• \`${PREFIX}autoreact dmsonly\` - React only in DMs
• \`${PREFIX}autoreact groupsonly\` - React only in groups
• \`${PREFIX}autoreact commands\` - Toggle command reactions

🔒 *Access Control:*
• \`${PREFIX}autoreact mode\` - Toggle owner-only/public mode
• \`${PREFIX}autoreact users\` - Manage allowed users

📊 *Info & Tools:*
• \`${PREFIX}autoreact\` - Show status
• \`${PREFIX}autoreact status\` - Detailed status
• \`${PREFIX}autoreact test\` - Test reaction
• \`${PREFIX}autoreact clear\` - Clear reaction tracking

🎭 *Manual Reaction:*
• Reply to a message with: \`${PREFIX}autoreact react 😂\`

⚠️ *Rate Limit:* ${autoReactConfig.maxReactionsPerMinute} reactions per minute
⚙️ *Defaults:* OFF | DMs ✅ | Groups ✅ | Commands ❌`
      }, { quoted: m });
      
    } catch (err) {
      console.error("AutoReact command error:", err);
      await sock.sendMessage(m.key.remoteJid, {
        text: `❌ AutoReact command failed: ${err.message}`
      }, { quoted: m });
    }
  }
};