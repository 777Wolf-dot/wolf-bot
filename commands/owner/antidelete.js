// // File: ./commands/utility/antidelete.js - COMPLETELY STANDALONE
// import fs from 'fs/promises';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import { downloadMediaMessage } from '@whiskeysockets/baileys';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Storage paths
// const STORAGE_DIR = './data/antidelete';
// const MEDIA_DIR = path.join(STORAGE_DIR, 'media');
// const CACHE_FILE = path.join(STORAGE_DIR, 'cache.json');

// // Global state
// let antideleteState = {
//     enabled: true, // ENABLED BY DEFAULT
//     ownerJid: null,
//     sock: null,
//     messageCache: new Map(),
//     mediaCache: new Map(),
//     stats: {
//         totalMessages: 0,
//         deletedDetected: 0,
//         retrieved: 0,
//         mediaCaptured: 0
//     }
// };

// // Ensure directories exist
// async function ensureDirs() {
//     try {
//         await fs.mkdir(STORAGE_DIR, { recursive: true });
//         await fs.mkdir(MEDIA_DIR, { recursive: true });
//         return true;
//     } catch (error) {
//         console.error('❌ Antidelete: Failed to create directories:', error.message);
//         return false;
//     }
// }

// // Load saved data
// async function loadData() {
//     try {
//         await ensureDirs();
        
//         if (await fs.access(CACHE_FILE).then(() => true).catch(() => false)) {
//             const data = JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
            
//             // Restore message cache
//             if (data.messageCache && Array.isArray(data.messageCache)) {
//                 antideleteState.messageCache.clear();
//                 data.messageCache.forEach(([key, value]) => {
//                     antideleteState.messageCache.set(key, value);
//                 });
//             }
            
//             // Restore media cache
//             if (data.mediaCache && Array.isArray(data.mediaCache)) {
//                 antideleteState.mediaCache.clear();
//                 data.mediaCache.forEach(([key, value]) => {
//                     antideleteState.mediaCache.set(key, value);
//                 });
//             }
            
//             if (data.stats) {
//                 antideleteState.stats = data.stats;
//             }
            
//             console.log(`✅ Antidelete: Loaded ${antideleteState.messageCache.size} messages, ${antideleteState.mediaCache.size} media`);
//         }
//     } catch (error) {
//         console.error('❌ Antidelete: Error loading data:', error.message);
//     }
// }

// // Save data
// async function saveData() {
//     try {
//         await ensureDirs();
        
//         const data = {
//             messageCache: Array.from(antideleteState.messageCache.entries()),
//             mediaCache: Array.from(antideleteState.mediaCache.entries()),
//             stats: antideleteState.stats,
//             savedAt: Date.now()
//         };
        
//         await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2));
//     } catch (error) {
//         console.error('❌ Antidelete: Error saving data:', error.message);
//     }
// }

// // Clean old data (older than 24 hours)
// async function cleanOldData() {
//     const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
//     let cleanedMessages = 0;
//     let cleanedMedia = 0;
    
//     // Clean old messages
//     for (const [msgId, message] of antideleteState.messageCache.entries()) {
//         if (message.timestamp < twentyFourHoursAgo) {
//             antideleteState.messageCache.delete(msgId);
//             cleanedMessages++;
//         }
//     }
    
//     // Clean old media references
//     for (const [msgId, mediaPath] of antideleteState.mediaCache.entries()) {
//         try {
//             if (await fs.access(mediaPath).then(() => true).catch(() => false)) {
//                 const stats = await fs.stat(mediaPath);
//                 if (stats.mtimeMs < twentyFourHoursAgo) {
//                     await fs.unlink(mediaPath);
//                     antideleteState.mediaCache.delete(msgId);
//                     cleanedMedia++;
//                 }
//             }
//         } catch (error) {}
//     }
    
//     if (cleanedMessages > 0 || cleanedMedia > 0) {
//         await saveData();
//         console.log(`🧹 Antidelete: Cleaned ${cleanedMessages} messages, ${cleanedMedia} media files`);
//     }
// }

// // Get file extension from mimetype
// function getExtensionFromMime(mimetype) {
//     const mimeToExt = {
//         'image/jpeg': '.jpg',
//         'image/jpg': '.jpg',
//         'image/png': '.png',
//         'image/gif': '.gif',
//         'image/webp': '.webp',
//         'video/mp4': '.mp4',
//         'video/3gpp': '.3gp',
//         'audio/mpeg': '.mp3',
//         'audio/mp4': '.m4a',
//         'audio/ogg': '.ogg',
//         'audio/aac': '.aac',
//         'application/pdf': '.pdf',
//         'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
//         'application/msword': '.doc',
//         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
//         'application/vnd.ms-excel': '.xls'
//     };
    
//     return mimeToExt[mimetype] || '.bin';
// }

// // Download and save media
// async function downloadAndSaveMedia(msgId, message, messageType, mimetype) {
//     try {
//         const buffer = await downloadMediaMessage(
//             message,
//             'buffer',
//             {},
//             {
//                 logger: { level: 'silent' },
//                 reuploadRequest: antideleteState.sock?.updateMediaMessage
//             }
//         );
        
//         if (!buffer || buffer.length === 0) {
//             return null;
//         }
        
//         const timestamp = Date.now();
//         const extension = getExtensionFromMime(mimetype);
//         const filename = `${messageType}_${timestamp}${extension}`;
//         const filePath = path.join(MEDIA_DIR, filename);
        
//         await fs.writeFile(filePath, buffer);
        
//         antideleteState.mediaCache.set(msgId, filePath);
//         antideleteState.stats.mediaCaptured++;
        
//         console.log(`📸 Antidelete: Saved ${messageType} media: ${filename} (${Math.round(buffer.length/1024)}KB)`);
//         return filePath;
        
//     } catch (error) {
//         console.error('❌ Antidelete: Media download error:', error.message);
//         return null;
//     }
// }

// // Store incoming message
// async function storeIncomingMessage(message) {
//     try {
//         if (!antideleteState.enabled || !antideleteState.sock) return;
        
