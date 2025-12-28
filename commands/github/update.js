
// import { exec } from "child_process";
// import { promisify } from "util";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";

// const execAsync = promisify(exec);
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Enhanced exec with timeout
// async function run(cmd, timeout = 30000) {
//   try {
//     const { stdout, stderr } = await execAsync(cmd, { timeout });
//     if (stderr && !stderr.includes('warning')) {
//       console.warn(`Command stderr: ${stderr}`);
//     }
//     return stdout.trim();
//   } catch (error) {
//     console.error(`Command failed: ${cmd}`, error.message);
//     throw error;
//   }
// }

// // Check if git repository exists
// async function hasGitRepo() {
//   const gitPath = path.join(process.cwd(), ".git");
//   return fs.existsSync(gitPath);
// }

// // Get current git branch
// async function getCurrentBranch() {
//   try {
//     return await run("git rev-parse --abbrev-ref HEAD");
//   } catch (error) {
//     return "main"; // default branch
//   }
// }

// // Initialize git repo if it doesn't exist
// async function initGitRepo() {
//   try {
//     if (!await hasGitRepo()) {
//       console.log("Initializing git repository...");
//       await run("git init");
//       await run("git remote add origin https://github.com/777Wolf-dot/Silent-Wolf--Bot.git");
//       await run("git fetch origin");
//       await run("git checkout -b main --track origin/main || git checkout -b main");
//       console.log("Git repository initialized");
//       return true;
//     }
//     return false;
//   } catch (error) {
//     console.error("Failed to initialize git repo:", error);
//     return false;
//   }
// }

// // Update from wolf-bot repo (your update source)
// async function updateFromWolfBot() {
//   try {
//     // Save current state
//     const oldRev = await run("git rev-parse HEAD").catch(() => "unknown");
//     const currentBranch = await getCurrentBranch();
    
//     console.log(`Current branch: ${currentBranch}, Old revision: ${oldRev.substring(0, 7)}`);
    
//     // Add wolf-bot as upstream if not already added
//     try {
//       await run("git remote get-url wolf-bot-upstream");
//     } catch {
//       console.log("Adding wolf-bot as upstream remote...");
//       await run("git remote add wolf-bot-upstream https://github.com/777Wolf-dot/wolf-bot.git");
//     }
    
//     // Fetch from both remotes
//     console.log("Fetching updates from both remotes...");
//     await run("git fetch --all --prune");
    
//     // Check what branch to update from
//     let sourceBranch = "main";
//     let sourceRemote = "wolf-bot-upstream";
    
//     // Try to find matching branch in wolf-bot repo
//     try {
//       const wolfBotBranches = await run("git ls-remote --heads wolf-bot-upstream");
//       const branches = wolfBotBranches.split('\n').map(line => {
//         const match = line.match(/refs\/heads\/(.+)/);
//         return match ? match[1] : null;
//       }).filter(Boolean);
      
//       if (branches.includes(currentBranch)) {
//         sourceBranch = currentBranch;
//         console.log(`Found matching branch in wolf-bot: ${currentBranch}`);
//       } else {
//         console.log(`Branch ${currentBranch} not found in wolf-bot, using main branch`);
//       }
//     } catch (error) {
//       console.warn("Could not check wolf-bot branches:", error.message);
//     }
    
//     // Get new revision from wolf-bot
//     const newRev = await run(`git rev-parse wolf-bot-upstream/${sourceBranch}`);
//     const alreadyUpToDate = oldRev === newRev;
    
//     if (alreadyUpToDate) {
//       console.log("Already up to date with wolf-bot repo");
//       return { 
//         oldRev, 
//         newRev, 
//         alreadyUpToDate, 
//         source: `wolf-bot/${sourceBranch}`,
//         type: "git"
//       };
//     }
    
//     console.log(`Updating from wolf-bot/${sourceBranch}: ${oldRev.substring(0, 7)} → ${newRev.substring(0, 7)}`);
    
//     // Create backup branch just in case
//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//     const backupBranch = `backup-before-update-${timestamp}`;
//     await run(`git branch ${backupBranch}`);
//     console.log(`Created backup branch: ${backupBranch}`);
    
//     // Reset to wolf-bot's latest
//     await run(`git reset --hard wolf-bot-upstream/${sourceBranch}`);
    
//     // Try to preserve important local files
//     await preserveLocalFiles();
    
//     // Clean untracked files (be careful)
//     try {
//       await run("git clean -fd -e node_modules -e tmp -e logs -e session -e settings.js -e config.json -e .env");
//     } catch (cleanError) {
//       console.warn("Git clean failed:", cleanError.message);
//     }
    
//     return { 
//       oldRev, 
//       newRev, 
//       alreadyUpToDate, 
//       source: `wolf-bot/${sourceBranch}`,
//       backupBranch,
//       type: "git"
//     };
    
//   } catch (error) {
//     console.error("Update from wolf-bot failed:", error);
    
//     // Try to restore from backup
//     try {
//       const branches = await run("git branch --list backup-before-update-*");
//       if (branches) {
//         const latestBackup = branches.split('\n').filter(b => b.trim()).pop().trim();
//         await run(`git reset --hard ${latestBackup}`);
//         console.log(`Restored from backup: ${latestBackup}`);
//       }
//     } catch (restoreError) {
//       console.error("Could not restore from backup:", restoreError);
//     }
    
//     throw new Error(`Update from wolf-bot failed: ${error.message}`);
//   }
// }

// // Preserve important local files that shouldn't be overwritten
// async function preserveLocalFiles() {
//   const filesToPreserve = [
//     'settings.js',
//     'config.json',
//     '.env',
//     'session',
//     'data',
//     'logs'
//   ];
  
//   const tmpDir = path.join(process.cwd(), 'tmp_preserve');
//   if (!fs.existsSync(tmpDir)) {
//     fs.mkdirSync(tmpDir, { recursive: true });
//   }
  
//   for (const file of filesToPreserve) {
//     const filePath = path.join(process.cwd(), file);
//     const tmpPath = path.join(tmpDir, file);
    
//     if (fs.existsSync(filePath)) {
//       if (fs.statSync(filePath).isDirectory()) {
//         // Copy directory
//         await copyDir(filePath, tmpPath);
//       } else {
//         // Copy file
//         fs.copyFileSync(filePath, tmpPath);
//       }
//       console.log(`Preserved: ${file}`);
//     }
//   }
  
//   // After update, restore preserved files
//   if (fs.existsSync(tmpDir)) {
//     const preservedItems = fs.readdirSync(tmpDir);
//     for (const item of preservedItems) {
//       const srcPath = path.join(tmpDir, item);
//       const destPath = path.join(process.cwd(), item);
      
//       if (fs.existsSync(destPath)) {
//         // If it's a directory, merge contents
//         if (fs.statSync(srcPath).isDirectory() && fs.statSync(destPath).isDirectory()) {
//           await copyDir(srcPath, destPath);
//         } else {
//           // Keep the preserved version
//           if (fs.statSync(destPath).isDirectory()) {
//             fs.rmSync(destPath, { recursive: true });
//           }
//           if (fs.statSync(srcPath).isDirectory()) {
//             await copyDir(srcPath, destPath);
//           } else {
//             fs.copyFileSync(srcPath, destPath);
//           }
//         }
//       } else {
//         // Copy if doesn't exist
//         if (fs.statSync(srcPath).isDirectory()) {
//           await copyDir(srcPath, destPath);
//         } else {
//           fs.copyFileSync(srcPath, destPath);
//         }
//       }
//     }
    
//     // Cleanup
//     fs.rmSync(tmpDir, { recursive: true });
//   }
// }

// // Update via ZIP from wolf-bot repo
// async function updateViaZip() {
//   const zipUrl = "https://github.com/777Wolf-dot/wolf-bot/archive/refs/heads/main.zip";
//   const tmpDir = path.join(process.cwd(), "tmp_update");
//   const zipPath = path.join(tmpDir, "wolf-bot-update.zip");
//   const extractDir = path.join(tmpDir, "extracted");
  
//   try {
//     // Create backup of important files
//     await preserveLocalFiles();
    
//     // Clean/create temp directory
//     if (fs.existsSync(tmpDir)) {
//       await run(`rm -rf ${tmpDir}`);
//     }
//     fs.mkdirSync(tmpDir, { recursive: true });
//     fs.mkdirSync(extractDir, { recursive: true });
    
//     console.log(`Downloading ZIP from wolf-bot: ${zipUrl}`);
    
//     // Download using curl or wget
//     let downloadCmd;
//     if (await run("which curl").then(() => true).catch(() => false)) {
//       downloadCmd = `curl -L "${zipUrl}" -o "${zipPath}" --connect-timeout 30 --max-time 300 --silent --show-error`;
//     } else if (await run("which wget").then(() => true).catch(() => false)) {
//       downloadCmd = `wget "${zipUrl}" -O "${zipPath}" --timeout=30 --tries=3 --quiet`;
//     } else {
//       throw new Error("Neither curl nor wget is available");
//     }
    
//     await run(downloadCmd);
    
//     if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
//       throw new Error("Downloaded ZIP file is empty or doesn't exist");
//     }
    
//     console.log(`Downloaded ${fs.statSync(zipPath).size} bytes from wolf-bot`);
    
//     // Extract ZIP
//     console.log("Extracting ZIP...");
    
//     if (await run("which unzip").then(() => true).catch(() => false)) {
//       await run(`unzip -o "${zipPath}" -d "${extractDir}"`);
//     } else if (await run("which 7z").then(() => true).catch(() => false)) {
//       await run(`7z x "${zipPath}" -o"${extractDir}" -y`);
//     } else {
//       throw new Error("No extraction tool found (install unzip or 7z)");
//     }
    
//     // Find the extracted content (GitHub ZIPs have wolf-bot-main folder)
//     const extractedItems = fs.readdirSync(extractDir);
//     let sourceDir = extractDir;
    
//     // Look for wolf-bot-main folder
//     const wolfBotFolder = extractedItems.find(item => 
//       item.toLowerCase().includes('wolf-bot')
//     );
    
//     if (wolfBotFolder) {
//       sourceDir = path.join(extractDir, wolfBotFolder);
//       console.log(`Found source folder: ${wolfBotFolder}`);
//     }
    
//     console.log(`Copying files from ${sourceDir} to ${process.cwd()}`);
    
//     // Files/directories to exclude from update
//     const excludeItems = [
//       '.git',
//       'node_modules',
//       'tmp',
//       'logs',
//       'session',
//       'data',
//       'settings.js',
//       'config.json',
//       '.env',
//       'tmp_update',
//       'tmp_preserve'
//     ];
    
//     // Copy files, excluding protected items
//     await copyDirWithExclude(sourceDir, process.cwd(), excludeItems);
    
//     // Cleanup
//     await run(`rm -rf ${tmpDir}`);
    
//     return { 
//       success: true, 
//       source: "wolf-bot ZIP",
//       url: zipUrl 
//     };
//   } catch (error) {
//     // Cleanup on error
//     if (fs.existsSync(tmpDir)) {
//       await run(`rm -rf ${tmpDir}`).catch(() => {});
//     }
//     throw new Error(`ZIP update from wolf-bot failed: ${error.message}`);
//   }
// }

// // Helper function to copy directory with exclusions
// async function copyDirWithExclude(src, dest, exclude = []) {
//   if (!fs.existsSync(dest)) {
//     fs.mkdirSync(dest, { recursive: true });
//   }
  
//   const entries = fs.readdirSync(src, { withFileTypes: true });
  
//   for (const entry of entries) {
//     const srcPath = path.join(src, entry.name);
//     const destPath = path.join(dest, entry.name);
    
//     // Check if excluded
//     if (exclude.some(pattern => {
//       if (pattern.includes('*')) {
//         const regex = new RegExp(pattern.replace(/\*/g, '.*'));
//         return regex.test(entry.name);
//       }
//       return entry.name === pattern;
//     })) {
//       console.log(`Skipping excluded: ${entry.name}`);
//       continue;
//     }
    
//     if (entry.isDirectory()) {
//       if (!fs.existsSync(destPath)) {
//         fs.mkdirSync(destPath, { recursive: true });
//       }
//       await copyDirWithExclude(srcPath, destPath, exclude);
//     } else {
//       // Skip if destination is a protected file that should be preserved
//       const isProtected = ['settings.js', 'config.json', '.env'].includes(entry.name.toLowerCase());
//       if (isProtected && fs.existsSync(destPath)) {
//         console.log(`Preserving existing: ${entry.name}`);
//         continue;
//       }
      
//       fs.copyFileSync(srcPath, destPath);
//       console.log(`Copied: ${entry.name}`);
//     }
//   }
// }

// // Copy directory (simple version)
// async function copyDir(src, dest) {
//   if (!fs.existsSync(dest)) {
//     fs.mkdirSync(dest, { recursive: true });
//   }
  
//   const entries = fs.readdirSync(src, { withFileTypes: true });
  
//   for (const entry of entries) {
//     const srcPath = path.join(src, entry.name);
//     const destPath = path.join(dest, entry.name);
    
