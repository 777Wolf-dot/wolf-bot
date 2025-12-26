import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced exec with timeout
async function run(cmd, timeout = 30000) {
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout });
    if (stderr && !stderr.includes('warning')) {
      console.warn(`Command stderr: ${stderr}`);
    }
    return stdout.trim();
  } catch (error) {
    console.error(`Command failed: ${cmd}`, error.message);
    throw error;
  }
}

// Load settings
async function loadSettings() {
  const possiblePaths = [
    path.join(process.cwd(), "settings.js"),
    path.join(process.cwd(), "config", "settings.js"),
    path.join(__dirname, "..", "settings.js"),
    path.join(__dirname, "..", "..", "settings.js"),
  ];
  
  for (const settingsPath of possiblePaths) {
    try {
      if (fs.existsSync(settingsPath)) {
        console.log(`Loading settings from: ${settingsPath}`);
        const module = await import(`file://${settingsPath}`);
        return module.default || module;
      }
    } catch (error) {
      console.warn(`Failed to load settings from ${settingsPath}:`, error.message);
      continue;
    }
  }
  
  console.warn("No settings file found, using empty settings");
  return {};
}

// Check if process manager is available
async function detectProcessManager() {
  try {
    if (await run("which pm2").then(() => true).catch(() => false)) {
      return "pm2";
    } else if (await run("which forever").then(() => true).catch(() => false)) {
      return "forever";
    } else if (await run("which nodemon").then(() => true).catch(() => false)) {
      return "nodemon";
    } else {
      return "node";
    }
  } catch (error) {
    return "node";
  }
}

// Check if bot is already running
async function checkBotStatus() {
  try {
    const pm = await detectProcessManager();
    
    switch (pm) {
      case "pm2":
        try {
          const pm2List = await run("pm2 jlist");
          const processes = JSON.parse(pm2List);
          
          // Look for bot processes
          const botProcesses = processes.filter(p => 
            p.name && (p.name.includes("wolf") || 
                      p.name.includes("bot") || 
                      p.name.includes("whatsapp") ||
                      p.pm2_env.PWD === process.cwd())
          );
          
          return {
            isRunning: botProcesses.length > 0,
            manager: "pm2",
            processes: botProcesses,
            allProcesses: processes.length,
            botProcessCount: botProcesses.length
          };
        } catch (error) {
          return { isRunning: false, manager: "pm2", error: error.message };
        }
        
      case "forever":
        try {
          const foreverList = await run("forever list");
          // Parse forever output to find our bot
          const lines = foreverList.split('\n');
          const botProcesses = lines.filter(line => 
            line.includes(process.cwd()) || 
            line.includes("wolf") ||
            line.includes("bot")
          );
          
          return {
            isRunning: botProcesses.length > 0,
            manager: "forever",
            processes: botProcesses,
            processCount: lines.filter(l => l.includes('pid')).length
          };
        } catch (error) {
          return { isRunning: false, manager: "forever", error: error.message };
        }
        
      default:
        // Check if process is already running by looking for node processes
        try {
          const nodeProcesses = await run(`ps aux | grep -E "node.*(${process.cwd()}|index.js|main.js|app.js)" | grep -v grep`);
          return {
            isRunning: nodeProcesses.length > 0,
            manager: "direct",
            processes: nodeProcesses.split('\n').filter(Boolean),
            processCount: nodeProcesses.split('\n').filter(Boolean).length
          };
        } catch (error) {
          return { isRunning: false, manager: "direct" };
        }
    }
  } catch (error) {
    return { isRunning: false, manager: "unknown", error: error.message };
  }
}

// Get system information
async function getSystemInfo() {
  const info = {
    platform: os.platform(),
    arch: os.arch(),
    uptime: formatUptime(os.uptime()),
    totalMemory: formatBytes(os.totalmem()),
    freeMemory: formatBytes(os.freemem()),
    loadAvg: os.loadavg().map(n => n.toFixed(2)).join(', '),
    cpus: os.cpus().length,
    nodeVersion: process.version,
    cwd: process.cwd()
  };

  // Get bot package info
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      info.botName = packageJson.name || "WolfBot";
      info.botVersion = packageJson.version || "Unknown";
      info.mainFile = packageJson.main || "index.js";
      info.scripts = packageJson.scripts || {};
    } else {
      info.botName = "WolfBot";
      info.botVersion = "Unknown";
      info.mainFile = "index.js";
    }
  } catch (error) {
    info.botName = "WolfBot";
    info.botVersion = "Unknown";
    info.mainFile = "index.js";
  }

  return info;
}