//         const msgKey = message.key;
//         if (!msgKey || !msgKey.id || msgKey.fromMe) return;
        
//         const msgId = msgKey.id;
//         const chatJid = msgKey.remoteJid;
//         const senderJid = msgKey.participant || chatJid;
//         const pushName = message.pushName || 'Unknown';
//         const timestamp = message.messageTimestamp * 1000 || Date.now();
        
//         // Check if it's a status (skip statuses)
//         if (chatJid === 'status@broadcast') return;
        
//         // Extract message content
//         const msgContent = message.message;
//         let type = 'text';
//         let text = '';
//         let hasMedia = false;
//         let mediaInfo = null;
//         let mimetype = '';
        
//         if (msgContent?.conversation) {
//             text = msgContent.conversation;
//         } else if (msgContent?.extendedTextMessage?.text) {
//             text = msgContent.extendedTextMessage.text;
//         } else if (msgContent?.imageMessage) {
//             type = 'image';
//             text = msgContent.imageMessage.caption || '';
//             hasMedia = true;
//             mimetype = msgContent.imageMessage.mimetype || 'image/jpeg';
//             mediaInfo = { message, type: 'image', mimetype };
//         } else if (msgContent?.videoMessage) {
//             type = 'video';
//             text = msgContent.videoMessage.caption || '';
//             hasMedia = true;
//             mimetype = msgContent.videoMessage.mimetype || 'video/mp4';
//             mediaInfo = { message, type: 'video', mimetype };
//         } else if (msgContent?.audioMessage) {
//             type = 'audio';
//             hasMedia = true;
//             mimetype = msgContent.audioMessage.mimetype || 'audio/mpeg';
//             // Check if it's voice note
//             if (msgContent.audioMessage.ptt) {
//                 type = 'voice';
//             }
//             mediaInfo = { message, type: 'audio', mimetype };
//         } else if (msgContent?.documentMessage) {
//             type = 'document';
//             text = msgContent.documentMessage.fileName || 'Document';
//             hasMedia = true;
//             mimetype = msgContent.documentMessage.mimetype || 'application/octet-stream';
//             mediaInfo = { message, type: 'document', mimetype };
//         } else if (msgContent?.stickerMessage) {
//             type = 'sticker';
//             hasMedia = true;
//             mimetype = msgContent.stickerMessage.mimetype || 'image/webp';
//             mediaInfo = { message, type: 'sticker', mimetype };
//         }
        
//         // Skip empty messages
//         if (!text && !hasMedia) return;
        
//         const messageData = {
//             id: msgId,
//             chatJid,
//             senderJid,
//             pushName,
//             timestamp,
//             type,
//             text: text || '',
//             hasMedia,
//             mimetype
//         };
        
//         // Store in cache
//         antideleteState.messageCache.set(msgId, messageData);
//         antideleteState.stats.totalMessages++;
        
//         // Download media if present
//         if (hasMedia && mediaInfo) {
//             setTimeout(async () => {
//                 try {
//                     await downloadAndSaveMedia(msgId, mediaInfo.message, type, mediaInfo.mimetype);
//                     await saveData();
//                 } catch (error) {
//                     console.error('❌ Antidelete: Async media download failed:', error.message);
//                 }
//             }, 1000);
//         }
        
//         // Save periodically
//         if (antideleteState.stats.totalMessages % 20 === 0) {
//             await saveData();
//         }
        
//         return messageData;
        
//     } catch (error) {
//         console.error('❌ Antidelete: Error storing message:', error.message);
//         return null;
//     }
// }

// // Handle deleted message
// async function handleDeletedMessage(update) {
//     try {
//         if (!antideleteState.enabled || !antideleteState.sock) return;
        
//         const msgKey = update.key;
//         if (!msgKey || !msgKey.id) return;
        
//         const msgId = msgKey.id;
//         const chatJid = msgKey.remoteJid;
        
//         // Check if message was deleted
//         const isDeleted = 
//             update.message === null ||
//             update.update?.status === 6 ||
//             update.update?.message === null ||
//             update.messageStubType === 7 || // REVOKE
//             update.messageStubType === 8;   // REVOKE_EVERYONE
        
//         if (!isDeleted) return;
        
//         console.log(`🔍 Antidelete: Checking deletion for ${msgId} in ${chatJid}`);
        
//         // Get cached message
//         const cachedMessage = antideleteState.messageCache.get(msgId);
//         if (!cachedMessage) {
//             console.log(`⚠️ Antidelete: Message ${msgId} not found in cache`);
//             return;
//         }
        
//         // Remove from cache
//         antideleteState.messageCache.delete(msgId);
//         antideleteState.stats.deletedDetected++;
        
//         // Send to chat where deletion happened
//         await sendToChat(cachedMessage, chatJid);
        
//         antideleteState.stats.retrieved++;
//         await saveData();
        
//         console.log(`✅ Antidelete: Retrieved deleted message from ${cachedMessage.pushName}`);
        
//     } catch (error) {
//         console.error('❌ Antidelete: Error handling deleted message:', error.message);
//     }
// }

// // Send deleted content back to chat
// async function sendToChat(messageData, chatJid) {
//     try {
//         if (!antideleteState.sock) return;
        
//         const time = new Date(messageData.timestamp).toLocaleString();
//         const senderNumber = messageData.senderJid.split('@')[0];
        
//         let caption = `🗑️ *DELETED MESSAGE RETRIEVED*\n\n`;
//         caption += `👤 From: ${senderNumber} (${messageData.pushName})\n`;
//         caption += `🕒 Original time: ${time}\n`;
//         caption += `📝 Type: ${messageData.type.toUpperCase()}\n`;
        
//         if (messageData.text) {
//             caption += `\n📋 Content:\n${messageData.text.substring(0, 500)}`;
//             if (messageData.text.length > 500) caption += '...';
//         }
        
//         caption += `\n\n────────────\n`;
//         caption += `🔍 *Retrieved by antidelete*`;
        