//     if (entry.isDirectory()) {
//       await copyDir(srcPath, destPath);
//     } else {
//       fs.copyFileSync(srcPath, destPath);
//     }
//   }
// }

// // Enhanced settings loader
// async function loadSettings() {
//   const possiblePaths = [
//     path.join(process.cwd(), "settings.js"),
//     path.join(process.cwd(), "config", "settings.js"),
//     path.join(__dirname, "..", "settings.js"),
//     path.join(__dirname, "..", "..", "settings.js"),
//   ];
  
//   for (const settingsPath of possiblePaths) {
//     try {
//       if (fs.existsSync(settingsPath)) {
//         console.log(`Loading settings from: ${settingsPath}`);
//         const module = await import(`file://${settingsPath}`);
//         return module.default || module;
//       }
//     } catch (error) {
//       console.warn(`Failed to load settings from ${settingsPath}:`, error.message);
//       continue;
//     }
//   }
  
//   console.warn("No settings file found, using empty settings");
//   return {};
// }

// // Restart process
// async function restartProcess() {
//   console.log("Restarting bot...");
  
//   try {
//     // Try PM2 first
//     if (await run("which pm2").then(() => true).catch(() => false)) {
//       console.log("Restarting with PM2...");
//       await run("pm2 restart all");
//       return;
//     }
    
//     // Try forever
//     if (await run("which forever").then(() => true).catch(() => false)) {
//       console.log("Restarting with Forever...");
//       await run("forever restartall");
//       return;
//     }
    
//     // If no process manager, just exit
//     console.log("No process manager found, exiting...");
//     process.exit(0);
    
//   } catch (error) {
//     console.error("Restart failed:", error);
//     // Force exit
//     process.exit(0);
//   }
// }

// // Update progress bar animation
// function getProgressBar(percentage) {
//   const filled = Math.round((percentage / 100) * 10);
//   const empty = 10 - filled;
//   return `█`.repeat(filled) + `▒`.repeat(empty);
// }

// // Main command handler
// export default {
//   name: "update",
//   description: "Update bot from wolf-bot repository",
//   category: "owner",
//   ownerOnly: true,

//   async execute(sock, m, args) {
//     const jid = m.key.remoteJid;
//     const sender = m.key.participant || m.key.remoteJid;
    
//     // Send initial message and store its key for editing
//     const initialMessage = await sock.sendMessage(jid, { 
//       text: "🔄 WolfBot Update System\nChecking for updates...\nInitializing update process..."
//     }, { quoted: m });
    
//     let updateMessageKey = initialMessage.key;
    
//     // Edit message helper
//     const editMessage = async (text) => {
//       try {
//         await sock.sendMessage(jid, { 
//           text,
//           edit: updateMessageKey
//         }, { quoted: m });
//       } catch (error) {
//         console.log("Could not edit message, sending new one:", error.message);
//         const newMsg = await sock.sendMessage(jid, { text }, { quoted: m });
//         updateMessageKey = newMsg.key;
//       }
//     };
    
//     // Animate progress
//     const animateProgress = async (baseText, progress = 0) => {
//       const bar = getProgressBar(progress);
//       const progressText = `${baseText}\n${bar} ${progress}%`;
//       await editMessage(progressText);
//     };
    
//     try {
//       // Load settings
//       await animateProgress("🔍 Loading bot settings...", 10);
//       const settings = await loadSettings();
      
//       // Check if owner
//       const isOwner = m.key.fromMe || 
//         (settings.ownerNumber && sender.includes(settings.ownerNumber)) ||
//         (settings.botOwner && sender.includes(settings.botOwner));
      
//       if (!isOwner) {
//         await editMessage("❌ Permission Denied\nOnly the bot owner can update the bot.");
//         return;
//       }
      
//       // Parse arguments
//       const forceMethod = args[0]?.toLowerCase();
//       const isForceZip = forceMethod === 'zip';
//       const isForceGit = forceMethod === 'git';
      
//       let updateResult;
      
//       // Check if we have git repo, initialize if not
//       await animateProgress("📁 Checking git repository...", 20);
//       const hasGit = await hasGitRepo();
      
//       if (!hasGit && !isForceZip) {
//         await animateProgress("📦 Initializing git repository...", 30);
//         await initGitRepo();
//       }
      
//       // Determine update method
//       if ((hasGit && !isForceZip) || isForceGit) {
//         // Git update from wolf-bot
//         await animateProgress("🌐 Checking wolf-bot repository...", 40);
        
//         updateResult = await updateFromWolfBot();
        
//         if (updateResult.alreadyUpToDate) {
//           await editMessage(
//             "✅ Already Up to Date!\n" +
//             `Source: ${updateResult.source}\n` +
//             `Commit: ${updateResult.newRev.substring(0, 7)}\n` +
//             "No updates available."
//           );
//         } else {
//           await animateProgress("📥 Installing updates...", 60);
          
//           // Install dependencies if package.json changed
//           try {
//             if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
//               await animateProgress("📦 Installing dependencies...", 70);
//               await run("npm install --no-audit --no-fund --loglevel=error");
//               await animateProgress("✅ Dependencies installed!", 80);
//             }
//           } catch (npmError) {
//             console.error("npm install failed:", npmError);
//           }
          
//           await editMessage(
//             "✅ Update Complete!\n" +
//             `Source: ${updateResult.source}\n` +
//             `Updated: ${updateResult.oldRev.substring(0, 7)} → ${updateResult.newRev.substring(0, 7)}\n` +
//             `Backup: ${updateResult.backupBranch || 'None'}\n` +
//             "Preparing to restart..."
//           );
//         }
//       } else {
//         // ZIP update from wolf-bot
//         await animateProgress("📦 Downloading wolf-bot update...", 40);
        
//         updateResult = await updateViaZip();
        
//         await animateProgress("📂 Extracting files...", 60);
//         await animateProgress("📝 Installing updates...", 80);
        
//         await editMessage(
//           "✅ ZIP Update Complete!\n" +
//           `Source: ${updateResult.source}\n` +
//           `URL: ${updateResult.url}\n` +
//           "Preparing to restart..."
//         );
//       }
      
//       // Final restart
//       await animateProgress("🔄 Restarting WolfBot...", 95);
      
//       // Small delay to ensure message is sent
//       await new Promise(resolve => setTimeout(resolve, 1000));
      
//       // Send final message
//       await editMessage(
//         "🚀 Restarting Now!\n" +
//         "Bot will be back in a few moments...\n" +
//         "WolfBot is updating..."
//       );
      
//       await restartProcess();
      
//     } catch (error) {
//       console.error("Update error:", error);
      
//       let errorMessage = 
//         "❌ Update Failed\n" +
//         `Error: ${error.message}\n\n`;
      
//       // Add helpful suggestions
//       if (error.message.includes('git') || error.message.includes('ZIP')) {
//         errorMessage += "Try these solutions:\n";
//         errorMessage += "• Use different method: `!update git` or `!update zip`\n";
//         errorMessage += "• Check internet connection\n";
//         errorMessage += "• Ensure required tools are installed: git, curl, unzip\n";
//         errorMessage += "• Manually update from: https://github.com/777Wolf-dot/wolf-bot";
//       }
      
//       await editMessage(errorMessage);
//     }
//   }
// };








// import { exec } from "child_process";
// import { promisify } from "util";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
// import { createRequire } from 'module';

// const execAsync = promisify(exec);
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const require = createRequire(import.meta.url);

// // Enhanced exec with timeout
// async function run(cmd, timeout = 30000) {
//   try {
//     const { stdout, stderr } = await execAsync(cmd, { timeout });
//     if (stderr && !stderr.includes('warning')) {
//       console.warn(`Command stderr: ${stderr}`);
//     }
//     return stdout.trim();
//   } catch (error) {
//     console.error(`Command failed: ${cmd}`, error.message);
//     throw error;
//   }
// }

// // Cache for clearing require cache
// const originalRequireResolve = require.resolve;
// const moduleCache = new Map();

// // Clear module cache for hot reload
// function clearModuleCache(modulePath) {
//   const normalizedPath = path.resolve(modulePath);
  
//   // Clear from require.cache
//   if (require.cache) {
//     for (const key in require.cache) {
//       if (key.includes(normalizedPath)) {
//         delete require.cache[key];
//       }
//     }
//   }
  
//   // Clear from module cache
//   moduleCache.delete(normalizedPath);
  
//   // Clear from import cache (ES modules)
//   // Note: Node.js doesn't have a public API for ES module cache
//   // We'll handle this differently for ES modules
// }

// // Hot reload handler registry
// const hotReloadHandlers = new Set();

// // Register a module for hot reload
// export function registerForHotReload(modulePath, reloadCallback) {
//   const normalizedPath = path.resolve(modulePath);
//   hotReloadHandlers.add({
//     path: normalizedPath,
//     callback: reloadCallback
//   });
//   return () => hotReloadHandlers.delete(normalizedPath);
// }

// // Execute hot reload for updated modules
// async function executeHotReload(updatedFiles = []) {
//   console.log(`🔄 Hot reloading ${updatedFiles.length} updated modules`);
  
//   const reloadResults = [];
  
//   for (const handler of hotReloadHandlers) {
//     // Check if this handler's module was updated
//     const needsReload = updatedFiles.some(filePath => 
//       filePath.includes(handler.path) || 
//       handler.path.includes(path.dirname(filePath))
//     );
    
//     if (needsReload) {
//       try {
//         console.log(`Hot reloading: ${handler.path}`);
        
//         // Clear cache first
//         clearModuleCache(handler.path);
        
//         // Execute reload callback
//         const result = await handler.callback();
//         reloadResults.push({
//           path: handler.path,
//           success: true,
//           result
//         });
        
//         console.log(`✅ Successfully hot reloaded: ${handler.path}`);
//       } catch (error) {
//         console.error(`❌ Failed to hot reload ${handler.path}:`, error);
//         reloadResults.push({
//           path: handler.path,
//           success: false,
//           error: error.message
//         });
//       }
//     }
//   }
  
//   return reloadResults;
// }

// // Enhanced file watcher for dynamic updates
// class FileWatcher {
//   constructor() {
//     this.watchers = new Map();
//     this.debounceTimers = new Map();
//   }
  
//   watchFile(filePath, callback, debounceMs = 1000) {
//     const normalizedPath = path.resolve(filePath);
    
//     if (this.watchers.has(normalizedPath)) {
//       this.unwatchFile(normalizedPath);
//     }
    
//     try {
//       const watcher = fs.watch(normalizedPath, (eventType) => {
//         if (eventType === 'change') {
//           // Debounce to prevent multiple rapid triggers
//           if (this.debounceTimers.has(normalizedPath)) {
//             clearTimeout(this.debounceTimers.get(normalizedPath));
//           }
          
//           this.debounceTimers.set(normalizedPath, setTimeout(() => {
//             console.log(`📁 File changed: ${normalizedPath}`);
//             callback(normalizedPath);
//             this.debounceTimers.delete(normalizedPath);
//           }, debounceMs));
//         }
//       });
      
//       this.watchers.set(normalizedPath, watcher);
//       console.log(`👁️  Watching file: ${normalizedPath}`);
//     } catch (error) {
//       console.error(`Failed to watch file ${normalizedPath}:`, error);
//     }
//   }
  
//   watchDirectory(dirPath, callback, recursive = true, debounceMs = 1000) {
//     const normalizedPath = path.resolve(dirPath);
    
//     if (!fs.existsSync(normalizedPath)) {
//       console.warn(`Directory does not exist: ${normalizedPath}`);
//       return;
//     }
    
//     try {
//       const watcher = fs.watch(normalizedPath, { recursive }, (eventType, filename) => {
//         if (filename && eventType === 'change') {
//           const fullPath = path.join(normalizedPath, filename);
          
//           // Debounce
//           const key = `${normalizedPath}:${filename}`;
//           if (this.debounceTimers.has(key)) {
//             clearTimeout(this.debounceTimers.get(key));
//           }
          
//           this.debounceTimers.set(key, setTimeout(() => {
//             console.log(`📁 File in directory changed: ${fullPath}`);
//             callback(fullPath);
//             this.debounceTimers.delete(key);
//           }, debounceMs));
//         }
//       });
      
//       this.watchers.set(normalizedPath, watcher);
//       console.log(`👁️  Watching directory: ${normalizedPath} (recursive: ${recursive})`);
      
//       // Also watch subdirectories for new files
//       if (recursive) {
//         this.watchSubdirectories(normalizedPath, callback, debounceMs);
//       }
//     } catch (error) {
//       console.error(`Failed to watch directory ${normalizedPath}:`, error);
//     }
//   }
  
//   watchSubdirectories(dirPath, callback, debounceMs) {
//     try {
//       const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
//       for (const entry of entries) {
//         if (entry.isDirectory()) {
//           const subDirPath = path.join(dirPath, entry.name);
//           this.watchDirectory(subDirPath, callback, true, debounceMs);
//         }
//       }
//     } catch (error) {
//       console.error(`Failed to watch subdirectories of ${dirPath}:`, error);
//     }
//   }
  
//   unwatchFile(filePath) {
//     const normalizedPath = path.resolve(filePath);
    
