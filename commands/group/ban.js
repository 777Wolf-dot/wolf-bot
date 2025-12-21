import fs from 'fs';

const banFile = './lib/banned.json';

// ===== Helper functions =====
function loadBans() {
    try {
        if (!fs.existsSync(banFile)) {
            fs.writeFileSync(banFile, '[]');
            return [];
        }
        const data = JSON.parse(fs.readFileSync(banFile, 'utf8'));
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error loading bans:', error);
        return [];
    }
}

function saveBans(bans) {
    try {
        fs.writeFileSync(banFile, JSON.stringify(bans, null, 2));
    } catch (error) {
        console.error('Error saving bans:', error);
    }
}

// Global variable to track if listener is attached
let banListenerAttached = false;

export default {
    name: 'ban',
    description: 'Ban a user from the group',
    category: 'group',
    async execute(sock, msg, args) {
        const chatId = msg.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        if (!isGroup) {
            return sock.sendMessage(chatId, { text: '❌ This command can only be used in groups.' }, { quoted: msg });
        }

        // Get group metadata to check admin status
        let metadata;
        try {
            metadata = await sock.groupMetadata(chatId);
        } catch (error) {
            console.error('Error fetching group metadata:', error);
            return sock.sendMessage(chatId, { text: '❌ Failed to fetch group information.' }, { quoted: msg });
        }

        // Get sender ID correctly
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isAdmin = metadata.participants.some(
            p => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin')
        );

        if (!isAdmin) {
            return sock.sendMessage(chatId, { text: '🛑 Only group admins can use this command.' }, { quoted: msg });
        }

        // Check for mentioned user or reply
        let mentionedJid;
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            mentionedJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            // If replying to a user
            mentionedJid = msg.message.extendedTextMessage.contextInfo.participant;
        } else if (args[0] && args[0].includes('@')) {
            // If user ID is provided as argument
            mentionedJid = args[0].includes('@s.whatsapp.net') ? args[0] : args[0] + '@s.whatsapp.net';
        } else {
            return sock.sendMessage(chatId, { 
                text: '⚠️ Please mention or reply to the user you want to ban.\nUsage: .ban @user' 
            }, { quoted: msg });
        }

        // Remove bot if accidentally mentioned
        if (mentionedJid.includes(sock.user.id.split(':')[0])) {
            return sock.sendMessage(chatId, { text: '😂 I cannot ban myself!' }, { quoted: msg });
        }

        let bans = loadBans();
        const userId = mentionedJid.split('@')[0];
        
        if (!bans.includes(mentionedJid)) {
            bans.push(mentionedJid);
            saveBans(bans);
        }

        try {
            // Kick user from group
            await sock.groupParticipantsUpdate(chatId, [mentionedJid], 'remove');
            
            await sock.sendMessage(chatId, { 
                text: `🚫 @${userId} has been banned from this group!`, 
                mentions: [mentionedJid] 
            }, { quoted: msg });
            
            console.log(`✅ Banned ${mentionedJid} from ${chatId}`);
        } catch (error) {
            console.error('Ban error:', error);
            
            let errorMessage = '❌ Failed to ban user.';
            if (error.message?.includes('not authorized')) {
                errorMessage = '❌ I need to be an admin to remove users.';
            } else if (error.message?.includes('not in group')) {
                errorMessage = '❌ User is not in this group.';
            }
            
            await sock.sendMessage(chatId, { text: errorMessage }, { quoted: msg });
        }

        // ===== AUTO-KICK HOOK =====
        if (!banListenerAttached && sock.ev) {
            console.log('🔗 Attaching ban auto-kick listener...');
            
            sock.ev.on('group-participants.update', async (update) => {
                try {
                    // Check if this is a group
                    if (!update.id.endsWith('@g.us')) return;
                    
                    const bansList = loadBans();
                    
                    if (update.action === 'add') {
                        for (const participant of update.participants) {
                            if (bansList.includes(participant)) {
                                console.log(`🚫 Auto-kicking banned user ${participant} from ${update.id}`);
                                
                                // Small delay to ensure user is fully added
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                
                                try {
                                    await sock.groupParticipantsUpdate(update.id, [participant], 'remove');
                                    console.log(`✅ Auto-kicked ${participant} from ${update.id}`);
                                    
                                    // Optional: Send notification
                                    // await sock.sendMessage(update.id, { 
                                    //     text: `🚫 @${participant.split('@')[0]} is banned and has been removed.`,
                                    //     mentions: [participant]
                                    // });
                                } catch (kickError) {
                                    console.error('Auto-kick error:', kickError);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error in ban listener:', error);
                }
            });
            
            banListenerAttached = true;
            console.log('✅ Ban auto-kick listener attached');
        }
    }
};