//         // Check if we have media
//         const mediaPath = antideleteState.mediaCache.get(messageData.id);
        
//         if (messageData.hasMedia && mediaPath) {
//             try {
//                 const buffer = await fs.readFile(mediaPath);
                
//                 if (buffer && buffer.length > 0) {
//                     if (messageData.type === 'image') {
//                         await antideleteState.sock.sendMessage(chatJid, {
//                             image: buffer,
//                             caption: caption,
//                             mimetype: messageData.mimetype
//                         });
//                     } else if (messageData.type === 'video') {
//                         await antideleteState.sock.sendMessage(chatJid, {
//                             video: buffer,
//                             caption: caption,
//                             mimetype: messageData.mimetype
//                         });
//                     } else if (messageData.type === 'audio' || messageData.type === 'voice') {
//                         await antideleteState.sock.sendMessage(chatJid, {
//                             audio: buffer,
//                             mimetype: messageData.mimetype,
//                             ptt: messageData.type === 'voice'
//                         });
//                         // Send caption separately for audio
//                         await antideleteState.sock.sendMessage(chatJid, { text: caption });
//                     } else if (messageData.type === 'sticker') {
//                         await antideleteState.sock.sendMessage(chatJid, {
//                             sticker: buffer,
//                             mimetype: messageData.mimetype
//                         });
//                         // Send caption separately for sticker
//                         await antideleteState.sock.sendMessage(chatJid, { text: caption });
//                     } else if (messageData.type === 'document') {
//                         await antideleteState.sock.sendMessage(chatJid, {
//                             document: buffer,
//                             caption: caption,
//                             mimetype: messageData.mimetype,
//                             fileName: messageData.text || 'document'
//                         });
//                     }
//                 } else {
//                     await antideleteState.sock.sendMessage(chatJid, { text: caption });
//                 }
//             } catch (mediaError) {
//                 console.error('❌ Antidelete: Media send error:', mediaError.message);
//                 await antideleteState.sock.sendMessage(chatJid, { text: caption });
//             }
//         } else {
//             await antideleteState.sock.sendMessage(chatJid, { text: caption });
//         }
        
//         console.log(`📤 Antidelete: Sent to chat ${chatJid}`);
//         return true;
        
//     } catch (error) {
//         console.error('❌ Antidelete: Error sending to chat:', error.message);
//         return false;
//     }
// }

// // Setup listeners
// function setupListeners() {
//     if (!antideleteState.sock) {
//         console.error('❌ Antidelete: Socket not set');
//         return;
//     }
    
//     console.log('🚀 Antidelete: Setting up listeners...');
    
//     // Listen for incoming messages
//     antideleteState.sock.ev.on('messages.upsert', async ({ messages, type }) => {
//         try {
//             if (type !== 'notify' || !antideleteState.enabled) return;
            
//             for (const message of messages) {
//                 await storeIncomingMessage(message);
//             }
//         } catch (error) {
//             console.error('❌ Antidelete: Message storage error:', error.message);
//         }
//     });
    
//     // Listen for message updates (deletions)
//     antideleteState.sock.ev.on('messages.update', async (updates) => {
//         try {
//             if (!antideleteState.enabled) return;
            
//             for (const update of updates) {
//                 await handleDeletedMessage(update);
//             }
//         } catch (error) {
//             console.error('❌ Antidelete: Deletion detection error:', error.message);
//         }
//     });
    
//     console.log('✅ Antidelete: Listeners active');
// }

// // Initialize system
// async function initializeSystem(sock) {
//     try {
//         // Load existing data
//         await loadData();
        
//         // Set socket
//         antideleteState.sock = sock;
        
//         // Set owner JID from socket
//         if (sock.user?.id) {
//             antideleteState.ownerJid = sock.user.id;
//             console.log(`👑 Antidelete: Owner set to ${sock.user.id}`);
//         }
        
//         // Setup listeners
//         setupListeners();
        
//         // Start cleanup interval (every 6 hours)
//         setInterval(async () => {
//             await cleanOldData();
//         }, 6 * 60 * 60 * 1000);
        
//         console.log('🎯 Antidelete: System initialized and active');
        
//     } catch (error) {
//         console.error('❌ Antidelete: Initialization error:', error.message);
//     }
// }

// // Export initialization function
// export async function initAntidelete(sock) {
//     await initializeSystem(sock);
// }

// // The command module
// export default {
//     name: 'antidelete',
//     alias: ['undelete', 'antidel', 'ad'],
//     description: 'Capture deleted messages and retrieve them in chat',
//     category: 'utility',
    
//     async execute(sock, msg, args, prefix) {
//         const chatId = msg.key.remoteJid;
//         const command = args[0]?.toLowerCase() || 'status';
        
//         // Ensure system is initialized
//         if (!antideleteState.sock) {
//             antideleteState.sock = sock;
//             setupListeners();
//         }
        
//         switch (command) {
//             case 'on':
//             case 'enable':
//                 antideleteState.enabled = true;
//                 await sock.sendMessage(chatId, {
//                     text: `✅ *ANTIDELETE ENABLED*\n\nSystem is now active!\n\nAll deleted messages will be retrieved and shown in chat.`
//                 }, { quoted: msg });
//                 break;
                
//             case 'off':
//             case 'disable':
//                 antideleteState.enabled = false;
//                 await sock.sendMessage(chatId, {
//                     text: `✅ *ANTIDELETE DISABLED*\n\nSystem is now inactive.`
//                 }, { quoted: msg });
//                 break;
                
//             case 'status':
//             case 'stats':
//                 const statsText = `
// 📊 *ANTIDELETE STATISTICS*

// Status: ${antideleteState.enabled ? '✅ ACTIVE' : '❌ INACTIVE'}
// Socket: ${antideleteState.sock ? '✅ CONNECTED' : '❌ DISCONNECTED'}