//     if (this.watchers.has(normalizedPath)) {
//       this.watchers.get(normalizedPath).close();
//       this.watchers.delete(normalizedPath);
//       console.log(`👁️  Stopped watching: ${normalizedPath}`);
//     }
    
//     // Clear any debounce timer
//     if (this.debounceTimers.has(normalizedPath)) {
//       clearTimeout(this.debounceTimers.get(normalizedPath));
//       this.debounceTimers.delete(normalizedPath);
//     }
//   }
  
//   unwatchAll() {
//     for (const [path, watcher] of this.watchers) {
//       watcher.close();
//     }
//     this.watchers.clear();
    
//     for (const timer of this.debounceTimers.values()) {
//       clearTimeout(timer);
//     }
//     this.debounceTimers.clear();
    
//     console.log('👁️  Stopped all file watchers');
//   }
// }

// // Create global file watcher instance
// export const fileWatcher = new FileWatcher();

// // Check if git repository exists
// async function hasGitRepo() {
//   const gitPath = path.join(process.cwd(), ".git");
//   return fs.existsSync(gitPath);
// }

// // Get current git branch
// async function getCurrentBranch() {
//   try {
//     return await run("git rev-parse --abbrev-ref HEAD");
//   } catch (error) {
//     return "main"; // default branch
//   }
// }

// // Initialize git repo if it doesn't exist
// async function initGitRepo() {
//   try {
//     if (!await hasGitRepo()) {
//       console.log("Initializing git repository...");
//       await run("git init");
//       await run("git remote add origin https://github.com/777Wolf-dot/Silent-Wolf--Bot.git");
//       await run("git fetch origin");
//       await run("git checkout -b main --track origin/main || git checkout -b main");
//       console.log("Git repository initialized");
//       return true;
//     }
//     return false;
//   } catch (error) {
//     console.error("Failed to initialize git repo:", error);
//     return false;
//   }
// }

// // Update from wolf-bot repo (your update source)
// async function updateFromWolfBot(hotReload = false) {
//   let updatedFiles = [];
//   const changesDir = path.join(process.cwd(), 'tmp_changes');
  
//   try {
//     // Save current state
//     const oldRev = await run("git rev-parse HEAD").catch(() => "unknown");
//     const currentBranch = await getCurrentBranch();
    
//     console.log(`Current branch: ${currentBranch}, Old revision: ${oldRev.substring(0, 7)}`);
    
//     // Add wolf-bot as upstream if not already added
//     try {
//       await run("git remote get-url wolf-bot-upstream");
//     } catch {
//       console.log("Adding wolf-bot as upstream remote...");
//       await run("git remote add wolf-bot-upstream https://github.com/777Wolf-dot/wolf-bot.git");
//     }
    
//     // Fetch from both remotes
//     console.log("Fetching updates from both remotes...");
//     await run("git fetch --all --prune");
    
//     // Check what branch to update from
//     let sourceBranch = "main";
//     let sourceRemote = "wolf-bot-upstream";
    
//     // Try to find matching branch in wolf-bot repo
//     try {
//       const wolfBotBranches = await run("git ls-remote --heads wolf-bot-upstream");
//       const branches = wolfBotBranches.split('\n').map(line => {
//         const match = line.match(/refs\/heads\/(.+)/);
//         return match ? match[1] : null;
//       }).filter(Boolean);
      
//       if (branches.includes(currentBranch)) {
//         sourceBranch = currentBranch;
//         console.log(`Found matching branch in wolf-bot: ${currentBranch}`);
//       } else {
//         console.log(`Branch ${currentBranch} not found in wolf-bot, using main branch`);
//       }
//     } catch (error) {
//       console.warn("Could not check wolf-bot branches:", error.message);
//     }
    
//     // Get new revision from wolf-bot
//     const newRev = await run(`git rev-parse wolf-bot-upstream/${sourceBranch}`);
//     const alreadyUpToDate = oldRev === newRev;
    
//     if (alreadyUpToDate) {
//       console.log("Already up to date with wolf-bot repo");
//       return { 
//         oldRev, 
//         newRev, 
//         alreadyUpToDate, 
//         source: `wolf-bot/${sourceBranch}`,
//         type: "git",
//         updatedFiles: []
//       };
//     }
    
//     console.log(`Updating from wolf-bot/${sourceBranch}: ${oldRev.substring(0, 7)} → ${newRev.substring(0, 7)}`);
    
//     // For hot reload, get list of changed files
//     if (hotReload) {
//       try {
//         // Get diff between current and new
//         const diffOutput = await run(`git diff --name-only ${oldRev} wolf-bot-upstream/${sourceBranch}`);
//         updatedFiles = diffOutput.split('\n').filter(line => line.trim());
//         console.log(`Changed files detected: ${updatedFiles.length} files`);
        
//         if (updatedFiles.length > 0) {
//           // Create temporary directory for changes
//           if (fs.existsSync(changesDir)) {
//             fs.rmSync(changesDir, { recursive: true });
//           }
//           fs.mkdirSync(changesDir, { recursive: true });
          
//           // Save current versions of changed files
//           for (const file of updatedFiles) {
//             if (fs.existsSync(file)) {
//               const destDir = path.join(changesDir, path.dirname(file));
//               if (!fs.existsSync(destDir)) {
//                 fs.mkdirSync(destDir, { recursive: true });
//               }
//               fs.copyFileSync(file, path.join(changesDir, file));
//             }
//           }
//         }
//       } catch (error) {
//         console.warn("Could not get diff:", error.message);
//       }
//     }
    
//     // Create backup branch just in case
//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//     const backupBranch = `backup-before-update-${timestamp}`;
//     await run(`git branch ${backupBranch}`);
//     console.log(`Created backup branch: ${backupBranch}`);
    
//     // Reset to wolf-bot's latest
//     await run(`git reset --hard wolf-bot-upstream/${sourceBranch}`);
    
//     // Try to preserve important local files
//     await preserveLocalFiles();
    
//     // Clean untracked files (be careful)
//     try {
//       await run("git clean -fd -e node_modules -e tmp -e logs -e session -e settings.js -e config.json -e .env");
//     } catch (cleanError) {
//       console.warn("Git clean failed:", cleanError.message);
//     }
    
//     return { 
//       oldRev, 
//       newRev, 
//       alreadyUpToDate, 
//       source: `wolf-bot/${sourceBranch}`,
//       backupBranch,
//       type: "git",
//       updatedFiles,
//       changesDir: updatedFiles.length > 0 ? changesDir : null
//     };
    
//   } catch (error) {
//     console.error("Update from wolf-bot failed:", error);
    
//     // Try to restore from backup
//     try {
//       const branches = await run("git branch --list backup-before-update-*");
//       if (branches) {
//         const latestBackup = branches.split('\n').filter(b => b.trim()).pop().trim();
//         await run(`git reset --hard ${latestBackup}`);
//         console.log(`Restored from backup: ${latestBackup}`);
//       }
//     } catch (restoreError) {
//       console.error("Could not restore from backup:", restoreError);
//     }
    
//     throw new Error(`Update from wolf-bot failed: ${error.message}`);
//   }
// }

// // Preserve important local files that shouldn't be overwritten
// async function preserveLocalFiles() {
//   const filesToPreserve = [
//     'settings.js',
//     'config.json',
//     '.env',
//     'session',
//     'data',
//     'logs',
//     'tmp_changes'
//   ];
  
//   const tmpDir = path.join(process.cwd(), 'tmp_preserve');
//   if (!fs.existsSync(tmpDir)) {
//     fs.mkdirSync(tmpDir, { recursive: true });
//   }
  
//   for (const file of filesToPreserve) {
//     const filePath = path.join(process.cwd(), file);
//     const tmpPath = path.join(tmpDir, file);
    
//     if (fs.existsSync(filePath)) {
//       if (fs.statSync(filePath).isDirectory()) {
//         // Copy directory
//         await copyDir(filePath, tmpPath);
//       } else {
//         // Copy file
//         fs.copyFileSync(filePath, tmpPath);
//       }
//       console.log(`Preserved: ${file}`);
//     }
//   }
  
//   // After update, restore preserved files
//   if (fs.existsSync(tmpDir)) {
//     const preservedItems = fs.readdirSync(tmpDir);
//     for (const item of preservedItems) {
//       const srcPath = path.join(tmpDir, item);
//       const destPath = path.join(process.cwd(), item);
      
//       if (fs.existsSync(destPath)) {
//         // If it's a directory, merge contents
//         if (fs.statSync(srcPath).isDirectory() && fs.statSync(destPath).isDirectory()) {
//           await copyDir(srcPath, destPath);
//         } else {
//           // Keep the preserved version
//           if (fs.statSync(destPath).isDirectory()) {
//             fs.rmSync(destPath, { recursive: true });
//           }
//           if (fs.statSync(srcPath).isDirectory()) {
//             await copyDir(srcPath, destPath);
//           } else {
//             fs.copyFileSync(srcPath, destPath);
//           }
//         }
//       } else {
//         // Copy if doesn't exist
//         if (fs.statSync(srcPath).isDirectory()) {
//           await copyDir(srcPath, destPath);
//         } else {
//           fs.copyFileSync(srcPath, destPath);
//         }
//       }
//     }
    
//     // Cleanup
//     fs.rmSync(tmpDir, { recursive: true });
//   }
// }

// // Update via ZIP from wolf-bot repo
// async function updateViaZip(hotReload = false) {
//   const zipUrl = "https://github.com/777Wolf-dot/wolf-bot/archive/refs/heads/main.zip";
//   const tmpDir = path.join(process.cwd(), "tmp_update");
//   const zipPath = path.join(tmpDir, "wolf-bot-update.zip");
//   const extractDir = path.join(tmpDir, "extracted");
  
//   try {
//     // Create backup of important files
//     await preserveLocalFiles();
    
//     // Clean/create temp directory
//     if (fs.existsSync(tmpDir)) {
//       await run(`rm -rf ${tmpDir}`);
//     }
//     fs.mkdirSync(tmpDir, { recursive: true });
//     fs.mkdirSync(extractDir, { recursive: true });
    
//     console.log(`Downloading ZIP from wolf-bot: ${zipUrl}`);
    
//     // Download using curl or wget
//     let downloadCmd;
//     if (await run("which curl").then(() => true).catch(() => false)) {
//       downloadCmd = `curl -L "${zipUrl}" -o "${zipPath}" --connect-timeout 30 --max-time 300 --silent --show-error`;
//     } else if (await run("which wget").then(() => true).catch(() => false)) {
//       downloadCmd = `wget "${zipUrl}" -O "${zipPath}" --timeout=30 --tries=3 --quiet`;
//     } else {
//       throw new Error("Neither curl nor wget is available");
//     }
    
//     await run(downloadCmd);
    
//     if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
//       throw new Error("Downloaded ZIP file is empty or doesn't exist");
//     }
    
//     console.log(`Downloaded ${fs.statSync(zipPath).size} bytes from wolf-bot`);
    
//     // Extract ZIP
//     console.log("Extracting ZIP...");
    
//     if (await run("which unzip").then(() => true).catch(() => false)) {
//       await run(`unzip -o "${zipPath}" -d "${extractDir}"`);
//     } else if (await run("which 7z").then(() => true).catch(() => false)) {
//       await run(`7z x "${zipPath}" -o"${extractDir}" -y`);
//     } else {
//       throw new Error("No extraction tool found (install unzip or 7z)");
//     }
    
//     // Find the extracted content (GitHub ZIPs have wolf-bot-main folder)
//     const extractedItems = fs.readdirSync(extractDir);
//     let sourceDir = extractDir;
    
//     // Look for wolf-bot-main folder
//     const wolfBotFolder = extractedItems.find(item => 
//       item.toLowerCase().includes('wolf-bot')
//     );
    
//     if (wolfBotFolder) {
//       sourceDir = path.join(extractDir, wolfBotFolder);
//       console.log(`Found source folder: ${wolfBotFolder}`);
//     }
    
//     console.log(`Copying files from ${sourceDir} to ${process.cwd()}`);
    
//     // Files/directories to exclude from update
//     const excludeItems = [
//       '.git',
//       'node_modules',
//       'tmp',
//       'logs',
//       'session',
//       'data',
//       'settings.js',
//       'config.json',
//       '.env',
//       'tmp_update',
//       'tmp_preserve',
//       'tmp_changes'
//     ];
    
//     // For hot reload, track what files were updated
//     const updatedFiles = [];
    
//     // Copy files, excluding protected items
//     await copyDirWithExclude(sourceDir, process.cwd(), excludeItems, hotReload ? updatedFiles : null);
    
//     // Cleanup
//     await run(`rm -rf ${tmpDir}`);
    
//     return { 
//       success: true, 
//       source: "wolf-bot ZIP",
//       url: zipUrl,
//       updatedFiles: hotReload ? updatedFiles : []
//     };
//   } catch (error) {
//     // Cleanup on error
//     if (fs.existsSync(tmpDir)) {
//       await run(`rm -rf ${tmpDir}`).catch(() => {});
//     }
//     throw new Error(`ZIP update from wolf-bot failed: ${error.message}`);
//   }
// }