// Find the main bot file
function findMainBotFile() {
  const possibleFiles = [
    "index.js",
    "main.js",
    "app.js",
    "bot.js",
    "start.js",
    "server.js"
  ];

  for (const file of possibleFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      return file;
    }
  }

  // Check package.json for main file
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      if (packageJson.main && fs.existsSync(path.join(process.cwd(), packageJson.main))) {
        return packageJson.main;
      }
    }
  } catch (error) {
    console.warn("Could not read package.json:", error.message);
  }

  return "index.js";
}

// Check dependencies
async function checkDependencies() {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packagePath)) {
      return { hasPackageJson: false, message: "No package.json found" };
    }

    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      return { 
        installed: false, 
        dependencies: Object.keys(packageJson.dependencies || {}).length,
        devDependencies: Object.keys(packageJson.devDependencies || {}).length,
        message: "node_modules not found - dependencies need to be installed"
      };
    }

    // Check if node_modules is empty
    const nodeModulesContent = fs.readdirSync(nodeModulesPath);
    if (nodeModulesContent.length === 0) {
      return { 
        installed: false, 
        dependencies: Object.keys(packageJson.dependencies || {}).length,
        message: "node_modules is empty"
      };
    }

    return { 
      installed: true, 
      dependencies: Object.keys(packageJson.dependencies || {}).length,
      devDependencies: Object.keys(packageJson.devDependencies || {}).length,
      message: "Dependencies are installed"
    };
  } catch (error) {
    return { installed: false, message: `Error checking dependencies: ${error.message}` };
  }
}

// Install dependencies
async function installDependencies() {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packagePath)) {
      return { success: false, message: "No package.json found" };
    }

    console.log("📦 Installing dependencies...");
    
    // Check if we should use npm or yarn
    let packageManager = "npm";
    if (await run("which yarn").then(() => true).catch(() => false)) {
      packageManager = "yarn";
    }

    let installCmd;
    if (packageManager === "yarn") {
      installCmd = "yarn install --silent --no-progress";
    } else {
      installCmd = "npm install --no-audit --no-fund --loglevel=error --no-progress";
    }

    console.log(`Using ${packageManager} to install dependencies...`);
    const result = await run(installCmd, 300000); // 5 minute timeout for npm install
    
    return { 
      success: true, 
      packageManager,
      message: `Dependencies installed successfully using ${packageManager}`
    };
  } catch (error) {
    return { success: false, message: `Failed to install dependencies: ${error.message}` };
  }
}