// 📈 *Performance:*
// Total messages stored: ${antideleteState.stats.totalMessages}
// Currently cached: ${antideleteState.messageCache.size}
// Deletions detected: ${antideleteState.stats.deletedDetected}
// Successfully retrieved: ${antideleteState.stats.retrieved}
// Media captured: ${antideleteState.stats.mediaCaptured}
// Media files stored: ${antideleteState.mediaCache.size}

// 💡 *Commands:*
// • ${prefix}antidelete on/off - Enable/disable
// • ${prefix}antidelete test - Send test message
// • ${prefix}antidelete clear - Clear cache
// • ${prefix}antidelete help - Show help
// `;
                
//                 await sock.sendMessage(chatId, { text: statsText }, { quoted: msg });
//                 break;
                
//             case 'test':
//                 const testMsg = await sock.sendMessage(chatId, {
//                     text: `📝 *Test Message*\n\nDelete this message to test antidelete!\n\nSystem: ${antideleteState.enabled ? '✅ ACTIVE' : '❌ INACTIVE'}\nCache size: ${antideleteState.messageCache.size}`
//                 }, { quoted: msg });
                
//                 // Store test message
//                 if (testMsg?.key) {
//                     const testData = {
//                         id: testMsg.key.id,
//                         chatJid: testMsg.key.remoteJid,
//                         senderJid: antideleteState.ownerJid || testMsg.key.participant,
//                         pushName: 'Test Bot',
//                         timestamp: Date.now(),
//                         type: 'text',
//                         text: 'Test message for antidelete system',
//                         hasMedia: false
//                     };
                    
//                     antideleteState.messageCache.set(testMsg.key.id, testData);
//                     await sock.sendMessage(chatId, {
//                         text: `✅ Test message stored! Delete it to test.`
//                     });
//                 }
//                 break;
                
//             case 'clear':
//             case 'clean':
//                 const cacheSize = antideleteState.messageCache.size;
//                 const mediaSize = antideleteState.mediaCache.size;
                
//                 antideleteState.messageCache.clear();
//                 antideleteState.mediaCache.clear();
//                 antideleteState.stats.totalMessages = 0;
//                 antideleteState.stats.deletedDetected = 0;
//                 antideleteState.stats.retrieved = 0;
//                 antideleteState.stats.mediaCaptured = 0;
                
//                 // Delete media files
//                 try {
//                     const files = await fs.readdir(MEDIA_DIR);
//                     for (const file of files) {
//                         await fs.unlink(path.join(MEDIA_DIR, file));
//                     }
//                 } catch (error) {}
                
//                 await saveData();
                
//                 await sock.sendMessage(chatId, {
//                     text: `🧹 *Cache Cleared*\n\n• Messages: ${cacheSize}\n• Media files: ${mediaSize}\n\nAll data has been cleared.`
//                 }, { quoted: msg });
//                 break;
                
//             case 'debug':
//                 const debugInfo = `
// 🔧 *ANTIDELETE DEBUG INFO*

// System: ${antideleteState.enabled ? '✅ ACTIVE' : '❌ INACTIVE'}
// Socket: ${antideleteState.sock ? '✅ SET' : '❌ NOT SET'}
// Owner: ${antideleteState.ownerJid || 'Not set'}

// 📦 *Cache Details:*
// Message cache size: ${antideleteState.messageCache.size}
// Media cache size: ${antideleteState.mediaCache.size}
// Last 5 messages: ${Array.from(antideleteState.messageCache.keys()).slice(-5).join(', ')}

// 🔄 *Auto-cleanup:* Every 6 hours
// ✅ *Captures:* Text, Images, Videos, Audio, Voice, Stickers, Documents
// `;
                
//                 await sock.sendMessage(chatId, { text: debugInfo }, { quoted: msg });
//                 break;
                
//             case 'help':
//             case 'menu':
//                 const helpText = `
// 🔍 *ANTIDELETE SYSTEM*

// 🎯 *What it does:*
// • Automatically stores ALL incoming messages
// • Captures images, videos, audio, voice notes, stickers, documents
// • Detects when messages are deleted
// • Retrieves and shows deleted content in the same chat

// 🚀 *Commands:*
// • ${prefix}antidelete - Show status
// • ${prefix}antidelete on - Enable system
// • ${prefix}antidelete off - Disable system
// • ${prefix}antidelete status - View statistics
// • ${prefix}antidelete test - Send test message
// • ${prefix}antidelete clear - Clear all cache
// • ${prefix}antidelete debug - Debug information

// ⚙️ *Supported Media:*
// ✅ Images (JPG, PNG, GIF, WebP)
// ✅ Videos (MP4, 3GP)
// ✅ Audio files (MP3, M4A, AAC, OGG)
// ✅ Voice notes
// ✅ Stickers
// ✅ Documents (PDF, DOC, XLS, etc.)
// ✅ Text messages

// 📝 *Current Status:*
// Active: ${antideleteState.enabled ? '✅' : '❌'}
// Cached: ${antideleteState.messageCache.size} messages
// `;
                
//                 await sock.sendMessage(chatId, { text: helpText }, { quoted: msg });
//                 break;
                
//             default:
//                 await sock.sendMessage(chatId, {
//                     text: `🔧 *Antidelete System*\n\nStatus: ${antideleteState.enabled ? '✅ ACTIVE' : '❌ INACTIVE'}\nCached: ${antideleteState.messageCache.size} messages\n\n📸 *Captures:* Text, Images, Videos, Audio, Voice, Stickers\n\n💡 Use ${prefix}antidelete help for commands`
//                 }, { quoted: msg });
//         }
//     }
// };



































// File: ./commands/utility/antidelete.js - FIXED VERSION
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage paths
const STORAGE_DIR = './data/antidelete';
const MEDIA_DIR = path.join(STORAGE_DIR, 'media');
const CACHE_FILE = path.join(STORAGE_DIR, 'cache.json');