// // Helper function to copy directory with exclusions
// async function copyDirWithExclude(src, dest, exclude = [], updatedFiles = null) {
//   if (!fs.existsSync(dest)) {
//     fs.mkdirSync(dest, { recursive: true });
//   }
  
//   const entries = fs.readdirSync(src, { withFileTypes: true });
  
//   for (const entry of entries) {
//     const srcPath = path.join(src, entry.name);
//     const destPath = path.join(dest, entry.name);
    
//     // Check if excluded
//     if (exclude.some(pattern => {
//       if (pattern.includes('*')) {
//         const regex = new RegExp(pattern.replace(/\*/g, '.*'));
//         return regex.test(entry.name);
//       }
//       return entry.name === pattern;
//     })) {
//       console.log(`Skipping excluded: ${entry.name}`);
//       continue;
//     }
    
//     if (entry.isDirectory()) {
//       if (!fs.existsSync(destPath)) {
//         fs.mkdirSync(destPath, { recursive: true });
//       }
//       await copyDirWithExclude(srcPath, destPath, exclude, updatedFiles);
//     } else {
//       // Skip if destination is a protected file that should be preserved
//       const isProtected = ['settings.js', 'config.json', '.env'].includes(entry.name.toLowerCase());
//       if (isProtected && fs.existsSync(destPath)) {
//         console.log(`Preserving existing: ${entry.name}`);
//         continue;
//       }
      
//       // Check if file is different (for hot reload tracking)
//       let fileChanged = true;
//       if (updatedFiles !== null && fs.existsSync(destPath)) {
//         try {
//           const srcContent = fs.readFileSync(srcPath, 'utf8');
//           const destContent = fs.readFileSync(destPath, 'utf8');
//           fileChanged = srcContent !== destContent;
//         } catch {
//           fileChanged = true;
//         }
//       }
      
//       if (fileChanged) {
//         fs.copyFileSync(srcPath, destPath);
//         console.log(`Copied: ${entry.name}`);
        
//         if (updatedFiles !== null) {
//           updatedFiles.push(destPath);
//         }
//       }
//     }
//   }
// }

// // Copy directory (simple version)
// async function copyDir(src, dest) {
//   if (!fs.existsSync(dest)) {
//     fs.mkdirSync(dest, { recursive: true });
//   }
  
//   const entries = fs.readdirSync(src, { withFileTypes: true });
  
//   for (const entry of entries) {
//     const srcPath = path.join(src, entry.name);
//     const destPath = path.join(dest, entry.name);
    
//     if (entry.isDirectory()) {
//       await copyDir(srcPath, destPath);
//     } else {
//       fs.copyFileSync(srcPath, destPath);
//     }
//   }
// }

// // Enhanced settings loader with hot reload support
// async function loadSettings() {
//   const possiblePaths = [
//     path.join(process.cwd(), "settings.js"),
//     path.join(process.cwd(), "config", "settings.js"),
//     path.join(__dirname, "..", "settings.js"),
//     path.join(__dirname, "..", "..", "settings.js"),
//   ];
  
//   let settings = {};
  
//   for (const settingsPath of possiblePaths) {
//     try {
//       if (fs.existsSync(settingsPath)) {
//         console.log(`Loading settings from: ${settingsPath}`);
        
//         // Clear any existing cache
//         clearModuleCache(settingsPath);
        
//         // Load the module
//         const module = await import(`file://${settingsPath}`);
//         settings = module.default || module;
        
//         // Watch for changes if not already watching
//         if (!fileWatcher.watchers.has(settingsPath)) {
//           fileWatcher.watchFile(settingsPath, async () => {
//             console.log(`🔄 Settings file changed, reloading...`);
//             try {
//               clearModuleCache(settingsPath);
//               const newModule = await import(`file://${settingsPath}`);
//               Object.assign(settings, newModule.default || newModule);
//               console.log(`✅ Settings reloaded successfully`);
//             } catch (error) {
//               console.error(`❌ Failed to reload settings:`, error);
//             }
//           });
//         }
        
//         break;
//       }
//     } catch (error) {
//       console.warn(`Failed to load settings from ${settingsPath}:`, error.message);
//       continue;
//     }
//   }
  
//   if (Object.keys(settings).length === 0) {
//     console.warn("No settings file found, using empty settings");
//   }
  
//   return settings;
// }

// // Dynamic command loader with hot reload
// export class DynamicCommandLoader {
//   constructor(commandsDir = path.join(process.cwd(), 'commands')) {
//     this.commandsDir = commandsDir;
//     this.commands = new Map();
//     this.commandFiles = new Map();
//   }
  
//   async loadAllCommands() {
//     console.log(`📂 Loading commands from: ${this.commandsDir}`);
    
//     if (!fs.existsSync(this.commandsDir)) {
//       console.warn(`Commands directory not found: ${this.commandsDir}`);
//       return this.commands;
//     }
    
//     const files = fs.readdirSync(this.commandsDir)
//       .filter(file => file.endsWith('.js') || file.endsWith('.mjs'));
    
//     for (const file of files) {
//       await this.loadCommand(file);
//     }
    
//     // Watch for changes
//     this.watchCommands();
    
//     return this.commands;
//   }
  
//   async loadCommand(filename) {
//     const filePath = path.join(this.commandsDir, filename);
    
//     try {
//       // Clear cache
//       clearModuleCache(filePath);
      
//       // Import the module
//       const module = await import(`file://${filePath}`);
//       const command = module.default || module;
      
//       if (command && command.name) {
//         this.commands.set(command.name, command);
//         this.commandFiles.set(command.name, filePath);
//         console.log(`✅ Loaded command: ${command.name}`);
//         return command;
//       } else {
//         console.warn(`Invalid command module in ${filename}`);
//       }
//     } catch (error) {
//       console.error(`❌ Failed to load command ${filename}:`, error);
//     }
    
//     return null;
//   }
  
//   watchCommands() {
//     // Watch the commands directory for changes
//     fileWatcher.watchDirectory(this.commandsDir, async (changedPath) => {
//       const filename = path.basename(changedPath);
      
//       if (filename.endsWith('.js') || filename.endsWith('.mjs')) {
//         console.log(`🔄 Command file changed: ${filename}`);
        
//         // Find which command this file belongs to
//         for (const [cmdName, cmdPath] of this.commandFiles.entries()) {
//           if (cmdPath === changedPath) {
//             // Reload the command
//             await this.loadCommand(filename);
//             console.log(`✅ Reloaded command: ${cmdName}`);
//             break;
//           }
//         }
//       }
//     });
//   }
  
//   getCommand(name) {
//     return this.commands.get(name);
//   }
  
//   getAllCommands() {
//     return Array.from(this.commands.values());
//   }
// }

// // Dynamic event handler loader
// export class DynamicEventHandler {
//   constructor(handlersDir = path.join(process.cwd(), 'handlers')) {
//     this.handlersDir = handlersDir;
//     this.handlers = new Map();
//   }
  
//   async loadAllHandlers() {
//     console.log(`📂 Loading event handlers from: ${this.handlersDir}`);
    
//     if (!fs.existsSync(this.handlersDir)) {
//       console.warn(`Handlers directory not found: ${this.handlersDir}`);
//       return this.handlers;
//     }
    
//     const files = fs.readdirSync(this.handlersDir)
//       .filter(file => file.endsWith('.js') || file.endsWith('.mjs'));
    
//     for (const file of files) {
//       await this.loadHandler(file);
//     }
    
//     // Watch for changes
//     this.watchHandlers();
    
//     return this.handlers;
//   }
  
//   async loadHandler(filename) {
//     const filePath = path.join(this.handlersDir, filename);
    
//     try {
//       // Clear cache
//       clearModuleCache(filePath);
      
//       // Import the module
//       const module = await import(`file://${filePath}`);
//       const handler = module.default || module;
      
//       if (handler && handler.event) {
//         this.handlers.set(handler.event, handler);
//         console.log(`✅ Loaded handler for event: ${handler.event}`);
//         return handler;
//       } else {
//         console.warn(`Invalid handler module in ${filename}`);
//       }
//     } catch (error) {
//       console.error(`❌ Failed to load handler ${filename}:`, error);
//     }
    
//     return null;
//   }
  
//   watchHandlers() {
//     // Watch the handlers directory for changes
//     fileWatcher.watchDirectory(this.handlersDir, async (changedPath) => {
//       const filename = path.basename(changedPath);
      
//       if (filename.endsWith('.js') || filename.endsWith('.mjs')) {
//         console.log(`🔄 Handler file changed: ${filename}`);
//         await this.loadHandler(filename);
//       }
//     });
//   }
  
//   getHandler(event) {
//     return this.handlers.get(event);
//   }
// }

// // Update progress bar animation
// function getProgressBar(percentage) {
//   const filled = Math.round((percentage / 100) * 10);
//   const empty = 10 - filled;
//   return `█`.repeat(filled) + `▒`.repeat(empty);
// }

// // Main command handler
// export default {
//   name: "update",
//   description: "Update bot from wolf-bot repository (with hot reload)",
//   category: "owner",
//   ownerOnly: true,

//   async execute(sock, m, args) {
//     const jid = m.key.remoteJid;
//     const sender = m.key.participant || m.key.remoteJid;
    
//     // Send initial message and store its key for editing
//     const initialMessage = await sock.sendMessage(jid, { 
//       text: "🔄 WolfBot Update System\nChecking for updates...\nInitializing update process..."
//     }, { quoted: m });
    
//     let updateMessageKey = initialMessage.key;
    
//     // Edit message helper
//     const editMessage = async (text) => {
//       try {
//         await sock.sendMessage(jid, { 
//           text,
//           edit: updateMessageKey
//         }, { quoted: m });
//       } catch (error) {
//         console.log("Could not edit message, sending new one:", error.message);
//         const newMsg = await sock.sendMessage(jid, { text }, { quoted: m });
//         updateMessageKey = newMsg.key;
//       }
//     };
    
//     // Animate progress
//     const animateProgress = async (baseText, progress = 0) => {
//       const bar = getProgressBar(progress);
//       const progressText = `${baseText}\n${bar} ${progress}%`;
//       await editMessage(progressText);
//     };
    
//     try {
//       // Load settings
//       await animateProgress("🔍 Loading bot settings...", 10);
//       const settings = await loadSettings();
      
//       // Check if owner
//       const isOwner = m.key.fromMe || 
//         (settings.ownerNumber && sender.includes(settings.ownerNumber)) ||
//         (settings.botOwner && sender.includes(settings.botOwner));
      
//       if (!isOwner) {
//         await editMessage("❌ Permission Denied\nOnly the bot owner can update the bot.");
//         return;
//       }
      
//       // Parse arguments
//       const forceMethod = args[0]?.toLowerCase();
//       const isForceZip = forceMethod === 'zip';
//       const isForceGit = forceMethod === 'git';
//       const hotReload = args.includes('hot') || args.includes('live');
//       const softUpdate = args.includes('soft') || args.includes('no-restart');
      
//       let updateResult;
      
//       // Check if we have git repo, initialize if not
//       await animateProgress("📁 Checking git repository...", 20);
//       const hasGit = await hasGitRepo();
      
//       if (!hasGit && !isForceZip) {
//         await animateProgress("📦 Initializing git repository...", 30);
//         await initGitRepo();
//       }
      
//       // Determine update method
//       if ((hasGit && !isForceZip) || isForceGit) {
//         // Git update from wolf-bot
//         await animateProgress("🌐 Checking wolf-bot repository...", 40);
        
//         updateResult = await updateFromWolfBot(hotReload || softUpdate);
        
//         if (updateResult.alreadyUpToDate) {
//           await editMessage(
//             "✅ Already Up to Date!\n" +
//             `Source: ${updateResult.source}\n` +
//             `Commit: ${updateResult.newRev.substring(0, 7)}\n` +
//             "No updates available."
//           );
//           return;
//         } else {
//           await animateProgress("📥 Installing updates...", 60);
          
//           // Install dependencies if package.json changed
//           const needsNpmInstall = updateResult.updatedFiles.some(file => 
//             file.includes('package.json') || file.includes('package-lock.json')
//           );
          
//           if (needsNpmInstall) {
//             await animateProgress("📦 Installing dependencies...", 70);
//             try {
//               await run("npm install --no-audit --no-fund --loglevel=error");
//               await animateProgress("✅ Dependencies installed!", 80);
//             } catch (npmError) {
//               console.error("npm install failed:", npmError);
//             }
//           }
          
//           // Hot reload if requested and possible
//           if ((hotReload || softUpdate) && updateResult.updatedFiles.length > 0) {
//             await animateProgress("🔄 Performing hot reload...", 85);
            
//             try {
//               const reloadResults = await executeHotReload(updateResult.updatedFiles);
//               const successCount = reloadResults.filter(r => r.success).length;
              
//               await editMessage(
//                 "✅ Hot Update Complete!\n" +
//                 `Source: ${updateResult.source}\n` +
//                 `Updated: ${updateResult.oldRev.substring(0, 7)} → ${updateResult.newRev.substring(0, 7)}\n` +
//                 `Files Updated: ${updateResult.updatedFiles.length}\n` +
//                 `Hot Reloaded: ${successCount}/${reloadResults.length} modules\n` +
//                 `Backup: ${updateResult.backupBranch || 'None'}\n` +
//                 "Bot continues running without restart! 🎉"
//               );
              