// Start the bot
async function startBot(options = {}) {
  const {
    manager = "auto",
    installDeps = false,
    force = false,
    mode = "production"
  } = options;

  try {
    console.log(`🚀 Starting bot with options:`, options);
    
    // Check current status first
    const status = await checkBotStatus();
    if (status.isRunning && !force) {
      return { 
        success: false, 
        alreadyRunning: true,
        manager: status.manager,
        message: "Bot is already running. Use --force to start anyway."
      };
    }
    
    // Check and install dependencies if needed
    if (installDeps) {
      const depsStatus = await checkDependencies();
      if (!depsStatus.installed) {
        console.log("Installing dependencies...");
        const installResult = await installDependencies();
        if (!installResult.success) {
          return { 
            success: false, 
            message: `Failed to install dependencies: ${installResult.message}` 
          };
        }
      }
    }
    
    // Determine process manager
    let actualManager = manager;
    if (manager === "auto") {
      actualManager = await detectProcessManager();
    }
    
    // Find main file
    const mainFile = findMainBotFile();
    console.log(`Using main file: ${mainFile}`);
    
    let startCmd;
    let startMethod;
    
    switch (actualManager) {
      case "pm2":
        // Check if bot is already in pm2 list
        try {
          const pm2List = await run("pm2 jlist").catch(() => "[]");
          const processes = JSON.parse(pm2List);
          const botProcess = processes.find(p => 
            p.pm2_env.PWD === process.cwd() || 
            p.name === "wolf-bot" ||
            p.name === "whatsapp-bot"
          );
          
          const botName = "wolf-bot-" + Date.now();
          
          if (botProcess && !force) {
            startCmd = `pm2 restart ${botProcess.name}`;
            startMethod = "pm2-restart";
          } else {
            // Start new process
            const envVars = mode === "development" ? "NODE_ENV=development" : "NODE_ENV=production";
            startCmd = `pm2 start ${mainFile} --name "${botName}" --time -- ${envVars}`;
            startMethod = "pm2-start";
          }
        } catch (error) {
          // Fallback to simple start
          const botName = "wolf-bot-" + Date.now();
          const envVars = mode === "development" ? "NODE_ENV=development" : "NODE_ENV=production";
          startCmd = `pm2 start ${mainFile} --name "${botName}" --time -- ${envVars}`;
          startMethod = "pm2-start-fallback";
        }
        break;
        
      case "forever":
        startCmd = `forever start -a -l ${path.join(process.cwd(), 'logs/forever.log')} ${mainFile}`;
        startMethod = "forever-start";
        break;
        
      case "nodemon":
        if (mode === "development") {
          startCmd = `nodemon ${mainFile}`;
        } else {
          startCmd = `nodemon --exitcrash ${mainFile}`;
        }
        startMethod = "nodemon";
        break;
        
      case "node":
      default:
        // Start directly with node
        const envPrefix = mode === "development" ? "NODE_ENV=development " : "NODE_ENV=production ";
        startCmd = `${envPrefix}node ${mainFile}`;
        startMethod = "node-direct";
        break;
    }
    
    console.log(`Starting bot with: ${startCmd}`);
    console.log(`Method: ${startMethod}, Manager: ${actualManager}`);
    
    // Execute start command
    let result;
    if (startMethod.includes("nodemon") || startMethod === "node-direct") {
      // These need to run in background
      const backgroundCmd = `nohup ${startCmd} > ${path.join(process.cwd(), 'logs/start.log')} 2>&1 & echo $!`;
      result = await run(backgroundCmd);
    } else {
      result = await run(startCmd);
    }
    
    // Wait a bit for process to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify it's running
    const newStatus = await checkBotStatus();
    
    if (newStatus.isRunning) {
      return {
        success: true,
        manager: actualManager,
        method: startMethod,
        command: startCmd,
        result: result.substring(0, 500), // Limit result length
        status: newStatus,
        message: `✅ Bot started successfully using ${actualManager}`
      };
    } else {
      return {
        success: false,
        manager: actualManager,
        method: startMethod,
        command: startCmd,
        result,
        message: "Bot may have failed to start. Check logs for details."
      };
    }
    
  } catch (error) {
    console.error("Start bot error:", error);
    return {
      success: false,
      error: error.message,
      message: `Failed to start bot: ${error.message}`
    };
  }
}

// Format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

// Format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Progress bar
function getProgressBar(percentage, length = 10) {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '▒'.repeat(empty);
}