// Global state
let antideleteState = {
    enabled: true,
    mode: 'private', // private, public, or off
    ownerJid: null,
    sock: null,
    messageCache: new Map(),
    mediaCache: new Map(),
    stats: {
        totalMessages: 0,
        deletedDetected: 0,
        retrieved: 0,
        mediaCaptured: 0,
        sentToDm: 0,
        sentToChat: 0
    }
};

// Ensure directories exist
async function ensureDirs() {
    try {
        await fs.mkdir(STORAGE_DIR, { recursive: true });
        await fs.mkdir(MEDIA_DIR, { recursive: true });
        return true;
    } catch (error) {
        console.error('❌ Antidelete: Failed to create directories:', error.message);
        return false;
    }
}

// Load saved data
async function loadData() {
    try {
        await ensureDirs();
        
        if (await fs.access(CACHE_FILE).then(() => true).catch(() => false)) {
            const data = JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
            
            if (data.messageCache && Array.isArray(data.messageCache)) {
                antideleteState.messageCache.clear();
                data.messageCache.forEach(([key, value]) => {
                    antideleteState.messageCache.set(key, value);
                });
            }
            
            if (data.mediaCache && Array.isArray(data.mediaCache)) {
                antideleteState.mediaCache.clear();
                data.mediaCache.forEach(([key, value]) => {
                    antideleteState.mediaCache.set(key, value);
                });
            }
            
            if (data.stats) {
                antideleteState.stats = data.stats;
            }
            
            console.log(`✅ Antidelete: Loaded ${antideleteState.messageCache.size} messages, ${antideleteState.mediaCache.size} media`);
        }
    } catch (error) {
        console.error('❌ Antidelete: Error loading data:', error.message);
    }
}

// Save data
async function saveData() {
    try {
        await ensureDirs();
        
        const data = {
            messageCache: Array.from(antideleteState.messageCache.entries()),
            mediaCache: Array.from(antideleteState.mediaCache.entries()),
            stats: antideleteState.stats,
            savedAt: Date.now()
        };
        
        await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Antidelete: Error saving data:', error.message);
    }
}

// Get file extension from mimetype
function getExtensionFromMime(mimetype) {
    const mimeToExt = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'video/mp4': '.mp4',
        'video/3gpp': '.3gp',
        'audio/mpeg': '.mp3',
        'audio/mp4': '.m4a',
        'audio/ogg': '.ogg',
        'audio/aac': '.aac'
    };
    
    return mimeToExt[mimetype] || '.bin';
}

// Download and save media
async function downloadAndSaveMedia(msgId, message, messageType, mimetype) {
    try {
        const buffer = await downloadMediaMessage(
            message,
            'buffer',
            {},
            {
                logger: { level: 'silent' },
                reuploadRequest: antideleteState.sock?.updateMediaMessage
            }
        );
        
        if (!buffer || buffer.length === 0) {
            return null;
        }
        
        const timestamp = Date.now();
        const extension = getExtensionFromMime(mimetype);
        const filename = `${messageType}_${timestamp}${extension}`;
        const filePath = path.join(MEDIA_DIR, filename);
        
        await fs.writeFile(filePath, buffer);
        
        antideleteState.mediaCache.set(msgId, {
            filePath: filePath,
            buffer: buffer,
            type: messageType,
            mimetype: mimetype,
            size: buffer.length
        });
        
        antideleteState.stats.mediaCaptured++;
        
        console.log(`📸 Antidelete: Saved ${messageType} media: ${filename} (${Math.round(buffer.length/1024)}KB)`);
        return filePath;
        
    } catch (error) {
        console.error('❌ Antidelete: Media download error:', error.message);
        return null;
    }
}

// Store incoming message
async function storeIncomingMessage(message) {
    try {
        if (!antideleteState.sock || antideleteState.mode === 'off') return;
        
        const msgKey = message.key;
        if (!msgKey || !msgKey.id || msgKey.fromMe) return;
        
        const msgId = msgKey.id;
        const chatJid = msgKey.remoteJid;
        const senderJid = msgKey.participant || chatJid;
        const pushName = message.pushName || 'Unknown';
        const timestamp = message.messageTimestamp * 1000 || Date.now();
        
        // Skip status broadcasts
        if (chatJid === 'status@broadcast') return;
        
        // Extract message content
        const msgContent = message.message;
        let type = 'text';
        let text = '';
        let hasMedia = false;
        let mediaInfo = null;
        let mimetype = '';
        
        if (msgContent?.conversation) {
            text = msgContent.conversation;
        } else if (msgContent?.extendedTextMessage?.text) {
            text = msgContent.extendedTextMessage.text;
        } else if (msgContent?.imageMessage) {
            type = 'image';
            text = msgContent.imageMessage.caption || '';
            hasMedia = true;
            mimetype = msgContent.imageMessage.mimetype || 'image/jpeg';
            mediaInfo = { message, type: 'image', mimetype };
        } else if (msgContent?.videoMessage) {
            type = 'video';
            text = msgContent.videoMessage.caption || '';
            hasMedia = true;
            mimetype = msgContent.videoMessage.mimetype || 'video/mp4';
            mediaInfo = { message, type: 'video', mimetype };
        } else if (msgContent?.audioMessage) {
            type = 'audio';
            hasMedia = true;
            mimetype = msgContent.audioMessage.mimetype || 'audio/mpeg';
            if (msgContent.audioMessage.ptt) {
                type = 'voice';
            }
            mediaInfo = { message, type: 'audio', mimetype };
        } else if (msgContent?.documentMessage) {
            type = 'document';
            text = msgContent.documentMessage.fileName || 'Document';
            hasMedia = true;
            mimetype = msgContent.documentMessage.mimetype || 'application/octet-stream';
            mediaInfo = { message, type: 'document', mimetype };
        } else if (msgContent?.stickerMessage) {
            type = 'sticker';
            hasMedia = true;
            mimetype = msgContent.stickerMessage.mimetype || 'image/webp';
            mediaInfo = { message, type: 'sticker', mimetype };
        }
        
        // Skip empty messages
        if (!text && !hasMedia) return;
        
        const messageData = {
            id: msgId,
            chatJid,
            senderJid,
            pushName,
            timestamp,
            type,
            text: text || '',
            hasMedia,
            mimetype
        };
        
        // Store in cache
        antideleteState.messageCache.set(msgId, messageData);
        antideleteState.stats.totalMessages++;
        
        // Download media if present
        if (hasMedia && mediaInfo) {
            setTimeout(async () => {
                try {
                    await downloadAndSaveMedia(msgId, mediaInfo.message, type, mediaInfo.mimetype);
                    await saveData();
                } catch (error) {
                    console.error('❌ Antidelete: Async media download failed:', error.message);
                }
            }, 1000);
        }
        
        // Save periodically
        if (antideleteState.stats.totalMessages % 20 === 0) {
            await saveData();
        }
        
        return messageData;
        
    } catch (error) {
        console.error('❌ Antidelete: Error storing message:', error.message);
        return null;
    }
}