//               // Cleanup
//               if (updateResult.changesDir && fs.existsSync(updateResult.changesDir)) {
//                 fs.rmSync(updateResult.changesDir, { recursive: true });
//               }
              
//               return;
//             } catch (reloadError) {
//               console.error("Hot reload failed:", reloadError);
//               await editMessage(
//                 "⚠️ Update Applied but Hot Reload Failed\n" +
//                 "Some files were updated but couldn't be reloaded.\n" +
//                 "Restart may be required for full effect."
//               );
//             }
//           }
          
//           await editMessage(
//             "✅ Update Complete!\n" +
//             `Source: ${updateResult.source}\n` +
//             `Updated: ${updateResult.oldRev.substring(0, 7)} → ${updateResult.newRev.substring(0, 7)}\n` +
//             `Files Updated: ${updateResult.updatedFiles.length}\n` +
//             `Backup: ${updateResult.backupBranch || 'None'}\n` +
//             "Preparing to restart..."
//           );
//         }
//       } else {
//         // ZIP update from wolf-bot
//         await animateProgress("📦 Downloading wolf-bot update...", 40);
        
//         updateResult = await updateViaZip(hotReload || softUpdate);
        
//         await animateProgress("📂 Extracting files...", 60);
//         await animateProgress("📝 Installing updates...", 80);
        
//         await editMessage(
//           "✅ ZIP Update Complete!\n" +
//           `Source: ${updateResult.source}\n` +
//           `URL: ${updateResult.url}\n` +
//           `Files Updated: ${updateResult.updatedFiles.length}\n` +
//           "Preparing to restart..."
//         );
//       }
      
//       // Only restart if not doing soft update
//       if (!softUpdate && !hotReload) {
//         await animateProgress("🔄 Restarting WolfBot...", 95);
        
//         // Small delay to ensure message is sent
//         await new Promise(resolve => setTimeout(resolve, 1000));
        
//         // Send final message
//         await editMessage(
//           "🚀 Restarting Now!\n" +
//           "Bot will be back in a few moments...\n" +
//           "WolfBot is updating..."
//         );
        
//         // Restart the process
//         await restartProcess();
//       } else {
//         await editMessage(
//           "✅ Soft Update Complete!\n" +
//           "Updates have been applied without restart.\n" +
//           "Some changes may require restart to take full effect."
//         );
//       }
      
//     } catch (error) {
//       console.error("Update error:", error);
      
//       let errorMessage = 
//         "❌ Update Failed\n" +
//         `Error: ${error.message}\n\n`;
      
//       // Add helpful suggestions
//       if (error.message.includes('git') || error.message.includes('ZIP')) {
//         errorMessage += "Try these solutions:\n";
//         errorMessage += "• Use different method: `!update git` or `!update zip`\n";
//         errorMessage += "• Use hot reload: `!update hot`\n";
//         errorMessage += "• Soft update (no restart): `!update soft`\n";
//         errorMessage += "• Check internet connection\n";
//         errorMessage += "• Ensure required tools are installed: git, curl, unzip\n";
//         errorMessage += "• Manually update from: https://github.com/777Wolf-dot/wolf-bot";
//       }
      
//       await editMessage(errorMessage);
//     }
//   }
// };

// // Simple restart function (kept for compatibility)
// async function restartProcess() {
//   console.log("Restarting bot...");
  
//   try {
//     // Try PM2 first
//     if (await run("which pm2").then(() => true).catch(() => false)) {
//       console.log("Restarting with PM2...");
//       await run("pm2 restart all");
//       return;
//     }
    
//     // Try forever
//     if (await run("which forever").then(() => true).catch(() => false)) {
//       console.log("Restarting with Forever...");
//       await run("forever restartall");
//       return;
//     }
    
//     // If no process manager, just exit
//     console.log("No process manager found, exiting...");
//     process.exit(0);
    
//   } catch (error) {
//     console.error("Restart failed:", error);
//     // Force exit
//     process.exit(0);
//   }
// }


























import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from 'module';
import os from 'os';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Cross-platform exec with better error handling
async function run(cmd, timeout = 60000, cwd = process.cwd()) {
  try {
    const { stdout, stderr } = await execAsync(cmd, { 
      timeout, 
      cwd,
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
    });
    
    // Filter out common non-critical warnings
    if (stderr && !stderr.includes('warning') && !stderr.includes('WARNING') && 
        !stderr.includes('deprecated') && stderr.trim()) {
      console.warn(`Command stderr: ${stderr.substring(0, 200)}`);
    }
    return stdout.trim();
  } catch (error) {
    console.error(`Command failed: ${cmd}`, error.message);
    // Provide more context about the error
    if (error.code === 'ETIMEDOUT') {
      throw new Error(`Command timed out after ${timeout}ms: ${cmd}`);
    } else if (error.code === 127 || error.code === 'ENOENT') {
      throw new Error(`Command not found or not executable: ${cmd}. Please install required tools.`);
    }
    throw error;
  }
}

// Check if a command/tool is available
async function checkTool(toolName) {
  try {
    if (process.platform === 'win32') {
      await run(`where ${toolName}`, 5000);
    } else {
      await run(`command -v ${toolName}`, 5000);
    }
    return true;
  } catch {
    return false;
  }
}

// Cache for clearing require cache
const originalRequireResolve = require.resolve;
const moduleCache = new Map();

// Clear module cache for hot reload - IMPROVED
function clearModuleCache(modulePath) {
  const normalizedPath = path.resolve(modulePath);
  
  // Clear from require.cache
  if (require.cache) {
    for (const key in require.cache) {
      if (key.includes(normalizedPath)) {
        delete require.cache[key];
      }
    }
  }
  
  // Clear from module cache
  moduleCache.delete(normalizedPath);
  
  // Clear ES module cache (Node.js 20+ workaround)
  try {
    // Invalidate import cache by modifying the module path
    const cacheBuster = `file://${normalizedPath}?t=${Date.now()}`;
    return cacheBuster;
  } catch (error) {
    console.warn('Could not clear ES module cache:', error.message);
    return `file://${normalizedPath}`;
  }
}

// Hot reload handler registry
const hotReloadHandlers = new Set();

// Register a module for hot reload
export function registerForHotReload(modulePath, reloadCallback) {
  const normalizedPath = path.resolve(modulePath);
  hotReloadHandlers.add({
    path: normalizedPath,
    callback: reloadCallback
  });
  console.log(`📝 Registered for hot reload: ${normalizedPath}`);
  return () => hotReloadHandlers.delete(normalizedPath);
}