// Main start command
export default {
  name: "start",
  description: "Start the bot with various options",
  category: "owner",
  ownerOnly: true,

  async execute(sock, m, args) {
    const jid = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    
    // Send initial message
    const initialMessage = await sock.sendMessage(jid, { 
      text: "🚀 WolfBot Start System\nInitializing startup process..."
    }, { quoted: m });
    
    let messageKey = initialMessage.key;
    
    // Edit message helper
    const editMessage = async (text) => {
      try {
        await sock.sendMessage(jid, { 
          text,
          edit: messageKey
        }, { quoted: m });
      } catch (error) {
        console.log("Could not edit message:", error.message);
        const newMsg = await sock.sendMessage(jid, { text }, { quoted: m });
        messageKey = newMsg.key;
      }
    };

    try {
      // Load settings
      await editMessage("🔍 Loading bot settings...");
      const settings = await loadSettings();
      
      // Check if owner
      const isOwner = m.key.fromMe || 
        (settings.ownerNumber && sender.includes(settings.ownerNumber)) ||
        (settings.botOwner && sender.includes(settings.botOwner));
      
      if (!isOwner) {
        await editMessage("❌ Permission Denied\nOnly the bot owner can start the bot.");
        return;
      }
      
      // Parse arguments
      const manager = args.find(arg => arg.startsWith('manager='))?.split('=')[1] || "auto";
      const mode = args.includes('dev') || args.includes('development') ? "development" : "production";
      const installDeps = args.includes('install') || args.includes('--install');
      const force = args.includes('force') || args.includes('--force');
      const checkOnly = args.includes('check') || args.includes('--check');
      
      // Get system info
      await editMessage("📊 Checking system status...");
      const systemInfo = await getSystemInfo();
      
      // Check current status
      const status = await checkBotStatus();
      
      // Show status information
      let statusText = `🤖 *Bot Status*\n`;
      statusText += `• Running: ${status.isRunning ? '✅ Yes' : '❌ No'}\n`;
      statusText += `• Process Manager: ${status.manager}\n`;
      
      if (status.isRunning) {
        statusText += `• Processes: ${status.botProcessCount || status.processCount || 0}\n`;
        if (status.processes && Array.isArray(status.processes)) {
          statusText += `• Details: ${status.processes.length} process(es) detected\n`;
        }
      }
      
      statusText += `\n🖥️ *System Information*\n`;
      statusText += `• Bot: ${systemInfo.botName} v${systemInfo.botVersion}\n`;
      statusText += `• Node.js: ${systemInfo.nodeVersion}\n`;
      statusText += `• OS: ${systemInfo.platform} ${systemInfo.arch}\n`;
      statusText += `• CPUs: ${systemInfo.cpus}\n`;
      statusText += `• Memory: ${systemInfo.freeMemory} free of ${systemInfo.totalMemory}\n`;
      statusText += `• Load Average: ${systemInfo.loadAvg}\n`;
      statusText += `• System Uptime: ${systemInfo.uptime}\n`;
      
      // Check dependencies
      await editMessage("📦 Checking dependencies...");
      const depsStatus = await checkDependencies();
      
      statusText += `\n📦 *Dependencies*\n`;
      statusText += `• Status: ${depsStatus.installed ? '✅ Installed' : '❌ Not installed'}\n`;
      statusText += `• Dependencies: ${depsStatus.dependencies || 0}\n`;
      if (depsStatus.devDependencies) {
        statusText += `• Dev Dependencies: ${depsStatus.devDependencies}\n`;
      }
      statusText += `• Message: ${depsStatus.message}\n`;
      
      // Find main file
      const mainFile = findMainBotFile();
      statusText += `\n📁 *Bot Configuration*\n`;
      statusText += `• Main File: ${mainFile}\n`;
      statusText += `• Working Directory: ${systemInfo.cwd}\n`;
      statusText += `• Mode: ${mode.toUpperCase()}\n`;
      
      await editMessage(statusText);
      
      // If just checking, stop here
      if (checkOnly) {
        await editMessage(statusText + "\n\n✅ Status check completed.");
        return;
      }
      
      // If already running and not forced
      if (status.isRunning && !force) {
        const confirmText = 
          `⚠️ *Bot Already Running*\n\n` +
          `The bot is currently running with ${status.manager}.\n\n` +
          `Options:\n` +
          `• Use \`!restart\` to restart the bot\n` +
          `• Use \`!stop\` to stop the bot first\n` +
          `• Add \`force\` to start anyway (may cause conflicts)\n\n` +
          `To force start, reply with \`force\` within 30 seconds.`;
        
        await editMessage(confirmText);
        
        // Wait for force confirmation
        let forceConfirmed = false;
        const listener = async ({ messages }) => {
          for (const msg of messages) {
            if (msg.key.remoteJid !== jid) continue;
            const msgSender = msg.key.participant || msg.key.remoteJid;
            if (msgSender !== sender) continue;
            
            const text = msg.message?.conversation || 
                        msg.message?.extendedTextMessage?.text || "";
            
            if (text.toLowerCase() === 'force') {
              forceConfirmed = true;
              sock.ev.off('messages.upsert', listener);
            }
          }
        };
        
        sock.ev.on('messages.upsert', listener);
        
        for (let i = 0; i < 30; i++) {
          if (forceConfirmed) break;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        sock.ev.off('messages.upsert', listener);
        
        if (!forceConfirmed) {
          await editMessage("⏰ Force start not confirmed. Operation cancelled.");
          return;
        }
      }
      
      // Show start configuration
      const startConfigText = 
        `⚙️ *Start Configuration*\n\n` +
        `• Manager: ${manager}\n` +
        `• Mode: ${mode}\n` +
        `• Install Dependencies: ${installDeps ? 'Yes' : 'No'}\n` +
        `• Force Start: ${force || forceConfirmed ? 'Yes' : 'No'}\n` +
        `• Main File: ${mainFile}\n\n` +
        `Reply with \`start\` within 30 seconds to begin or \`cancel\` to abort.`;
      
      await editMessage(startConfigText);
      
      // Wait for start confirmation
      let startConfirmed = false;
      let cancelled = false;
      
      const startListener = async ({ messages }) => {
        for (const msg of messages) {
          if (msg.key.remoteJid !== jid) continue;
          const msgSender = msg.key.participant || msg.key.remoteJid;
          if (msgSender !== sender) continue;
          
          const text = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || "";
          
          if (text.toLowerCase() === 'start') {
            startConfirmed = true;
            sock.ev.off('messages.upsert', startListener);
          } else if (text.toLowerCase() === 'cancel') {
            cancelled = true;
            sock.ev.off('messages.upsert', startListener);
          }
        }
      };
      
      sock.ev.on('messages.upsert', startListener);
      
      for (let i = 0; i < 30; i++) {
        if (startConfirmed || cancelled) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      sock.ev.off('messages.upsert', startListener);
      
      if (cancelled) {
        await editMessage("❌ Start cancelled by user.");
        return;
      }
      
      if (!startConfirmed) {
        await editMessage("⏰ Start confirmation timeout. Operation cancelled.");
        return;
      }
      
      // Start the bot
      await editMessage("🚀 Starting bot...\nPlease wait, this may take a moment.");
      
      // Install dependencies if needed
      if (installDeps && !depsStatus.installed) {
        await editMessage("📦 Installing dependencies...\nThis may take a few minutes.");
        const installResult = await installDependencies();
        
        if (!installResult.success) {
          await editMessage(`❌ Failed to install dependencies:\n${installResult.message}`);
          return;
        }
        
        await editMessage(`✅ Dependencies installed successfully!\nUsing ${installResult.packageManager}`);
      }
      
      // Actually start the bot
      const startOptions = {
        manager: manager === "auto" ? "auto" : manager,
        installDeps: false, // Already handled if needed
        force: force || forceConfirmed,
        mode
      };
      
      const startResult = await startBot(startOptions);
      
      if (startResult.success) {
        // Success message
        let successText = `✅ *Bot Started Successfully!*\n\n`;
        successText += `• Manager: ${startResult.manager}\n`;
        successText += `• Method: ${startResult.method}\n`;
        successText += `• Status: Running ✅\n`;
        
        if (startResult.status && startResult.status.processes) {
          successText += `• Processes: ${startResult.status.botProcessCount || startResult.status.processes.length}\n`;
        }
        
        successText += `\n📊 *Quick Stats*\n`;
        successText += `• Uptime: Just started\n`;
        successText += `• Memory: ${systemInfo.freeMemory} free\n`;
        successText += `• Mode: ${mode.toUpperCase()}\n`;
        
        successText += `\n🔧 *Next Steps*\n`;
        successText += `• Use \`!status\` to check bot status\n`;
        successText += `• Use \`!restart\` to restart if needed\n`;
        successText += `• Use \`!stop\` to stop the bot\n`;
        successText += `• Check logs for startup messages\n`;
        
        await editMessage(successText);
      } else {
        // Error message
        let errorText = `❌ *Failed to Start Bot*\n\n`;
        errorText += `• Manager: ${startResult.manager || 'Unknown'}\n`;
        errorText += `• Error: ${startResult.message || 'Unknown error'}\n`;
        
        if (startResult.error) {
          errorText += `• Details: ${startResult.error.substring(0, 200)}\n`;
        }
        
        errorText += `\n🔧 *Troubleshooting Tips*\n`;
        errorText += `1. Check if port is already in use\n`;
        errorText += `2. Verify dependencies are installed\n`;
        errorText += `3. Check bot configuration files\n`;
        errorText += `4. Look at logs in the logs/ directory\n`;
        errorText += `5. Try different manager: \`!start manager=node\`\n`;
        errorText += `6. Run in dev mode: \`!start dev\`\n`;
        
        await editMessage(errorText);
      }
      
    } catch (error) {
      console.error("Start command error:", error);
      await editMessage(
        `❌ Start Command Error\n` +
        `Error: ${error.message}\n` +
        "Please check logs for details."
      );
    }
  }
};