// Handle deleted message
async function handleDeletedMessage(update) {
    try {
        if (!antideleteState.sock || antideleteState.mode === 'off') return;
        
        const msgKey = update.key;
        if (!msgKey || !msgKey.id) return;
        
        const msgId = msgKey.id;
        const chatJid = msgKey.remoteJid;
        
        // Check if message was deleted
        const isDeleted = 
            update.message === null ||
            update.update?.status === 6 ||
            update.update?.message === null ||
            update.messageStubType === 7 || // REVOKE
            update.messageStubType === 8;   // REVOKE_EVERYONE
        
        if (!isDeleted) return;
        
        console.log(`🔍 Antidelete: Checking deletion for ${msgId} in ${chatJid}`);
        
        // Get cached message
        const cachedMessage = antideleteState.messageCache.get(msgId);
        if (!cachedMessage) {
            console.log(`⚠️ Antidelete: Message ${msgId} not found in cache`);
            return;
        }
        
        // Remove from cache
        antideleteState.messageCache.delete(msgId);
        antideleteState.stats.deletedDetected++;
        
        // Send based on mode
        if (antideleteState.mode === 'private') {
            await sendToOwnerDM(cachedMessage);
            antideleteState.stats.sentToDm++;
        } else if (antideleteState.mode === 'public') {
            await sendToChat(cachedMessage, chatJid);
            antideleteState.stats.sentToChat++;
        }
        
        antideleteState.stats.retrieved++;
        await saveData();
        
        console.log(`✅ Antidelete: Retrieved deleted message from ${cachedMessage.pushName}`);
        
    } catch (error) {
        console.error('❌ Antidelete: Error handling deleted message:', error.message);
    }
}

// Send to owner DM (PRIVATE mode)
async function sendToOwnerDM(messageData) {
    try {
        if (!antideleteState.sock || !antideleteState.ownerJid) {
            console.error('❌ Antidelete: Socket or owner JID not set');
            return false;
        }
        
        const ownerJid = antideleteState.ownerJid;
        const time = new Date(messageData.timestamp).toLocaleString();
        const senderNumber = messageData.senderJid.split('@')[0];
        const chatNumber = messageData.chatJid.includes('@g.us') 
            ? 'Group Chat' 
            : messageData.chatJid.split('@')[0];
        
        let detailsText = `🗑️ *DELETED MESSAGE*\n\n`;
        detailsText += `👤 From: ${senderNumber} (${messageData.pushName})\n`;
        detailsText += `💬 Chat: ${chatNumber}\n`;
        detailsText += `🕒 Time: ${time}\n`;
        detailsText += `📝 Type: ${messageData.type.toUpperCase()}\n`;
        
        if (messageData.text) {
            detailsText += `\n📋 Content:\n${messageData.text.substring(0, 500)}`;
            if (messageData.text.length > 500) detailsText += '...';
        }
        
        detailsText += `\n\n────────────\n`;
        detailsText += `🔍 *Captured by antidelete*`;
        
        // Check if we have media
        const mediaCache = antideleteState.mediaCache.get(messageData.id);
        
        if (messageData.hasMedia && mediaCache) {
            try {
                let buffer = mediaCache.buffer;
                if (!buffer) {
                    buffer = await fs.readFile(mediaCache.filePath);
                }
                
                if (buffer && buffer.length > 0) {
                    if (messageData.type === 'sticker') {
                        // Send sticker first
                        const stickerMsg = await antideleteState.sock.sendMessage(ownerJid, {
                            sticker: buffer,
                            mimetype: mediaCache.mimetype
                        });
                        
                        // Then reply with details
                        await antideleteState.sock.sendMessage(ownerJid, { 
                            text: detailsText 
                        }, { 
                            quoted: stickerMsg 
                        });
                        
                    } else if (messageData.type === 'image') {
                        await antideleteState.sock.sendMessage(ownerJid, {
                            image: buffer,
                            caption: detailsText,
                            mimetype: mediaCache.mimetype
                        });
                    } else if (messageData.type === 'video') {
                        await antideleteState.sock.sendMessage(ownerJid, {
                            video: buffer,
                            caption: detailsText,
                            mimetype: mediaCache.mimetype
                        });
                    } else if (messageData.type === 'audio' || messageData.type === 'voice') {
                        await antideleteState.sock.sendMessage(ownerJid, {
                            audio: buffer,
                            mimetype: mediaCache.mimetype,
                            ptt: messageData.type === 'voice'
                        });
                        // Send details separately
                        await antideleteState.sock.sendMessage(ownerJid, { text: detailsText });
                    } else {
                        // For documents or unknown types
                        await antideleteState.sock.sendMessage(ownerJid, {
                            text: detailsText + `\n\n📎 Media type: ${messageData.type}`
                        });
                    }
                } else {
                    await antideleteState.sock.sendMessage(ownerJid, { text: detailsText });
                }
            } catch (mediaError) {
                console.error('❌ Antidelete: Media send error:', mediaError.message);
                await antideleteState.sock.sendMessage(ownerJid, { text: detailsText });
            }
        } else {
            await antideleteState.sock.sendMessage(ownerJid, { text: detailsText });
        }
        
        console.log(`📤 Antidelete: Sent to owner DM: ${senderNumber} → ${chatNumber}`);
        return true;
        
    } catch (error) {
        console.error('❌ Antidelete: Error sending to owner DM:', error.message);
        return false;
    }
}

