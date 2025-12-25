

















import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

// Check if git repository exists
async function hasGitRepo() {
  const gitPath = path.join(process.cwd(), ".git");
  return fs.existsSync(gitPath);
}

// Get current git branch
async function getCurrentBranch() {
  try {
    return await run("git rev-parse --abbrev-ref HEAD");
  } catch (error) {
    return "main"; // default branch
  }
}

// Initialize git repo if it doesn't exist
async function initGitRepo() {
  try {
    if (!await hasGitRepo()) {
      console.log("Initializing git repository...");
      await run("git init");
      await run("git remote add origin https://github.com/777Wolf-dot/Silent-Wolf--Bot.git");
      await run("git fetch origin");
      await run("git checkout -b main --track origin/main || git checkout -b main");
      console.log("Git repository initialized");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to initialize git repo:", error);
    return false;
  }
}

// Update from wolf-bot repo (your update source)
async function updateFromWolfBot() {
  try {
    // Save current state
    const oldRev = await run("git rev-parse HEAD").catch(() => "unknown");
    const currentBranch = await getCurrentBranch();
    
    console.log(`Current branch: ${currentBranch}, Old revision: ${oldRev.substring(0, 7)}`);
    
    // Add wolf-bot as upstream if not already added
    try {
      await run("git remote get-url wolf-bot-upstream");
    } catch {
      console.log("Adding wolf-bot as upstream remote...");
      await run("git remote add wolf-bot-upstream https://github.com/777Wolf-dot/wolf-bot.git");
    }
    
    // Fetch from both remotes
    console.log("Fetching updates from both remotes...");
    await run("git fetch --all --prune");
    
    // Check what branch to update from
    let sourceBranch = "main";
    let sourceRemote = "wolf-bot-upstream";
    
    // Try to find matching branch in wolf-bot repo
    try {
      const wolfBotBranches = await run("git ls-remote --heads wolf-bot-upstream");
      const branches = wolfBotBranches.split('\n').map(line => {
        const match = line.match(/refs\/heads\/(.+)/);
        return match ? match[1] : null;
      }).filter(Boolean);
      
      if (branches.includes(currentBranch)) {
        sourceBranch = currentBranch;
        console.log(`Found matching branch in wolf-bot: ${currentBranch}`);
      } else {
        console.log(`Branch ${currentBranch} not found in wolf-bot, using main branch`);
      }
    } catch (error) {
      console.warn("Could not check wolf-bot branches:", error.message);
    }
    
    // Get new revision from wolf-bot
    const newRev = await run(`git rev-parse wolf-bot-upstream/${sourceBranch}`);
    const alreadyUpToDate = oldRev === newRev;
    
    if (alreadyUpToDate) {
      console.log("Already up to date with wolf-bot repo");
      return { 
        oldRev, 
        newRev, 
        alreadyUpToDate, 
        source: `wolf-bot/${sourceBranch}`,
        type: "git"
      };
    }
    
    console.log(`Updating from wolf-bot/${sourceBranch}: ${oldRev.substring(0, 7)} → ${newRev.substring(0, 7)}`);
    
    // Create backup branch just in case
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupBranch = `backup-before-update-${timestamp}`;
    await run(`git branch ${backupBranch}`);
    console.log(`Created backup branch: ${backupBranch}`);
    
    // Reset to wolf-bot's latest
    await run(`git reset --hard wolf-bot-upstream/${sourceBranch}`);
    
    // Try to preserve important local files
    await preserveLocalFiles();
    
    // Clean untracked files (be careful)
    try {
      await run("git clean -fd -e node_modules -e tmp -e logs -e session -e settings.js -e config.json");
    } catch (cleanError) {
      console.warn("Git clean failed:", cleanError.message);
    }
    
    return { 
      oldRev, 
      newRev, 
      alreadyUpToDate, 
      source: `wolf-bot/${sourceBranch}`,
      backupBranch,
      type: "git"
    };
    
  } catch (error) {
    console.error("Update from wolf-bot failed:", error);
    
    // Try to restore from backup
    try {
      const branches = await run("git branch --list backup-before-update-*");
      if (branches) {
        const latestBackup = branches.split('\n').filter(b => b.trim()).pop().trim();
        await run(`git reset --hard ${latestBackup}`);
        console.log(`Restored from backup: ${latestBackup}`);
      }
    } catch (restoreError) {
      console.error("Could not restore from backup:", restoreError);
    }
    
    throw new Error(`Update from wolf-bot failed: ${error.message}`);
  }
}

// Preserve important local files that shouldn't be overwritten
async function preserveLocalFiles() {
  const filesToPreserve = [
    'settings.js',
    'config.json',
    '.env',
    'session',
    'data',
    'logs'
  ];
  
  const tmpDir = path.join(process.cwd(), 'tmp_preserve');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  for (const file of filesToPreserve) {
    const filePath = path.join(process.cwd(), file);
    const tmpPath = path.join(tmpDir, file);
    
    if (fs.existsSync(filePath)) {
      if (fs.statSync(filePath).isDirectory()) {
        // Copy directory
        await copyDir(filePath, tmpPath);
      } else {
        // Copy file
        fs.copyFileSync(filePath, tmpPath);
      }
      console.log(`Preserved: ${file}`);
    }
  }
  
  // After update, restore preserved files
  if (fs.existsSync(tmpDir)) {
    const preservedItems = fs.readdirSync(tmpDir);
    for (const item of preservedItems) {
      const srcPath = path.join(tmpDir, item);
      const destPath = path.join(process.cwd(), item);
      
      if (fs.existsSync(destPath)) {
        // If it's a directory, merge contents
        if (fs.statSync(srcPath).isDirectory() && fs.statSync(destPath).isDirectory()) {
          await copyDir(srcPath, destPath);
        } else {
          // Keep the preserved version
          if (fs.statSync(destPath).isDirectory()) {
            fs.rmSync(destPath, { recursive: true });
          }
          if (fs.statSync(srcPath).isDirectory()) {
            await copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      } else {
        // Copy if doesn't exist
        if (fs.statSync(srcPath).isDirectory()) {
          await copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
    
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  }
}

// Update via ZIP from wolf-bot repo
async function updateViaZip() {
  const zipUrl = "https://github.com/777Wolf-dot/wolf-bot/archive/refs/heads/main.zip";
  const tmpDir = path.join(process.cwd(), "tmp_update");
  const zipPath = path.join(tmpDir, "wolf-bot-update.zip");
  const extractDir = path.join(tmpDir, "extracted");
  
  try {
    // Create backup of important files
    await preserveLocalFiles();
    
    // Clean/create temp directory
    if (fs.existsSync(tmpDir)) {
      await run(`rm -rf ${tmpDir}`);
    }
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(extractDir, { recursive: true });
    
    console.log(`Downloading ZIP from wolf-bot: ${zipUrl}`);
    
    // Download using curl or wget
    let downloadCmd;
    if (await run("which curl").then(() => true).catch(() => false)) {
      downloadCmd = `curl -L "${zipUrl}" -o "${zipPath}" --connect-timeout 30 --max-time 300 --silent --show-error`;
    } else if (await run("which wget").then(() => true).catch(() => false)) {
      downloadCmd = `wget "${zipUrl}" -O "${zipPath}" --timeout=30 --tries=3 --quiet`;
    } else {
      throw new Error("Neither curl nor wget is available");
    }
    
    await run(downloadCmd);
    
    if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
      throw new Error("Downloaded ZIP file is empty or doesn't exist");
    }
    
    console.log(`Downloaded ${fs.statSync(zipPath).size} bytes from wolf-bot`);
    
    // Extract ZIP
    console.log("Extracting ZIP...");
    
    if (await run("which unzip").then(() => true).catch(() => false)) {
      await run(`unzip -o "${zipPath}" -d "${extractDir}"`);
    } else if (await run("which 7z").then(() => true).catch(() => false)) {
      await run(`7z x "${zipPath}" -o"${extractDir}" -y`);
    } else {
      throw new Error("No extraction tool found (install unzip or 7z)");
    }
    
    // Find the extracted content (GitHub ZIPs have wolf-bot-main folder)
    const extractedItems = fs.readdirSync(extractDir);
    let sourceDir = extractDir;
    
    // Look for wolf-bot-main folder
    const wolfBotFolder = extractedItems.find(item => 
      item.toLowerCase().includes('wolf-bot')
    );
    
    if (wolfBotFolder) {
      sourceDir = path.join(extractDir, wolfBotFolder);
      console.log(`Found source folder: ${wolfBotFolder}`);
    }
    
    console.log(`Copying files from ${sourceDir} to ${process.cwd()}`);
    
    // Files/directories to exclude from update
    const excludeItems = [
      '.git',
      'node_modules',
      'tmp',
      'logs',
      'session',
      'data',
      'settings.js',
      'config.json',
      '.env',
      'tmp_update',
      'tmp_preserve'
    ];
    
    // Copy files, excluding protected items
    await copyDirWithExclude(sourceDir, process.cwd(), excludeItems);
    
    // Cleanup
    await run(`rm -rf ${tmpDir}`);
    
    return { 
      success: true, 
      source: "wolf-bot ZIP",
      url: zipUrl 
    };
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(tmpDir)) {
      await run(`rm -rf ${tmpDir}`).catch(() => {});
    }
    throw new Error(`ZIP update from wolf-bot failed: ${error.message}`);
  }
}

// Helper function to copy directory with exclusions
async function copyDirWithExclude(src, dest, exclude = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Check if excluded
    if (exclude.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(entry.name);
      }
      return entry.name === pattern;
    })) {
      console.log(`Skipping excluded: ${entry.name}`);
      continue;
    }
    
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      await copyDirWithExclude(srcPath, destPath, exclude);
    } else {
      // Skip if destination is a protected file that should be preserved
      const isProtected = ['settings.js', 'config.json', '.env'].includes(entry.name.toLowerCase());
      if (isProtected && fs.existsSync(destPath)) {
        console.log(`Preserving existing: ${entry.name}`);
        continue;
      }
      
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${entry.name}`);
    }
  }
}

// Copy directory (simple version)
async function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Enhanced settings loader
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

// Restart process
async function restartProcess() {
  console.log("Restarting bot...");
  
  try {
    // Try PM2 first
    if (await run("which pm2").then(() => true).catch(() => false)) {
      console.log("Restarting with PM2...");
      await run("pm2 restart all");
      return;
    }
    
    // Try forever
    if (await run("which forever").then(() => true).catch(() => false)) {
      console.log("Restarting with Forever...");
      await run("forever restartall");
      return;
    }
    
    // If no process manager, just exit
    console.log("No process manager found, exiting...");
    process.exit(0);
    
  } catch (error) {
    console.error("Restart failed:", error);
    // Force exit
    process.exit(0);
  }
}

// Main command handler
export default {
  name: "update",
  description: "Update bot from wolf-bot repository",
  category: "owner",
  ownerOnly: true,

  async execute(sock, m, args) {
    const jid = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    
    // Send initial message
    await sock.sendMessage(jid, { 
      text: "🔄 Checking for updates from wolf-bot repository..." 
    }, { quoted: m });
    
    try {
      // Load settings
      const settings = await loadSettings();
      
      // Check if owner
      const isOwner = m.key.fromMe || 
        (settings.ownerNumber && sender.includes(settings.ownerNumber)) ||
        (settings.botOwner && sender.includes(settings.botOwner));
      
      if (!isOwner) {
        await sock.sendMessage(jid, { 
          text: "❌ Only the bot owner can update the bot." 
        }, { quoted: m });
        return;
      }
      
      // Parse arguments
      const forceMethod = args[0]?.toLowerCase();
      const isForceZip = forceMethod === 'zip';
      const isForceGit = forceMethod === 'git';
      
      let updateResult;
      
      // Check if we have git repo, initialize if not
      const hasGit = await hasGitRepo();
      if (!hasGit && !isForceZip) {
        await sock.sendMessage(jid, { 
          text: "📦 Initializing git repository for future updates..." 
        }, { quoted: m });
        await initGitRepo();
      }
      
      // Determine update method
      if ((hasGit && !isForceZip) || isForceGit) {
        // Git update from wolf-bot
        await sock.sendMessage(jid, { 
          text: "🌐 Checking for updates from wolf-bot git repository..." 
        }, { quoted: m });
        
        updateResult = await updateFromWolfBot();
        
        if (updateResult.alreadyUpToDate) {
          await sock.sendMessage(jid, { 
            text: `✅ Already up to date with wolf-bot!\nSource: ${updateResult.source}\nCommit: ${updateResult.newRev.substring(0, 7)}` 
          }, { quoted: m });
        } else {
          await sock.sendMessage(jid, { 
            text: `✅ Successfully updated from wolf-bot!\n\n` +
                  `Source: ${updateResult.source}\n` +
                  `Updated: ${updateResult.oldRev.substring(0, 7)} → ${updateResult.newRev.substring(0, 7)}\n` +
                  `Backup: ${updateResult.backupBranch || 'None'}` 
          }, { quoted: m });
        }
        
        // Install dependencies if package.json changed
        await sock.sendMessage(jid, { 
          text: "📦 Checking and installing dependencies..." 
        }, { quoted: m });
        
        try {
          if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
            await run("npm install --no-audit --no-fund --loglevel=error");
            await sock.sendMessage(jid, { 
              text: "✅ Dependencies installed successfully!" 
            }, { quoted: m });
          } else {
            await sock.sendMessage(jid, { 
              text: "⚠️ No package.json found, skipping dependency installation" 
            }, { quoted: m });
          }
        } catch (npmError) {
          console.error("npm install failed:", npmError);
          await sock.sendMessage(jid, { 
            text: `⚠️ npm install had issues: ${npmError.message}\nContinuing with restart...` 
          }, { quoted: m });
        }
        
      } else {
        // ZIP update from wolf-bot
        await sock.sendMessage(jid, { 
          text: "📦 Downloading update from wolf-bot repository..." 
        }, { quoted: m });
        
        updateResult = await updateViaZip();
        
        await sock.sendMessage(jid, { 
          text: `✅ ZIP update from wolf-bot complete!\n\n` +
                `Source: ${updateResult.source}\n` +
                `URL: ${updateResult.url}` 
        }, { quoted: m });
      }
      
      // Final restart
      await sock.sendMessage(jid, { 
        text: "🔄 Restarting Silent Wolf Bot...\nBot will be back in a few moments." 
      }, { quoted: m });
      
      // Small delay to ensure message is sent
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await restartProcess();
      
    } catch (error) {
      console.error("Update error:", error);
      
      let errorMessage = `❌ Update failed: ${error.message}`;
      
      // Add helpful suggestions
      if (error.message.includes('git') || error.message.includes('ZIP')) {
        errorMessage += "\n\n**Try these solutions:**\n";
        errorMessage += "1. Use different method: `!update git` or `!update zip`\n";
        errorMessage += "2. Check internet connection\n";
        errorMessage += "3. Ensure required tools are installed: git, curl, unzip\n";
        errorMessage += "4. Manually update from: https://github.com/777Wolf-dot/wolf-bot";
      }
      
      await sock.sendMessage(jid, { 
        text: errorMessage 
      }, { quoted: m });
    }
  }
};























// import { exec } from "child_process";
// import { promisify } from "util";
// import fs from "fs";
// import path from "path";

// const execAsync = promisify(exec);
// const isWindows = process.platform === 'win32';

// export class PanelManager {
//   constructor(panelPath = './panel') {
//     this.panelPath = panelPath;
//     this.panelPort = process.env.PANEL_PORT || 3000;
//   }
  
//   async startPanel() {
//     try {
//       const panelMain = this.findPanelMain();
//       if (!panelMain) {
//         throw new Error("Panel main file not found");
//       }
      
//       console.log(`🚀 Starting panel: ${panelMain}`);
      
//       if (isWindows) {
//         await execAsync(`start /B node "${panelMain}"`, { shell: true });
//       } else {
//         await execAsync(`nohup node "${panelMain}" > panel.log 2>&1 &`, { shell: true });
//       }
      
//       // Wait for panel to start
//       await new Promise(resolve => setTimeout(resolve, 3000));
      
//       return { success: true, pid: await this.getPanelPid() };
//     } catch (error) {
//       return { success: false, error: error.message };
//     }
//   }
  
//   async stopPanel() {
//     try {
//       const pid = await this.getPanelPid();
//       if (pid) {
//         if (isWindows) {
//           await execAsync(`taskkill /F /PID ${pid}`, { shell: true });
//         } else {
//           await execAsync(`kill -9 ${pid}`, { shell: true });
//         }
//         await new Promise(resolve => setTimeout(resolve, 1000));
//       }
//       return { success: true };
//     } catch (error) {
//       return { success: false, error: error.message };
//     }
//   }
  
//   async restartPanel() {
//     await this.stopPanel();
//     return await this.startPanel();
//   }
  
//   async getPanelStatus() {
//     try {
//       const pid = await this.getPanelPid();
//       const running = !!pid;
      
//       // Check if port is listening
//       let portOpen = false;
//       if (running) {
//         if (isWindows) {
//           const result = await execAsync(`netstat -ano | findstr :${this.panelPort}`, { shell: true });
//           portOpen = result.stdout.includes(`:${this.panelPort}`);
//         } else {
//           const result = await execAsync(`netstat -tuln | grep :${this.panelPort}`, { shell: true });
//           portOpen = !!result.stdout;
//         }
//       }
      
//       return {
//         running,
//         pid,
//         port: this.panelPort,
//         portOpen,
//         path: this.panelPath
//       };
//     } catch (error) {
//       return { running: false, error: error.message };
//     }
//   }
  
//   async getPanelPid() {
//     try {
//       if (isWindows) {
//         const result = await execAsync(
//           `Get-WmiObject Win32_Process -Filter "name='node.exe'" | ` +
//           `Where-Object {$_.CommandLine -like '*${this.panelPath.replace(/\\/g, '\\\\')}*'} | ` +
//           `Select-Object -ExpandProperty ProcessId`,
//           { shell: 'powershell' }
//         );
//         return result.stdout.trim();
//       } else {
//         const result = await execAsync(`pgrep -f "${this.panelPath}"`, { shell: true });
//         return result.stdout.trim();
//       }
//     } catch (error) {
//       return null;
//     }
//   }
  
//   findPanelMain() {
//     const possibleFiles = [
//       path.join(this.panelPath, 'index.js'),
//       path.join(this.panelPath, 'app.js'),
//       path.join(this.panelPath, 'server.js'),
//       path.join(this.panelPath, 'main.js'),
//       path.join(process.cwd(), 'panel.js'),
//       path.join(process.cwd(), 'src', 'panel.js')
//     ];
    
//     for (const file of possibleFiles) {
//       if (fs.existsSync(file)) {
//         return file;
//       }
//     }
//     return null;
//   }
// }





