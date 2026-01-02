import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  name: "start",
  description: "Start or restart the bot",
  category: "owner",
  ownerOnly: true,

  async execute(sock, m, args) {
    const jid = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    
    // Check if owner
    const isOwner = m.key.fromMe || sender.includes("947") || sender.includes("owner-number");
    if (!isOwner) {
      return sock.sendMessage(jid, {
        text: '❌ Only bot owner can use .start command'
      }, { quoted: m });
    }
    
    let statusMessage;
    try {
      // Send initial message
      statusMessage = await sock.sendMessage(jid, {
        text: '🚀 **WolfBot Start/Restart**\nInitializing...'
      }, { quoted: m });
      
      const editStatus = async (text) => {
        try {
          await sock.sendMessage(jid, {
            text,
            edit: statusMessage.key
          });
        } catch {
          // If editing fails, send new message
          const newMsg = await sock.sendMessage(jid, { text }, { quoted: m });
          statusMessage = newMsg;
        }
      };
      
      // Parse arguments
      const action = args[0]?.toLowerCase();
      const forceRestart = args.includes('force');
      const noDeps = args.includes('no-deps');
      const delay = parseInt(args.find(arg => arg.startsWith('delay='))?.split('=')[1]) || 3;
      
      // Check current bot status
      await editStatus('📊 **Checking bot status...**');
      
      let isRunning = false;
      let pm2Info = null;
      
      try {
        const pm2List = await execAsync('pm2 jlist');
        const processes = JSON.parse(pm2List.stdout);
        pm2Info = processes.find(p => 
          p.name && (p.name.includes('wolf') || p.name.includes('bot') || p.name.includes('index'))
        );
        isRunning = pm2Info && pm2Info.pm2_env?.status === 'online';
        
        if (pm2Info) {
          await editStatus(`📊 **Bot Status: ${isRunning ? '🟢 RUNNING' : '🔴 STOPPED'}**\nName: ${pm2Info.name}\nPID: ${pm2Info.pid || 'N/A'}\nUptime: ${formatUptime(pm2Info.pm2_env?.pm_uptime)}`);
        } else {
          await editStatus('📊 **Bot Status: 🔍 NOT FOUND IN PM2**\nBot not registered with PM2');
        }
      } catch (error) {
        await editStatus('⚠️ **PM2 not available or error**\nWill start bot directly');
      }
      
      // Determine action based on arguments or current state
      let finalAction = action;
      if (!finalAction) {
        if (isRunning) {
          finalAction = 'restart';
        } else {
          finalAction = 'start';
        }
      }
      
      // Handle different actions
      switch (finalAction) {
        case 'start':
          if (isRunning && !forceRestart) {
            await editStatus('✅ **Bot is already running!**\nUse `.start restart` to restart\nUse `.start stop` to stop');
            return;
          }
          await startBot(editStatus, noDeps, delay);
          break;
          
        case 'restart':
          await restartBot(editStatus, noDeps, delay, forceRestart);
          break;
          
        case 'stop':
          await stopBot(editStatus);
          break;
          
        case 'status':
          await showStatus(editStatus, pm2Info, isRunning);
          return;
          
        case 'log':
          await showLogs(editStatus, args);
          return;
          
        case 'kill':
          await killBot(editStatus);
          break;
          
        default:
          await editStatus(`❓ **Unknown action: ${finalAction}**\n\n**Available actions:**\n• start - Start the bot\n• restart - Restart the bot\n• stop - Stop the bot\n• status - Check bot status\n• log - Show recent logs\n• kill - Force kill bot\n\n**Options:**\n• no-deps - Skip dependency check\n• force - Force action\n• delay=N - Delay in seconds (default: 3)`);
          return;
      }
      
    } catch (err) {
      console.error('Start command failed:', err);
      
      let errorText = `❌ **Start Command Failed**\nError: ${err.message || err}\n\n`;
      
      if (err.message.includes('timeout')) {
        errorText += '**Reason:** Operation timed out\n';
        errorText += '**Solution:** Try `.start kill` then `.start`\n';
      } else if (err.message.includes('ENOENT') || err.message.includes('not found')) {
        errorText += '**Reason:** Required files not found\n';
        errorText += '**Solution:** Check if bot files exist\n';
      } else if (err.message.includes('EADDRINUSE')) {
        errorText += '**Reason:** Port already in use\n';
        errorText += '**Solution:** Use `.start kill` to free port\n';
      }
      
      try {
        if (statusMessage?.key) {
          await sock.sendMessage(jid, { text: errorText, edit: statusMessage.key });
        } else {
          await sock.sendMessage(jid, { text: errorText }, { quoted: m });
        }
      } catch {
        // Ignore if can't send error
      }
    }
  }
};