// Send to chat (PUBLIC mode)
async function sendToChat(messageData, chatJid) {
    try {
        if (!antideleteState.sock) return false;
        
        const time = new Date(messageData.timestamp).toLocaleString();
        const senderNumber = messageData.senderJid.split('@')[0];
        
        let detailsText = `🗑️ *DELETED MESSAGE RETRIEVED*\n\n`;
        detailsText += `👤 From: ${senderNumber} (${messageData.pushName})\n`;
        detailsText += `🕒 Original time: ${time}\n`;
        detailsText += `📝 Type: ${messageData.type.toUpperCase()}\n`;
        
        if (messageData.text) {
            detailsText += `\n📋 Content:\n${messageData.text.substring(0, 500)}`;
            if (messageData.text.length > 500) detailsText += '...';
        }
        
        detailsText += `\n\n────────────\n`;
        detailsText += `🔍 *Retrieved by antidelete*`;
        
        // Check if we have media
        const mediaCache = antideleteState.mediaCache.get(messageData.id);
        
        if (messageData.hasMedia && mediaCache) {
            try {
                let buffer = mediaCache.buffer;
                if (!buffer) {
                    buffer = await fs.readFile(mediaCache.filePath);
                }
                
                if (buffer && buffer.length > 0) {
                    if (messageData.type === 'sticker') {
                        // Send sticker first
                        const stickerMsg = await antideleteState.sock.sendMessage(chatJid, {
                            sticker: buffer,
                            mimetype: mediaCache.mimetype
                        });
                        
                        // Then reply with details
                        await antideleteState.sock.sendMessage(chatJid, { 
                            text: detailsText 
                        }, { 
                            quoted: stickerMsg 
                        });
                        
                    } else if (messageData.type === 'image') {
                        await antideleteState.sock.sendMessage(chatJid, {
                            image: buffer,
                            caption: detailsText,
                            mimetype: mediaCache.mimetype
                        });
                    } else if (messageData.type === 'video') {
                        await antideleteState.sock.sendMessage(chatJid, {
                            video: buffer,
                            caption: detailsText,
                            mimetype: mediaCache.mimetype
                        });
                    } else if (messageData.type === 'audio' || messageData.type === 'voice') {
                        await antideleteState.sock.sendMessage(chatJid, {
                            audio: buffer,
                            mimetype: mediaCache.mimetype,
                            ptt: messageData.type === 'voice'
                        });
                        // Send details separately
                        await antideleteState.sock.sendMessage(chatJid, { text: detailsText });
                    } else {
                        // For documents or unknown types
                        await antideleteState.sock.sendMessage(chatJid, {
                            text: detailsText + `\n\n📎 Media type: ${messageData.type}`
                        });
                    }
                } else {
                    await antideleteState.sock.sendMessage(chatJid, { text: detailsText });
                }
            } catch (mediaError) {
                console.error('❌ Antidelete: Media send error:', mediaError.message);
                await antideleteState.sock.sendMessage(chatJid, { text: detailsText });
            }
        } else {
            await antideleteState.sock.sendMessage(chatJid, { text: detailsText });
        }
        
        console.log(`📤 Antidelete: Sent to chat ${chatJid}`);
        return true;
        
    } catch (error) {
        console.error('❌ Antidelete: Error sending to chat:', error.message);
        return false;
    }
}

// Setup listeners
function setupListeners(sock) {
    if (!sock) {
        console.error('❌ Antidelete: No socket provided');
        return;
    }
    
    // Set the socket
    antideleteState.sock = sock;
    
    console.log('🚀 Antidelete: Setting up listeners...');
    
    // Listen for incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            if (type !== 'notify' || antideleteState.mode === 'off') return;
            
            for (const message of messages) {
                await storeIncomingMessage(message);
            }
        } catch (error) {
            console.error('❌ Antidelete: Message storage error:', error.message);
        }
    });
    
    // Listen for message updates (deletions)
    sock.ev.on('messages.update', async (updates) => {
        try {
            if (antideleteState.mode === 'off') return;
            
            for (const update of updates) {
                await handleDeletedMessage(update);
            }
        } catch (error) {
            console.error('❌ Antidelete: Deletion detection error:', error.message);
        }
    });
    
    console.log('✅ Antidelete: Listeners active');
}

// Initialize system
async function initializeSystem(sock) {
    try {
        // Load existing data
        await loadData();
        
        // Set owner JID from socket
        if (sock.user?.id) {
            antideleteState.ownerJid = sock.user.id;
            console.log(`👑 Antidelete: Owner set to ${sock.user.id}`);
        }
        
        // Setup listeners
        setupListeners(sock);
        
        console.log(`🎯 Antidelete: System initialized`);
        console.log(`   Mode: ${antideleteState.mode.toUpperCase()}`);
        console.log(`   Status: ${antideleteState.mode === 'off' ? '❌ INACTIVE' : '✅ ACTIVE'}`);
        console.log(`   Cached: ${antideleteState.messageCache.size} messages`);
        
    } catch (error) {
        console.error('❌ Antidelete: Initialization error:', error.message);
    }
}

// Export initialization function
export async function initAntidelete(sock) {
    await initializeSystem(sock);
}