// Execute hot reload for updated modules - IMPROVED
async function executeHotReload(updatedFiles = []) {
  console.log(`🔄 Hot reloading ${updatedFiles.length} updated modules`);
  
  const reloadResults = [];
  
  // Group files by directory to optimize reloads
  const filesByDir = new Map();
  updatedFiles.forEach(filePath => {
    const dir = path.dirname(filePath);
    if (!filesByDir.has(dir)) {
      filesByDir.set(dir, []);
    }
    filesByDir.get(dir).push(filePath);
  });
  
  for (const handler of hotReloadHandlers) {
    // Check if this handler's module was updated
    const needsReload = updatedFiles.some(filePath => {
      const handlerDir = path.dirname(handler.path);
      const fileDir = path.dirname(filePath);
      return filePath === handler.path || 
             filePath.includes(handler.path) || 
             handler.path.includes(filePath) ||
             fileDir === handlerDir;
    });
    
    if (needsReload) {
      try {
        console.log(`Hot reloading: ${handler.path}`);
        
        // Clear cache first with retry
        let cacheBuster;
        for (let i = 0; i < 3; i++) {
          try {
            cacheBuster = clearModuleCache(handler.path);
            break;
          } catch (cacheError) {
            if (i === 2) throw cacheError;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // Execute reload callback with timeout
        const result = await Promise.race([
          handler.callback(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Hot reload timeout')), 10000)
          )
        ]);
        
        reloadResults.push({
          path: handler.path,
          success: true,
          result
        });
        
        console.log(`✅ Successfully hot reloaded: ${handler.path}`);
      } catch (error) {
        console.error(`❌ Failed to hot reload ${handler.path}:`, error);
        reloadResults.push({
          path: handler.path,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  return reloadResults;
}

// Enhanced file watcher for dynamic updates - IMPROVED
class FileWatcher {
  constructor() {
    this.watchers = new Map();
    this.debounceTimers = new Map();
    this.retryCounts = new Map();
  }
  
  watchFile(filePath, callback, debounceMs = 2000) {
    const normalizedPath = path.resolve(filePath);
    
    if (this.watchers.has(normalizedPath)) {
      this.unwatchFile(normalizedPath);
    }
    
    try {
      // Ensure file exists before watching
      if (!fs.existsSync(normalizedPath)) {
        console.warn(`File does not exist, cannot watch: ${normalizedPath}`);
        return;
      }
      
      const watcher = fs.watch(normalizedPath, (eventType, filename) => {
        if (eventType === 'change' || eventType === 'rename') {
          // Debounce to prevent multiple rapid triggers
          const timerKey = normalizedPath;
          
          if (this.debounceTimers.has(timerKey)) {
            clearTimeout(this.debounceTimers.get(timerKey));
          }
          
          this.debounceTimers.set(timerKey, setTimeout(() => {
            console.log(`📁 File changed: ${normalizedPath}`);
            // Small delay to ensure file is fully written
            setTimeout(() => {
              if (fs.existsSync(normalizedPath)) {
                callback(normalizedPath);
              }
            }, 100);
            this.debounceTimers.delete(timerKey);
          }, debounceMs));
        }
      });
      
      watcher.on('error', (error) => {
        console.error(`File watcher error for ${normalizedPath}:`, error);
        // Attempt to re-watch
        this.retryWatch(normalizedPath, callback, debounceMs);
      });
      
      this.watchers.set(normalizedPath, watcher);
      console.log(`👁️  Watching file: ${normalizedPath}`);
    } catch (error) {
      console.error(`Failed to watch file ${normalizedPath}:`, error);
      this.retryWatch(normalizedPath, callback, debounceMs);
    }
  }
  
  retryWatch(filePath, callback, debounceMs, attempt = 1) {
    if (attempt > 3) {
      console.error(`Max retries reached for watching: ${filePath}`);
      return;
    }
    
    setTimeout(() => {
      console.log(`🔄 Retry ${attempt} watching: ${filePath}`);
      this.watchFile(filePath, callback, debounceMs);
    }, 1000 * attempt);
  }
  
  watchDirectory(dirPath, callback, recursive = true, debounceMs = 2000) {
    const normalizedPath = path.resolve(dirPath);
    
    if (!fs.existsSync(normalizedPath)) {
      console.warn(`Directory does not exist: ${normalizedPath}`);
      // Try to create it
      try {
        fs.mkdirSync(normalizedPath, { recursive: true });
        console.log(`Created directory: ${normalizedPath}`);
      } catch (error) {
        console.error(`Could not create directory: ${normalizedPath}`, error);
        return;
      }
    }
    
    try {
      const watcher = fs.watch(normalizedPath, { recursive }, (eventType, filename) => {
        if (filename && (eventType === 'change' || eventType === 'rename')) {
          const fullPath = path.join(normalizedPath, filename);
          
          // Skip temporary files
          if (filename.startsWith('.') || filename.endsWith('.tmp') || 
              filename.includes('~$') || filename === 'Thumbs.db') {
            return;
          }
          
          // Debounce with unique key per file
          const key = `${normalizedPath}:${filename}`;
          if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
          }
          
          this.debounceTimers.set(key, setTimeout(() => {
            // Verify file exists and is not being written
            setTimeout(() => {
              if (fs.existsSync(fullPath)) {
                console.log(`📁 File in directory changed: ${filename}`);
                callback(fullPath);
              }
            }, 200);
            this.debounceTimers.delete(key);
          }, debounceMs));
        }
      });
      
      watcher.on('error', (error) => {
        console.error(`Directory watcher error for ${normalizedPath}:`, error);
      });
      
      this.watchers.set(normalizedPath, watcher);
      console.log(`👁️  Watching directory: ${normalizedPath} (recursive: ${recursive})`);
      
    } catch (error) {
      console.error(`Failed to watch directory ${normalizedPath}:`, error);
    }
  }
  
  unwatchFile(filePath) {
    const normalizedPath = path.resolve(filePath);
    
    if (this.watchers.has(normalizedPath)) {
      try {
        this.watchers.get(normalizedPath).close();
      } catch (error) {
        console.warn(`Error closing watcher for ${normalizedPath}:`, error);
      }
      this.watchers.delete(normalizedPath);
      console.log(`👁️  Stopped watching: ${normalizedPath}`);
    }
    
    // Clear any debounce timer
    if (this.debounceTimers.has(normalizedPath)) {
      clearTimeout(this.debounceTimers.get(normalizedPath));
      this.debounceTimers.delete(normalizedPath);
    }
  }
  
  unwatchAll() {
    for (const [path, watcher] of this.watchers) {
      try {
        watcher.close();
      } catch (error) {
        console.warn(`Error closing watcher for ${path}:`, error);
      }
    }
    this.watchers.clear();
    
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    console.log('👁️  Stopped all file watchers');
  }
}

// Create global file watcher instance
export const fileWatcher = new FileWatcher();

// Check if git repository exists
async function hasGitRepo() {
  try {
    const gitPath = path.join(process.cwd(), ".git");
    return fs.existsSync(gitPath) && fs.statSync(gitPath).isDirectory();
  } catch (error) {
    return false;
  }
}

// Get current git branch
async function getCurrentBranch() {
  try {
    return await run("git rev-parse --abbrev-ref HEAD", 10000);
  } catch (error) {
    console.warn("Could not get current git branch:", error.message);
    return "main"; // default branch
  }
}

// Initialize git repo if it doesn't exist - IMPROVED
async function initGitRepo() {
  try {
    if (!await hasGitRepo()) {
      console.log("Initializing git repository...");
      
      // Check if git is installed
      const gitInstalled = await checkTool('git');
      if (!gitInstalled) {
        throw new Error('Git is not installed. Please install git first.');
      }
      
      await run("git init");
      await run("git config user.email 'bot@wolfbot.com'");
      await run("git config user.name 'WolfBot'");
      
      // Try to set up origin
      try {
        await run("git remote add origin https://github.com/777Wolf-dot/Silent-Wolf--Bot.git");
      } catch (error) {
        console.warn("Could not add origin:", error.message);
      }
      
      // Create initial commit
      await run("git add .");
      try {
        await run('git commit -m "Initial commit by WolfBot"');
      } catch (error) {
        console.warn("Initial commit failed (no changes to commit):", error.message);
      }
      
      console.log("Git repository initialized");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to initialize git repo:", error);
    throw error;
  }
}

// Update from wolf-bot repo (your update source) - IMPROVED
async function updateFromWolfBot(hotReload = false) {
  let updatedFiles = [];
  const changesDir = path.join(process.cwd(), 'tmp_changes');
  
  try {
    // Check git installation
    const gitInstalled = await checkTool('git');
    if (!gitInstalled) {
      throw new Error('Git is not installed. Use !update zip instead.');
    }
    
    // Save current state
    const oldRev = await run("git rev-parse HEAD").catch(() => "unknown");
    const currentBranch = await getCurrentBranch();
    
    console.log(`Current branch: ${currentBranch}, Old revision: ${oldRev.substring(0, 7)}`);
    
    // Add wolf-bot as upstream if not already added
    try {
      await run("git remote get-url wolf-bot-upstream");
      console.log("wolf-bot-upstream remote already exists");
    } catch {
      console.log("Adding wolf-bot as upstream remote...");
      await run("git remote add wolf-bot-upstream https://github.com/777Wolf-dot/wolf-bot.git");
    }
    
    // Fetch from upstream
    console.log("Fetching updates from wolf-bot-upstream...");
    await run("git fetch wolf-bot-upstream --prune", 60000);
    
    // Check what branch to update from
    let sourceBranch = "main";
    
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
    const newRev = await run(`git rev-parse wolf-bot-upstream/${sourceBranch}`, 10000);
    const alreadyUpToDate = oldRev === newRev;
    
    if (alreadyUpToDate) {
      console.log("Already up to date with wolf-bot repo");
      return { 
        oldRev, 
        newRev, 
        alreadyUpToDate, 
        source: `wolf-bot/${sourceBranch}`,
        type: "git",
        updatedFiles: []
      };
    }
    
    console.log(`Updating from wolf-bot/${sourceBranch}: ${oldRev.substring(0, 7)} → ${newRev.substring(0, 7)}`);
    
    // For hot reload, get list of changed files
    if (hotReload) {
      try {
        // Get diff between current and new
        const diffOutput = await run(`git diff --name-only ${oldRev} wolf-bot-upstream/${sourceBranch}`, 15000);
        updatedFiles = diffOutput.split('\n')
          .filter(line => line.trim())
          .map(file => path.resolve(file));
        
        console.log(`Changed files detected: ${updatedFiles.length} files`);
        
        if (updatedFiles.length > 0) {
          // Create temporary directory for changes
          if (fs.existsSync(changesDir)) {
            fs.rmSync(changesDir, { recursive: true });
          }
          fs.mkdirSync(changesDir, { recursive: true });
          
          // Save current versions of changed files
          for (const file of updatedFiles) {
            if (fs.existsSync(file)) {
              const destDir = path.join(changesDir, path.dirname(file));
              if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
              }
              fs.copyFileSync(file, path.join(changesDir, file));
              console.log(`Backed up: ${file}`);
            }
          }
        }
      } catch (error) {
        console.warn("Could not get diff:", error.message);
      }
    }
    
    // Create backup branch just in case
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupBranch = `backup-before-update-${timestamp}`;
    await run(`git branch ${backupBranch}`);
    console.log(`Created backup branch: ${backupBranch}`);
    
    // Reset to wolf-bot's latest with merge strategy
    await run(`git reset --hard wolf-bot-upstream/${sourceBranch}`);
    
    // Try to preserve important local files
    await preserveLocalFiles();
    
    // Clean untracked files (be careful) - IMPROVED for panels
    try {
      const excludePatterns = [
        '-e node_modules',
        '-e tmp*',
        '-e logs',
        '-e session*',
        '-e settings.js',
        '-e config.json',
        '-e .env*',
        '-e data',
        '-e *.log',
        '-e *.tmp'
      ].join(' ');
      
      await run(`git clean -fd ${excludePatterns}`, 30000);
    } catch (cleanError) {
      console.warn("Git clean failed:", cleanError.message);
    }
    
    return { 
      oldRev, 
      newRev, 
      alreadyUpToDate, 
      source: `wolf-bot/${sourceBranch}`,
      backupBranch,
      type: "git",
      updatedFiles,
      changesDir: updatedFiles.length > 0 ? changesDir : null
    };
    
  } catch (error) {
    console.error("Update from wolf-bot failed:", error);
    
    // Try to restore from backup
    try {
      const branches = await run("git branch --list backup-before-update-*");
      if (branches) {
        const branchList = branches.split('\n').filter(b => b.trim());
        if (branchList.length > 0) {
          const latestBackup = branchList[branchList.length - 1].trim().replace('* ', '');
          await run(`git reset --hard ${latestBackup}`);
          console.log(`Restored from backup: ${latestBackup}`);
        }
      }
    } catch (restoreError) {
      console.error("Could not restore from backup:", restoreError);
    }
    
    // Clean up temp directory
    if (fs.existsSync(changesDir)) {
      try {
        fs.rmSync(changesDir, { recursive: true });
      } catch (cleanupError) {
        console.warn("Could not cleanup changes dir:", cleanupError.message);
      }
    }
    
    throw new Error(`Update from wolf-bot failed: ${error.message}`);
  }
}

// Preserve important local files that shouldn't be overwritten - IMPROVED
async function preserveLocalFiles() {
  const filesToPreserve = [
    'settings.js',
    'settings.json',
    'config.js',
    'config.json',
    '.env',
    '.env.local',
    '.env.production',
    'session',
    'session*',
    'data',
    'data/*',
    'logs',
    'logs/*',
    'tmp*',
    'tmp_changes',
    'tmp_preserve',
    'tmp_update',
    '*.db',
    '*.sqlite',
    'database.json'
  ];
  
  const tmpDir = path.join(process.cwd(), 'tmp_preserve_' + Date.now());
  
  try {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    for (const pattern of filesToPreserve) {
      try {
        // Handle wildcard patterns
        if (pattern.includes('*')) {
          const baseDir = pattern.split('*')[0];
          const dirPath = path.join(process.cwd(), baseDir);
          
          if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
            // Copy entire directory
            const destDir = path.join(tmpDir, baseDir);
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            
            const entries = fs.readdirSync(dirPath);
            for (const entry of entries) {
              const srcPath = path.join(dirPath, entry);
              const destPath = path.join(destDir, entry);
              
              if (fs.statSync(srcPath).isDirectory()) {
                await copyDir(srcPath, destPath);
              } else {
                fs.copyFileSync(srcPath, destPath);
              }
            }
          }
        } else {
          // Handle specific file/directory
          const filePath = path.join(process.cwd(), pattern);
          const tmpPath = path.join(tmpDir, pattern);
          
          if (fs.existsSync(filePath)) {
            if (fs.statSync(filePath).isDirectory()) {
              await copyDir(filePath, tmpPath);
            } else {
              // Ensure destination directory exists
              const destDir = path.dirname(tmpPath);
              if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
              }
              fs.copyFileSync(filePath, tmpPath);
            }
            console.log(`Preserved: ${pattern}`);
          }
        }
      } catch (error) {
        console.warn(`Could not preserve ${pattern}:`, error.message);
      }
    }
    
    // Return the temp dir for later restoration
    return tmpDir;
    
  } catch (error) {
    console.error("Failed to preserve local files:", error);
    return null;
  }
}

// Restore preserved files
async function restorePreservedFiles(tmpDir) {
  if (!tmpDir || !fs.existsSync(tmpDir)) {
    return;
  }
  
  try {
    const preservedItems = fs.readdirSync(tmpDir);
    
    for (const item of preservedItems) {
      const srcPath = path.join(tmpDir, item);
      const destPath = path.join(process.cwd(), item);
      
      try {
        if (fs.existsSync(destPath)) {
          // Backup the new version just in case
          const backupPath = destPath + '.update_backup';
          if (fs.existsSync(destPath)) {
            if (fs.statSync(destPath).isDirectory()) {
              await copyDir(destPath, backupPath);
            } else {
              fs.copyFileSync(destPath, backupPath);
            }
          }
          
          // Restore preserved version
          if (fs.statSync(srcPath).isDirectory()) {
            if (fs.existsSync(destPath)) {
              fs.rmSync(destPath, { recursive: true });
            }
            await copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
          
          console.log(`Restored: ${item}`);
          
          // Clean up backup after successful restore
          if (fs.existsSync(backupPath)) {
            if (fs.statSync(backupPath).isDirectory()) {
              fs.rmSync(backupPath, { recursive: true });
            } else {
              fs.unlinkSync(backupPath);
            }
          }
        } else {
          // Copy if doesn't exist
          if (fs.statSync(srcPath).isDirectory()) {
            await copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
          console.log(`Created: ${item}`);
        }
      } catch (itemError) {
        console.warn(`Could not restore ${item}:`, itemError.message);
      }
    }
    
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
    
  } catch (error) {
    console.error("Failed to restore preserved files:", error);
  }
}

// Update via ZIP from wolf-bot repo - IMPROVED for panels
async function updateViaZip(hotReload = false) {
  const zipUrl = "https://github.com/777Wolf-dot/wolf-bot/archive/refs/heads/main.zip";
  const tmpDir = path.join(process.cwd(), "tmp_update_" + Date.now());
  const zipPath = path.join(tmpDir, "wolf-bot-update.zip");
  const extractDir = path.join(tmpDir, "extracted");
  
  try {
    // Create backup of important files
    const preserveDir = await preserveLocalFiles();
    
    // Check for download tools
    const hasCurl = await checkTool('curl');
    const hasWget = await checkTool('wget');
    
    if (!hasCurl && !hasWget) {
      throw new Error("Neither curl nor wget is available. Please install one of them.");
    }
    
    // Clean/create temp directory
    if (fs.existsSync(tmpDir)) {
      await run(`rm -rf "${tmpDir}"`);
    }
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(extractDir, { recursive: true });
    
    console.log(`Downloading ZIP from wolf-bot: ${zipUrl}`);
    
    // Download using curl or wget with better error handling
    let downloadCmd;
    if (hasCurl) {
      downloadCmd = `curl -L "${zipUrl}" -o "${zipPath}" --connect-timeout 30 --max-time 300 --progress-bar --fail`;
    } else {
      downloadCmd = `wget "${zipUrl}" -O "${zipPath}" --timeout=30 --tries=3 --no-verbose --show-progress`;
    }
    
    await run(downloadCmd, 300000); // 5 minute timeout for download
    
    if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
      throw new Error("Downloaded ZIP file is empty or doesn't exist");
    }
    
    console.log(`Downloaded ${fs.statSync(zipPath).size} bytes from wolf-bot`);
    
    // Extract ZIP
    console.log("Extracting ZIP...");
    
    const hasUnzip = await checkTool('unzip');
    const has7z = await checkTool('7z');
    
    if (hasUnzip) {
      await run(`unzip -o "${zipPath}" -d "${extractDir}"`, 60000);
    } else if (has7z) {
      await run(`7z x "${zipPath}" -o"${extractDir}" -y`, 60000);
    } else {
      // Try to use Node.js extraction as fallback
      const AdmZip = await import('adm-zip').catch(() => null);
      if (AdmZip) {
        const zip = new AdmZip.default(zipPath);
        zip.extractAllTo(extractDir, true);
      } else {
        throw new Error("No extraction tool found (install unzip, 7z, or adm-zip npm package)");
      }
    }
    
    // Find the extracted content
    const extractedItems = fs.readdirSync(extractDir);
    let sourceDir = extractDir;
    
    // Look for wolf-bot-main folder (GitHub ZIP format)
    const wolfBotFolder = extractedItems.find(item => 
      item.toLowerCase().includes('wolf-bot') || 
      item.toLowerCase().includes('main')
    );
    
    if (wolfBotFolder) {
      sourceDir = path.join(extractDir, wolfBotFolder);
      console.log(`Found source folder: ${wolfBotFolder}`);
    }
    
    console.log(`Copying files from ${sourceDir} to ${process.cwd()}`);
    
    // Files/directories to exclude from update
    const excludeItems = [
      '.git',
      '.github',
      'node_modules',
      'tmp*',
      'logs',
      'session*',
      'data',
      'settings.js',
      'settings.json',
      'config.js',
      'config.json',
      '.env*',
      'tmp_update*',
      'tmp_preserve*',
      'tmp_changes',
      '*.log',
      '*.db',
      '*.sqlite',
      'database.json'
    ];
    
    // For hot reload, track what files were updated
    const updatedFiles = [];
    
    // Copy files, excluding protected items
    await copyDirWithExclude(sourceDir, process.cwd(), excludeItems, hotReload ? updatedFiles : null);
    
    // Restore preserved files
    if (preserveDir) {
      await restorePreservedFiles(preserveDir);
    }
    
    // Cleanup
    if (fs.existsSync(tmpDir)) {
      await run(`rm -rf "${tmpDir}"`).catch(() => {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (cleanupError) {
          console.warn("Could not cleanup tmpDir:", cleanupError.message);
        }
      });
    }
    
    return { 
      success: true, 
      source: "wolf-bot ZIP",
      url: zipUrl,
      updatedFiles: hotReload ? updatedFiles : []
    };
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn("Could not cleanup tmpDir on error:", cleanupError.message);
      }
    }
    throw new Error(`ZIP update failed: ${error.message}`);
  }
}

// Helper function to copy directory with exclusions - IMPROVED
async function copyDirWithExclude(src, dest, exclude = [], updatedFiles = null) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory does not exist: ${src}`);
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Check if excluded using pattern matching
    let isExcluded = false;
    for (const pattern of exclude) {
      if (pattern.includes('*')) {
        // Convert wildcard pattern to regex
        const regexPattern = '^' + pattern.replace(/\*/g, '.*') + '$';
        const regex = new RegExp(regexPattern);
        if (regex.test(entry.name)) {
          isExcluded = true;
          break;
        }
      } else if (entry.name === pattern) {
        isExcluded = true;
        break;
      }
    }
    
    if (isExcluded) {
      console.log(`Skipping excluded: ${entry.name}`);
      continue;
    }
    
    try {
      if (entry.isDirectory()) {
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        await copyDirWithExclude(srcPath, destPath, exclude, updatedFiles);
      } else {
        // Skip if destination is a protected file that should be preserved
        const protectedFiles = ['settings.js', 'settings.json', 'config.js', 'config.json', '.env'];
        const isProtected = protectedFiles.some(p => 
          entry.name.toLowerCase() === p.toLowerCase()
        );
        
        if (isProtected && fs.existsSync(destPath)) {
          console.log(`Preserving existing: ${entry.name}`);
          continue;
        }
        
        // Check if file is different (for hot reload tracking)
        let fileChanged = true;
        if (updatedFiles !== null && fs.existsSync(destPath)) {
          try {
            const srcStat = fs.statSync(srcPath);
            const destStat = fs.statSync(destPath);
            
            // Compare file size and modification time first (faster)
            if (srcStat.size === destStat.size && 
                srcStat.mtimeMs === destStat.mtimeMs) {
              fileChanged = false;
            } else {
              // Compare content if sizes differ
              const srcContent = fs.readFileSync(srcPath);
              const destContent = fs.readFileSync(destPath);
              fileChanged = !srcContent.equals(destContent);
            }
          } catch (compareError) {
            fileChanged = true;
          }
        }
        
        if (fileChanged) {
          // Ensure destination directory exists
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          
          fs.copyFileSync(srcPath, destPath);
          console.log(`Copied: ${entry.name}`);
          
          if (updatedFiles !== null) {
            updatedFiles.push(path.resolve(destPath));
          }
        } else {
          console.log(`Unchanged: ${entry.name}`);
        }
      }
    } catch (error) {
      console.error(`Error processing ${entry.name}:`, error.message);
    }
  }
}

// Copy directory (simple version)
async function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  
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

// Enhanced settings loader with hot reload support - IMPROVED
export async function loadSettings() {
  const possiblePaths = [
    path.join(process.cwd(), "settings.js"),
    path.join(process.cwd(), "settings.json"),
    path.join(process.cwd(), "config", "settings.js"),
    path.join(process.cwd(), "config", "settings.json"),
    path.join(__dirname, "..", "settings.js"),
    path.join(__dirname, "..", "settings.json"),
    path.join(__dirname, "..", "..", "settings.js"),
    path.join(__dirname, "..", "..", "settings.json"),
  ];
  
  let settings = {};
  let loadedPath = null;
  
  for (const settingsPath of possiblePaths) {
    try {
      if (fs.existsSync(settingsPath)) {
        console.log(`Loading settings from: ${settingsPath}`);
        loadedPath = settingsPath;
        
        // Clear any existing cache
        clearModuleCache(settingsPath);
        
        // Load the module based on file extension
        if (settingsPath.endsWith('.js')) {
          const module = await import(`file://${settingsPath}?t=${Date.now()}`);
          settings = module.default || module;
        } else if (settingsPath.endsWith('.json')) {
          const content = fs.readFileSync(settingsPath, 'utf8');
          settings = JSON.parse(content);
        }
        
        // Watch for changes if not already watching
        if (loadedPath && !fileWatcher.watchers.has(loadedPath)) {
          fileWatcher.watchFile(loadedPath, async () => {
            console.log(`🔄 Settings file changed, reloading...`);
            try {
              // Wait a bit to ensure file is fully written
              await new Promise(resolve => setTimeout(resolve, 500));
              
              clearModuleCache(loadedPath);
              
              if (loadedPath.endsWith('.js')) {
                const newModule = await import(`file://${loadedPath}?t=${Date.now()}`);
                Object.assign(settings, newModule.default || newModule);
              } else if (loadedPath.endsWith('.json')) {
                const content = fs.readFileSync(loadedPath, 'utf8');
                Object.assign(settings, JSON.parse(content));
              }
              
              console.log(`✅ Settings reloaded successfully`);
            } catch (error) {
              console.error(`❌ Failed to reload settings:`, error.message);
            }
          }, 2000); // Longer debounce for settings
        }
        
        break;
      }
    } catch (error) {
      console.warn(`Failed to load settings from ${settingsPath}:`, error.message);
      continue;
    }
  }
  
  if (Object.keys(settings).length === 0) {
    console.warn("No settings file found, using empty settings");
  } else {
    console.log(`✅ Settings loaded successfully from: ${loadedPath}`);
  }
  
  return settings;
}