/* -------------------- Action Functions -------------------- */

async function startBot(editStatus, noDeps, delay) {
  await editStatus('🚀 **Starting WolfBot...**\nChecking system requirements...');
  
  // Check Node.js version
  try {
    const nodeVersion = await execAsync('node --version');
    await editStatus(`✅ **Node.js:** ${nodeVersion.stdout.trim()}`);
  } catch {
    await editStatus('⚠️ **Warning:** Node.js not found or version issue');
  }
  
  // Check main file exists
  const mainFiles = ['index.js', 'main.js', 'bot.js', 'app.js'];
  let mainFile = null;
  
  for (const file of mainFiles) {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      mainFile = file;
      break;
    }
  }
  
  if (!mainFile) {
    throw new Error('No main bot file found (index.js, main.js, bot.js, app.js)');
  }
  
  await editStatus(`✅ **Main file:** ${mainFile}`);
  
  // Check and install dependencies if needed
  if (!noDeps) {
    await editStatus('📦 **Checking dependencies...**');
    
    if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
      await editStatus('📦 **Installing dependencies...**\nThis may take a minute...');
      
      try {
        // Check if package.json exists
        if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
          // Use npm ci for clean install
          await execAsync('npm ci --no-audit --no-fund --silent', { timeout: 180000 });
          await editStatus('✅ **Dependencies installed successfully**');
        } else {
          await editStatus('⚠️ **No package.json found**\nSkipping dependency installation');
        }
      } catch (npmError) {
        console.warn('Dependency install failed:', npmError);
        await editStatus('⚠️ **Dependency installation failed**\nTrying alternative method...');
        
        try {
          await execAsync('npm install --no-audit --no-fund --loglevel=error', { timeout: 180000 });
          await editStatus('✅ **Dependencies installed with fallback method**');
        } catch {
          await editStatus('⚠️ **Could not install dependencies**\nBot may fail to start');
        }
      }
    } else {
      await editStatus('✅ **Dependencies already installed**');
    }
  } else {
    await editStatus('⏭️ **Skipping dependency check**');
  }
  
  // Check PM2
  await editStatus('⚙️ **Checking PM2...**');
  
  try {
    await execAsync('pm2 --version');
    await editStatus('✅ **PM2 is installed**');
  } catch {
    await editStatus('⚠️ **PM2 not found**\nWill start without PM2');
  }
  
  // Start bot with PM2 if available
  try {
    await editStatus(`⏳ **Starting bot in ${delay} seconds...**\nPreparing startup...`);
    
    // Countdown
    for (let i = delay; i > 0; i--) {
      await editStatus(`⏳ **Starting in ${i} seconds...**\nPreparing startup...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await editStatus('🚀 **Launching bot now!**');
    
    // Try to start with PM2
    try {
      // Check if already registered
      const pm2List = await execAsync('pm2 jlist');
      const processes = JSON.parse(pm2List.stdout);
      const botProcess = processes.find(p => 
        p.name && (p.name.includes('wolf') || p.name.includes('bot'))
      );
      
      if (botProcess) {
        await editStatus('🔄 **Restarting existing PM2 process...**');
        await execAsync(`pm2 restart ${botProcess.name} --update-env`);
      } else {
        await editStatus('📝 **Registering new PM2 process...**');
        await execAsync(`pm2 start ${mainFile} --name "wolf-bot" --time`);
      }
      
      // Save PM2 process list
      await execAsync('pm2 save');
      
      await editStatus('✅ **Bot started successfully with PM2!**\n\n**Useful commands:**\n`.start status` - Check status\n`.start log` - View logs\n`.start stop` - Stop bot\n\nBot should be online shortly...');
      
    } catch (pm2Error) {
      console.warn('PM2 start failed, trying direct start:', pm2Error);
      
      // Fallback: Start directly with Node.js
      await editStatus('⚠️ **PM2 start failed, starting directly...**');
      
      // Start in background
      const startCmd = process.platform === 'win32' 
        ? `start cmd /c "node ${mainFile}"`
        : `node ${mainFile} > bot.log 2>&1 &`;
      
      await execAsync(startCmd);
      
      await editStatus('✅ **Bot started directly!**\n\n**Note:** Running without PM2\nUse Ctrl+C in terminal to stop\n\nBot should be online shortly...');
    }
    
    // Optional: Send follow-up status after 10 seconds
    setTimeout(async () => {
      try {
        const pm2List = await execAsync('pm2 jlist');
        const processes = JSON.parse(pm2List.stdout);
        const botProcess = processes.find(p => 
          p.name && (p.name.includes('wolf') || p.name.includes('bot'))
        );
        
        if (botProcess && botProcess.pm2_env?.status === 'online') {
          await editStatus('🟢 **Bot is now ONLINE!**\nStatus: Running\nPID: ' + botProcess.pid);
        }
      } catch {
        // Ignore if can't check status
      }
    }, 10000);
    
  } catch (error) {
    throw new Error(`Failed to start bot: ${error.message}`);
  }
}

async function restartBot(editStatus, noDeps, delay, force) {
  await editStatus('🔄 **Restarting WolfBot...**');
  
  // Stop first
  try {
    await execAsync('pm2 stop wolf-bot --silent');
    await editStatus('⏸️ **Bot stopped**\nWaiting for cleanup...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch {
    // Ignore if stop fails
  }
  
  // Start again
  await startBot(editStatus, noDeps, delay);
}

async function stopBot(editStatus) {
  await editStatus('🛑 **Stopping WolfBot...**');
  
  try {
    await execAsync('pm2 stop wolf-bot --silent');
    await editStatus('✅ **Bot stopped successfully**\n\nTo start again: `.start`');
  } catch (error) {
    // Try force stop
    try {
      await execAsync('pm2 delete wolf-bot --silent');
      await editStatus('✅ **Bot removed from PM2**\n\nTo start again: `.start`');
    } catch {
      // Try killing by port or process
      await editStatus('⚠️ **Could not stop via PM2**\nTrying alternative methods...');
      
      try {
        // Find and kill Node processes
        if (process.platform === 'win32') {
          await execAsync('taskkill /F /IM node.exe');
        } else {
          await execAsync('pkill -f "node.*(index|main|bot|app).js"');
        }
        await editStatus('✅ **Bot processes killed**\n\nTo start again: `.start`');
      } catch {
        throw new Error('Could not stop bot processes');
      }
    }
  }
}

async function showStatus(editStatus, pm2Info, isRunning) {
  if (!pm2Info) {
    await editStatus('🔍 **No PM2 process found**\nBot may not be running via PM2\n\nTry: `.start` to start the bot');
    return;
  }
  
  const status = pm2Info.pm2_env?.status || 'unknown';
  const uptime = formatUptime(pm2Info.pm2_env?.pm_uptime);
  const memory = formatBytes(pm2Info.monit?.memory || 0);
  const cpu = pm2Info.monit?.cpu || 0;
  
  let statusText = `📊 **WolfBot Status**\n\n`;
  statusText += `**Status:** ${status === 'online' ? '🟢 RUNNING' : '🔴 STOPPED'}\n`;
  statusText += `**Name:** ${pm2Info.name || 'N/A'}\n`;
  statusText += `**PID:** ${pm2Info.pid || 'N/A'}\n`;
  statusText += `**Uptime:** ${uptime}\n`;
  statusText += `**Memory:** ${memory}\n`;
  statusText += `**CPU:** ${cpu}%\n`;
  statusText += `**Restarts:** ${pm2Info.pm2_env?.restart_time || 0}\n`;
  
  if (pm2Info.pm2_env?.pm_exec_path) {
    const execPath = pm2Info.pm2_env.pm_exec_path;
    const fileName = path.basename(execPath);
    statusText += `**File:** ${fileName}\n`;
  }
  
  statusText += `\n**Commands:**\n`;
  statusText += `• \`.start restart\` - Restart bot\n`;
  statusText += `• \`.start stop\` - Stop bot\n`;
  statusText += `• \`.start log\` - View logs\n`;
  statusText += `• \`.start kill\` - Force kill\n`;
  
  await editStatus(statusText);
}

async function showLogs(editStatus, args) {
  const lines = parseInt(args.find(arg => arg.startsWith('lines='))?.split('=')[1]) || 50;
  const follow = args.includes('follow');
  
  await editStatus(`📋 **Fetching last ${lines} lines of logs...**`);
  
  try {
    let logs;
    if (follow) {
      // For following logs, we can't show in chat - give instructions
      await editStatus(`🔍 **To follow logs in real-time:**\n\n1. SSH into your server\n2. Run: \`pm2 logs wolf-bot\`\n3. Or: \`tail -f bot.log\`\n\nFor last ${lines} lines: \`.start log lines=${lines}\``);
      return;
    } else {
      // Get last N lines from PM2
      logs = await execAsync(`pm2 logs wolf-bot --lines ${lines} --nostream`);
    }
    
    const logText = logs.stdout || logs;
    
    // Truncate if too long for WhatsApp
    if (logText.length > 4000) {
      const truncated = logText.slice(-4000);
      const linesArray = truncated.split('\n');
      // Keep last 40 lines
      const recentLines = linesArray.slice(Math.max(linesArray.length - 40, 0)).join('\n');
      
      await editStatus(`📋 **Last 40 lines of logs:**\n\`\`\`\n${recentLines}\n\`\`\`\n\n**Full logs are too long for chat**\nView with: \`pm2 logs wolf-bot\``);
    } else {
      await editStatus(`📋 **Bot Logs (last ${lines} lines):**\n\`\`\`\n${logText}\n\`\`\``);
    }
    
  } catch (error) {
    // Try to read from log file directly
    try {
      const logFile = path.join(process.cwd(), 'bot.log');
      if (fs.existsSync(logFile)) {
        const logContent = fs.readFileSync(logFile, 'utf8');
        const linesArray = logContent.split('\n');
        const lastLines = linesArray.slice(Math.max(linesArray.length - lines, 0)).join('\n');
        
        await editStatus(`📋 **Bot Logs from file:**\n\`\`\`\n${lastLines}\n\`\`\``);
      } else {
        throw new Error('No logs available');
      }
    } catch {
      await editStatus('❌ **Could not retrieve logs**\n\nTry:\n1. \`pm2 logs wolf-bot\` on server\n2. Check bot.log file\n3. Bot may not be running');
    }
  }
}

async function killBot(editStatus) {
  await editStatus('💀 **Force killing all bot processes...**\nThis will stop ALL Node.js processes!');
  
  try {
    if (process.platform === 'win32') {
      await execAsync('taskkill /F /IM node.exe');
      await editStatus('✅ **All Node.js processes killed**\n\n**Warning:** This may affect other Node apps\n\nStart bot with: `.start`');
    } else {
      await execAsync('pkill -9 -f node');
      await editStatus('✅ **All Node.js processes killed**\n\n**Warning:** This may affect other Node apps\n\nStart bot with: `.start`');
    }
  } catch (error) {
    await editStatus('⚠️ **Some processes may still be running**\n\nTry manually:\n• Linux: `pkill -9 node`\n• Windows: Close terminal\n\nThen: `.start`');
  }
}

/* -------------------- Utility Functions -------------------- */

function formatUptime(uptimeMs) {
  if (!uptimeMs) return '0s';
  
  const seconds = Math.floor((Date.now() - uptimeMs) / 1000);
  
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}