// The command module
export default {
    name: 'antidelete',
    alias: ['undelete', 'antidel', 'ad'],
    description: 'Capture deleted messages - public/private/off modes',
    category: 'utility',
    
    async execute(sock, msg, args, prefix, metadata = {}) {
        const chatId = msg.key.remoteJid;
        const command = args[0]?.toLowerCase() || 'status';
        
        // Ensure system has socket
        if (!antideleteState.sock) {
            antideleteState.sock = sock;
            setupListeners(sock);
        }
        
        // Set owner from metadata if available
        if (!antideleteState.ownerJid && metadata.OWNER_JID) {
            antideleteState.ownerJid = metadata.OWNER_JID;
        }
        
        switch (command) {
            case 'public':
                antideleteState.mode = 'public';
                await sock.sendMessage(chatId, {
                    text: `✅ *ANTIDELETE: PUBLIC MODE*\n\nDeleted messages will be shown in the chat where they were deleted.\n\nCurrent status: ✅ ACTIVE`
                }, { quoted: msg });
                break;
                
            case 'private':
                antideleteState.mode = 'private';
                await sock.sendMessage(chatId, {
                    text: `✅ *ANTIDELETE: PRIVATE MODE*\n\nDeleted messages will be sent to your DM only.\n\nCurrent status: ✅ ACTIVE\nOwner: ${antideleteState.ownerJid ? '✅ SET' : '⚠️ NOT SET'}`
                }, { quoted: msg });
                break;
                
            case 'off':
            case 'disable':
                antideleteState.mode = 'off';
                await sock.sendMessage(chatId, {
                    text: `✅ *ANTIDELETE: DISABLED*\n\nSystem is now OFF. No messages will be captured or retrieved.`
                }, { quoted: msg });
                break;
                
            case 'status':
            case 'stats':
                const statsText = `
📊 *ANTIDELETE STATISTICS*

Mode: ${antideleteState.mode.toUpperCase()}
Status: ${antideleteState.mode === 'off' ? '❌ INACTIVE' : '✅ ACTIVE'}
Owner: ${antideleteState.ownerJid ? '✅ SET' : '⚠️ NOT SET'}
Socket: ${antideleteState.sock ? '✅ CONNECTED' : '❌ DISCONNECTED'}

💡 *Commands:*
• \`${prefix}antidelete public\`
• \`${prefix}antidelete private\`
• \`${prefix}antidelete off\`
`;
                
                await sock.sendMessage(chatId, { text: statsText }, { quoted: msg });
                break;
                
            case 'test':
                // Send a test message
                const testText = `🧪 *Test Message for Antidelete*\n\nMode: ${antideleteState.mode.toUpperCase()}\nStatus: ${antideleteState.mode === 'off' ? '❌ INACTIVE' : '✅ ACTIVE'}\n\nDelete this message to test the system!`;
                
                const testMsg = await sock.sendMessage(chatId, { 
                    text: testText 
                }, { quoted: msg });
                
                // Store test message immediately
                if (testMsg?.key) {
                    const testData = {
                        id: testMsg.key.id,
                        chatJid: testMsg.key.remoteJid,
                        senderJid: antideleteState.ownerJid || testMsg.key.participant || sock.user.id,
                        pushName: 'Antidelete Test',
                        timestamp: Date.now(),
                        type: 'text',
                        text: testText,
                        hasMedia: false
                    };
                    
                    antideleteState.messageCache.set(testMsg.key.id, testData);
                    
                    await sock.sendMessage(chatId, {
                        text: `✅ Test message stored!\n\nNow delete the previous message to test antidelete.`
                    });
                }
                break;
                
            case 'clear':
            case 'clean':
                const cacheSize = antideleteState.messageCache.size;
                const mediaSize = antideleteState.mediaCache.size;
                
                antideleteState.messageCache.clear();
                antideleteState.mediaCache.clear();
                antideleteState.stats.totalMessages = 0;
                antideleteState.stats.deletedDetected = 0;
                antideleteState.stats.retrieved = 0;
                antideleteState.stats.mediaCaptured = 0;
                antideleteState.stats.sentToDm = 0;
                antideleteState.stats.sentToChat = 0;
                
                // Delete media files
                try {
                    const files = await fs.readdir(MEDIA_DIR);
                    for (const file of files) {
                        await fs.unlink(path.join(MEDIA_DIR, file));
                    }
                } catch (error) {}
                
                await saveData();
                
                await sock.sendMessage(chatId, {
                    text: `🧹 *Cache Cleared*\n\n• Messages: ${cacheSize}\n• Media files: ${mediaSize}\n\nAll data has been cleared.`
                }, { quoted: msg });
                break;
                
            case 'help':
            case 'menu':
                const helpText = `
🔍 *ANTIDELETE SYSTEM*

🎯 *Three Modes:*
1. **PUBLIC** - Shows deleted messages in the chat where they were deleted
2. **PRIVATE** - Sends deleted messages to your DM only  
3. **OFF** - System is disabled

🚀 *Commands:*
• \ ${prefix}antidelete public - Enable PUBLIC mode
• \ ${prefix}antidelete private - Enable PRIVATE mode
• \ ${prefix}antidelete off - Disable system
• \ ${prefix}antidelete status - View statistics
• \ ${prefix}antidelete test - Send test message
• \ ${prefix}antidelete clear - Clear all cache
• \ ${prefix}antidelete help - This menu

⚙️ *Supported Media:*
✅ Images (JPG, PNG, GIF, WebP)
✅ Videos (MP4, 3GP)
✅ Audio files & Voice notes
✅ Stickers (sticker + reply details)
✅ Text messages
✅ Documents

📝 *Current Status:*
Mode: ${antideleteState.mode.toUpperCase()}
Active: ${antideleteState.mode === 'off' ? '❌' : '✅'}
Cached: ${antideleteState.messageCache.size} messages
Owner: ${antideleteState.ownerJid ? '✅ SET' : '⚠️ NOT SET'}
`;
                
                await sock.sendMessage(chatId, { text: helpText }, { quoted: msg });
                break;
                
            default:
                await sock.sendMessage(chatId, {
                    text: `🔧 *Antidelete System*\n\nCurrent Mode: ${antideleteState.mode.toUpperCase()}\nStatus: ${antideleteState.mode === 'off' ? '❌ INACTIVE' : '✅ ACTIVE'}\nCached: ${antideleteState.messageCache.size} messages\n\n💡 Use ${prefix}antidelete help for commands`
                }, { quoted: msg });
        }
    }
};