// Dynamic command loader with hot reload - IMPROVED
export class DynamicCommandLoader {
  constructor(commandsDir = path.join(process.cwd(), 'commands')) {
    this.commandsDir = commandsDir;
    this.commands = new Map();
    this.commandFiles = new Map();
    this.watching = false;
  }
  
  async loadAllCommands() {
    console.log(`📂 Loading commands from: ${this.commandsDir}`);
    
    if (!fs.existsSync(this.commandsDir)) {
      console.warn(`Commands directory not found: ${this.commandsDir}`);
      // Try to create it
      try {
        fs.mkdirSync(this.commandsDir, { recursive: true });
        console.log(`Created commands directory: ${this.commandsDir}`);
      } catch (error) {
        console.error(`Could not create commands directory:`, error);
      }
      return this.commands;
    }
    
    try {
      const files = fs.readdirSync(this.commandsDir)
        .filter(file => file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs'))
        .sort(); // Sort for consistent loading order
      
      console.log(`Found ${files.length} command files`);
      
      for (const file of files) {
        await this.loadCommand(file);
      }
      
      // Watch for changes
      if (!this.watching) {
        this.watchCommands();
        this.watching = true;
      }
      
      return this.commands;
    } catch (error) {
      console.error(`Error loading commands from ${this.commandsDir}:`, error);
      return this.commands;
    }
  }
  
  async loadCommand(filename) {
    const filePath = path.join(this.commandsDir, filename);
    
    try {
      // Check if file exists and is readable
      if (!fs.existsSync(filePath)) {
        console.warn(`Command file does not exist: ${filename}`);
        return null;
      }
      
      // Clear cache
      clearModuleCache(filePath);
      
      // Import the module with cache buster
      const cacheBuster = `file://${filePath}?t=${Date.now()}`;
      const module = await import(cacheBuster);
      const command = module.default || module;
      
      if (command && command.name && typeof command.execute === 'function') {
        this.commands.set(command.name, command);
        this.commandFiles.set(command.name, filePath);
        console.log(`✅ Loaded command: ${command.name} (${filename})`);
        return command;
      } else {
        console.warn(`Invalid command module in ${filename} - missing name or execute function`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Failed to load command ${filename}:`, error.message);
      return null;
    }
  }
  
  watchCommands() {
    // Watch the commands directory for changes
    fileWatcher.watchDirectory(this.commandsDir, async (changedPath) => {
      const filename = path.basename(changedPath);
      
      if (filename.endsWith('.js') || filename.endsWith('.mjs') || filename.endsWith('.cjs')) {
        console.log(`🔄 Command file changed: ${filename}`);
        
        // Wait a moment to ensure file is fully written
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Find which command this file belongs to
        for (const [cmdName, cmdPath] of this.commandFiles.entries()) {
          if (cmdPath === changedPath) {
            try {
              // Reload the command
              await this.loadCommand(filename);
              console.log(`✅ Reloaded command: ${cmdName}`);
            } catch (error) {
              console.error(`❌ Failed to reload command ${cmdName}:`, error.message);
            }
            break;
          }
        }
        
        // If it's a new file, try to load it
        if (!Array.from(this.commandFiles.values()).includes(changedPath)) {
          console.log(`🆕 New command file detected: ${filename}`);
          await this.loadCommand(filename);
        }
      }
    }, true, 1500); // Use 1.5 second debounce for commands
  }
  
  getCommand(name) {
    return this.commands.get(name);
  }
  
  getAllCommands() {
    return Array.from(this.commands.values());
  }
  
  getCommandCount() {
    return this.commands.size;
  }
}

// Dynamic event handler loader - IMPROVED
export class DynamicEventHandler {
  constructor(handlersDir = path.join(process.cwd(), 'handlers')) {
    this.handlersDir = handlersDir;
    this.handlers = new Map();
    this.watching = false;
  }
  
  async loadAllHandlers() {
    console.log(`📂 Loading event handlers from: ${this.handlersDir}`);
    
    if (!fs.existsSync(this.handlersDir)) {
      console.warn(`Handlers directory not found: ${this.handlersDir}`);
      // Try to create it
      try {
        fs.mkdirSync(this.handlersDir, { recursive: true });
        console.log(`Created handlers directory: ${this.handlersDir}`);
      } catch (error) {
        console.error(`Could not create handlers directory:`, error);
      }
      return this.handlers;
    }
    
    try {
      const files = fs.readdirSync(this.handlersDir)
        .filter(file => file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs'))
        .sort();
      
      console.log(`Found ${files.length} handler files`);
      
      for (const file of files) {
        await this.loadHandler(file);
      }
      
      // Watch for changes
      if (!this.watching) {
        this.watchHandlers();
        this.watching = true;
      }
      
      return this.handlers;
    } catch (error) {
      console.error(`Error loading handlers from ${this.handlersDir}:`, error);
      return this.handlers;
    }
  }
  
  async loadHandler(filename) {
    const filePath = path.join(this.handlersDir, filename);
    
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`Handler file does not exist: ${filename}`);
        return null;
      }
      
      // Clear cache
      clearModuleCache(filePath);
      
      // Import the module with cache buster
      const cacheBuster = `file://${filePath}?t=${Date.now()}`;
      const module = await import(cacheBuster);
      const handler = module.default || module;
      
      if (handler && handler.event && typeof handler.execute === 'function') {
        this.handlers.set(handler.event, handler);
        console.log(`✅ Loaded handler for event: ${handler.event} (${filename})`);
        return handler;
      } else {
        console.warn(`Invalid handler module in ${filename} - missing event or execute function`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Failed to load handler ${filename}:`, error.message);
      return null;
    }
  }
  
  watchHandlers() {
    // Watch the handlers directory for changes
    fileWatcher.watchDirectory(this.handlersDir, async (changedPath) => {
      const filename = path.basename(changedPath);
      
      if (filename.endsWith('.js') || filename.endsWith('.mjs') || filename.endsWith('.cjs')) {
        console.log(`🔄 Handler file changed: ${filename}`);
        
        // Wait a moment to ensure file is fully written
        await new Promise(resolve => setTimeout(resolve, 300));
        
        try {
          await this.loadHandler(filename);
          console.log(`✅ Handler reloaded: ${filename}`);
        } catch (error) {
          console.error(`❌ Failed to reload handler ${filename}:`, error.message);
        }
      }
    }, true, 1500);
  }
  
  getHandler(event) {
    return this.handlers.get(event);
  }
  
  getHandlerCount() {
    return this.handlers.size;
  }
}

// Update progress bar animation
function getProgressBar(percentage) {
  const filled = Math.round((percentage / 100) * 20);
  const empty = 20 - filled;
  return `█`.repeat(filled) + `░`.repeat(empty);
}

// Simple restart function - IMPROVED for panels
async function restartProcess() {
  console.log("🔄 Restarting bot process...");
  
  try {
    // Check if we're in a panel environment (common panel indicators)
    const isPanel = process.env.PANEL_ENV || 
                   process.env.PM2_HOME || 
                   process.env.NODE_APP_INSTANCE !== undefined ||
                   process.argv.join(' ').includes('panel') ||
                   fs.existsSync('/etc/panel') ||
                   fs.existsSync('/usr/local/panel');
    
    // Try different restart methods based on environment
    if (await checkTool('pm2')) {
      console.log("Restarting with PM2...");
      const appName = process.env.PM2_APP_NAME || 'wolf-bot';
      await run(`pm2 restart ${appName}`, 30000);
      return;
    } else if (await checkTool('forever')) {
      console.log("Restarting with Forever...");
      await run("forever restartall", 30000);
      return;
    } else if (await checkTool('systemctl')) {
      console.log("Restarting with systemctl...");
      // Try common service names
      const services = ['wolfbot', 'wolf-bot', 'whatsapp-bot', 'bot'];
      for (const service of services) {
        try {
          await run(`systemctl restart ${service}`, 10000);
          console.log(`Restarted service: ${service}`);
          return;
        } catch {
          continue;
        }
      }
    } else if (isPanel) {
      console.log("Panel environment detected, using graceful exit...");
      // Send restart signal to parent process if possible
      if (process.send) {
        process.send('restart');
      }
      
      // Graceful exit with delay
      setTimeout(() => {
        console.log("Exiting process for restart...");
        process.exit(0);
      }, 2000);
      return;
    }
    
    // Fallback: graceful exit
    console.log("No process manager found, performing graceful exit...");
    
    // Give time for cleanup
    setTimeout(() => {
      console.log("🔄 Exiting for restart...");
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error("Restart failed:", error);
    console.log("⚠️  Forcing exit...");
    
    // Force exit after delay
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }
}

// Main command handler
export default {
  name: "update",
  description: "Update bot from wolf-bot repository (with hot reload)",
  category: "owner",
  ownerOnly: true,

  async execute(sock, m, args) {
    const jid = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    
    // Helper to edit or send messages
    let currentMessageKey = null;
    
    const sendUpdate = async (text, isEdit = false) => {
      try {
        if (isEdit && currentMessageKey) {
          await sock.sendMessage(jid, { 
            text,
            edit: currentMessageKey
          }, { quoted: m });
        } else {
          const newMsg = await sock.sendMessage(jid, { text }, { quoted: m });
          currentMessageKey = newMsg.key;
        }
      } catch (error) {
        console.log("Message error:", error.message);
        // Send new message if edit fails
        const newMsg = await sock.sendMessage(jid, { text }, { quoted: m });
        currentMessageKey = newMsg.key;
      }
    };
    
    // Animate progress
    const animateProgress = async (baseText, progress = 0) => {
      const bar = getProgressBar(progress);
      const emoji = progress < 30 ? "🔍" : 
                   progress < 60 ? "📥" : 
                   progress < 90 ? "🔄" : "✅";
      const progressText = `${emoji} ${baseText}\n${bar} ${progress}%`;
      await sendUpdate(progressText, true);
    };
    
    try {
      // Initial message
      await sendUpdate("🔄 *WolfBot Update System*\n\nChecking for updates...\nInitializing update process...\n\nPlease wait...");
      
      // Load settings
      await animateProgress("Loading bot settings...", 10);
      const settings = await loadSettings();
      
      // Check if owner
      const isOwner = m.key.fromMe || 
        (settings.ownerNumber && sender.includes(settings.ownerNumber)) ||
        (settings.botOwner && sender.includes(settings.botOwner));
      
      if (!isOwner) {
        await sendUpdate("❌ *Permission Denied*\n\nOnly the bot owner can update the bot.", true);
        return;
      }
      
      // Parse arguments
      const forceMethod = args[0]?.toLowerCase();
      const isForceZip = forceMethod === 'zip';
      const isForceGit = forceMethod === 'git';
      const hotReload = args.includes('hot') || args.includes('live');
      const softUpdate = args.includes('soft') || args.includes('no-restart');
      const skipDeps = args.includes('skip-deps') || args.includes('no-npm');
      
      let updateResult;
      
      // Check if we have git repo, initialize if not
      await animateProgress("Checking git repository...", 20);
      const hasGit = await hasGitRepo();
      
      if (!hasGit && !isForceZip) {
        await animateProgress("Initializing git repository...", 30);
        try {
          await initGitRepo();
        } catch (gitError) {
          console.warn("Git init failed:", gitError.message);
          await sendUpdate("⚠️ *Git Initialization Warning*\n\nCould not initialize git repository.\nFalling back to ZIP update...", true);
          // Force ZIP method
          isForceZip = true;
        }
      }
      
      // Determine update method
      if ((hasGit && !isForceZip) || isForceGit) {
        // Git update from wolf-bot
        await animateProgress("Checking wolf-bot repository...", 40);
        
        try {
          updateResult = await updateFromWolfBot(hotReload || softUpdate);
        } catch (gitUpdateError) {
          console.error("Git update failed:", gitUpdateError);
          await sendUpdate("⚠️ *Git Update Failed*\n\nFalling back to ZIP update...\n\nError: " + gitUpdateError.message.substring(0, 200), true);
          // Try ZIP as fallback
          await animateProgress("Trying ZIP update...", 45);
          updateResult = await updateViaZip(hotReload || softUpdate);
        }
        
        if (updateResult.alreadyUpToDate) {
          await sendUpdate(
            "✅ *Already Up to Date!*\n\n" +
            `📁 *Source:* ${updateResult.source}\n` +
            `🔗 *Commit:* ${updateResult.newRev.substring(0, 7)}\n\n` +
            "_No updates available._",
            true
          );
          return;
        } else {
          await animateProgress("Installing updates...", 60);
          
          // Install dependencies if package.json changed and not skipped
          const needsNpmInstall = !skipDeps && updateResult.updatedFiles.some(file => 
            file.includes('package.json') || file.includes('package-lock.json')
          );
          
          if (needsNpmInstall) {
            await animateProgress("Installing dependencies...", 70);
            try {
              await run("npm ci --no-audit --no-fund --silent", 180000);
              await animateProgress("Dependencies installed!", 80);
            } catch (npmError) {
              console.error("npm install failed:", npmError.message);
              await sendUpdate("⚠️ *Dependency Install Warning*\n\nSome dependencies may not have installed correctly.\n\nYou may need to run `npm install` manually.", true);
            }
          }
          
          // Hot reload if requested and possible
          if ((hotReload || softUpdate) && updateResult.updatedFiles.length > 0) {
            await animateProgress("Performing hot reload...", 85);
            
            try {
              const reloadResults = await executeHotReload(updateResult.updatedFiles);
              const successCount = reloadResults.filter(r => r.success).length;
              
              await sendUpdate(
                "✅ *Hot Update Complete!* 🎉\n\n" +
                `📁 *Source:* ${updateResult.source}\n` +
                `🔄 *Updated:* ${updateResult.oldRev?.substring(0, 7) || 'N/A'} → ${updateResult.newRev?.substring(0, 7) || 'N/A'}\n` +
                `📄 *Files Updated:* ${updateResult.updatedFiles.length}\n` +
                `⚡ *Hot Reloaded:* ${successCount}/${reloadResults.length} modules\n` +
                `💾 *Backup:* ${updateResult.backupBranch || 'None'}\n\n` +
                "_Bot continues running without restart!_",
                true
              );
              
              // Cleanup
              if (updateResult.changesDir && fs.existsSync(updateResult.changesDir)) {
                try {
                  fs.rmSync(updateResult.changesDir, { recursive: true });
                } catch (cleanupError) {
                  console.warn("Could not cleanup changes dir:", cleanupError.message);
                }
              }
              
              return;
            } catch (reloadError) {
              console.error("Hot reload failed:", reloadError);
              await sendUpdate(
                "⚠️ *Update Applied but Hot Reload Failed*\n\n" +
                "Some files were updated but couldn't be reloaded.\n" +
                "Restart may be required for full effect.\n\n" +
                `Error: ${reloadError.message.substring(0, 150)}`,
                true
              );
            }
          }
          
          await sendUpdate(
            "✅ *Update Complete!*\n\n" +
            `📁 *Source:* ${updateResult.source}\n` +
            `🔄 *Updated:* ${updateResult.oldRev?.substring(0, 7) || 'N/A'} → ${updateResult.newRev?.substring(0, 7) || 'N/A'}\n` +
            `📄 *Files Updated:* ${updateResult.updatedFiles.length}\n` +
            `💾 *Backup:* ${updateResult.backupBranch || 'None'}\n\n` +
            "_Preparing to restart..._",
            true
          );
        }
      } else {
        // ZIP update from wolf-bot
        await animateProgress("Downloading wolf-bot update...", 40);
        
        try {
          updateResult = await updateViaZip(hotReload || softUpdate);
        } catch (zipError) {
          console.error("ZIP update failed:", zipError);
          throw new Error(`ZIP update failed: ${zipError.message}`);
        }
        
        await animateProgress("Extracting files...", 60);
        await animateProgress("Installing updates...", 80);
        
        await sendUpdate(
          "✅ *ZIP Update Complete!*\n\n" +
          `📁 *Source:* ${updateResult.source}\n` +
          `🔗 *URL:* ${updateResult.url}\n` +
          `📄 *Files Updated:* ${updateResult.updatedFiles?.length || 0}\n\n` +
          "_Preparing to restart..._",
          true
        );
      }
      
      // Install dependencies for ZIP updates
      if (!skipDeps && fs.existsSync(path.join(process.cwd(), 'package.json'))) {
        await animateProgress("Checking dependencies...", 85);
        try {
          await run("npm ci --no-audit --no-fund --silent", 120000);
          await animateProgress("Dependencies installed!", 90);
        } catch (npmError) {
          console.warn("Dependency install warning:", npmError.message);
        }
      }
      
      // Only restart if not doing soft update
      if (!softUpdate && !hotReload) {
        await animateProgress("Restarting WolfBot...", 95);
        
        // Small delay to ensure message is sent
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Send final message
        await sendUpdate(
          "🚀 *Restarting Now!*\n\n" +
          "Bot will be back in a few moments...\n\n" +
          "⏳ *Please wait while WolfBot restarts...*",
          true
        );
        
        // Restart the process with delay
        setTimeout(async () => {
          await restartProcess();
        }, 2000);
      } else {
        await sendUpdate(
          "✅ *Soft Update Complete!*\n\n" +
          "Updates have been applied without restart.\n" +
          "Some changes may require restart to take full effect.\n\n" +
          "⚡ *Bot is still running!*",
          true
        );
      }
      
    } catch (error) {
      console.error("Update error:", error);
      
      let errorMessage = 
        "❌ *Update Failed*\n\n" +
        `💥 *Error:* ${error.message.substring(0, 300)}\n\n`;
      
      // Add helpful suggestions based on error
      if (error.message.includes('git') || error.message.includes('Git')) {
        errorMessage += "*Try these solutions:*\n";
        errorMessage += "• Use ZIP method: `!update zip`\n";
        errorMessage += "• Install git on your server\n";
        errorMessage += "• Check git permissions\n";
      } else if (error.message.includes('ZIP') || error.message.includes('download')) {
        errorMessage += "*Try these solutions:*\n";
        errorMessage += "• Use git method: `!update git`\n";
        errorMessage += "• Check internet connection\n";
        errorMessage += "• Install curl/wget on server\n";
      } else if (error.message.includes('permission') || error.message.includes('Permission')) {
        errorMessage += "*Try these solutions:*\n";
        errorMessage += "• Check file permissions\n";
        errorMessage += "• Run with correct user\n";
        errorMessage += "• Use `chmod` to fix permissions\n";
      } else {
        errorMessage += "*Try these solutions:*\n";
        errorMessage += "• Use hot reload: `!update hot`\n";
        errorMessage += "• Soft update: `!update soft`\n";
        errorMessage += "• Skip dependencies: `!update skip-deps`\n";
      }
      
      errorMessage += "\n⚠️ *Bot is still running with previous version.*";
      
      await sendUpdate(errorMessage, true);
    }
  }
};

// Export utility functions
export { 
  run, 
  checkTool, 
  clearModuleCache, 
  executeHotReload,
  hasGitRepo,
  getCurrentBranch,
  initGitRepo,
  updateFromWolfBot,
  updateViaZip,
  preserveLocalFiles,
  restorePreservedFiles,
  restartProcess
};