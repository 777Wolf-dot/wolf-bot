
// // import { exec } from "child_process";
// // import { promisify } from "util";
// // import fs from "fs";
// // import path from "path";
// // import { fileURLToPath } from "url";

// // const execAsync = promisify(exec);
// // const __filename = fileURLToPath(import.meta.url);
// // const __dirname = path.dirname(__filename);

// // // Enhanced exec with timeout
// // async function run(cmd, timeout = 30000) {
// //   try {
// //     const { stdout, stderr } = await execAsync(cmd, { timeout });
// //     if (stderr && !stderr.includes('warning')) {
// //       console.warn(`Command stderr: ${stderr}`);
// //     }
// //     return stdout.trim();
// //   } catch (error) {
// //     console.error(`Command failed: ${cmd}`, error.message);
// //     throw error;
// //   }
// // }

// // // Check if git repository exists
// // async function hasGitRepo() {
// //   const gitPath = path.join(process.cwd(), ".git");
// //   return fs.existsSync(gitPath);
// // }

// // // Get current git branch
// // async function getCurrentBranch() {
// //   try {
// //     return await run("git rev-parse --abbrev-ref HEAD");
// //   } catch (error) {
// //     return "main"; // default branch
// //   }
// // }

// // // Initialize git repo if it doesn't exist
// // async function initGitRepo() {
// //   try {
// //     if (!await hasGitRepo()) {
// //       console.log("Initializing git repository...");
// //       await run("git init");
// //       await run("git remote add origin https://github.com/777Wolf-dot/Silent-Wolf--Bot.git");
// //       await run("git fetch origin");
// //       await run("git checkout -b main --track origin/main || git checkout -b main");
// //       console.log("Git repository initialized");
// //       return true;
// //     }
// //     return false;
// //   } catch (error) {
// //     console.error("Failed to initialize git repo:", error);
// //     return false;
// //   }
// // }

// // // Update from wolf-bot repo (your update source)
// // async function updateFromWolfBot() {
// //   try {
// //     // Save current state
// //     const oldRev = await run("git rev-parse HEAD").catch(() => "unknown");
// //     const currentBranch = await getCurrentBranch();
    
// //     console.log(`Current branch: ${currentBranch}, Old revision: ${oldRev.substring(0, 7)}`);
    
// //     // Add wolf-bot as upstream if not already added
// //     try {
// //       await run("git remote get-url wolf-bot-upstream");
// //     } catch {
// //       console.log("Adding wolf-bot as upstream remote...");
// //       await run("git remote add wolf-bot-upstream https://github.com/777Wolf-dot/wolf-bot.git");
// //     }
    
// //     // Fetch from both remotes
// //     console.log("Fetching updates from both remotes...");
// //     await run("git fetch --all --prune");
    
// //     // Check what branch to update from
// //     let sourceBranch = "main";
// //     let sourceRemote = "wolf-bot-upstream";
    
// //     // Try to find matching branch in wolf-bot repo
// //     try {
// //       const wolfBotBranches = await run("git ls-remote --heads wolf-bot-upstream");
// //       const branches = wolfBotBranches.split('\n').map(line => {
// //         const match = line.match(/refs\/heads\/(.+)/);
// //         return match ? match[1] : null;
// //       }).filter(Boolean);
      
// //       if (branches.includes(currentBranch)) {
// //         sourceBranch = currentBranch;
// //         console.log(`Found matching branch in wolf-bot: ${currentBranch}`);
// //       } else {
// //         console.log(`Branch ${currentBranch} not found in wolf-bot, using main branch`);
// //       }
// //     } catch (error) {
// //       console.warn("Could not check wolf-bot branches:", error.message);
// //     }
    
// //     // Get new revision from wolf-bot
// //     const newRev = await run(`git rev-parse wolf-bot-upstream/${sourceBranch}`);
// //     const alreadyUpToDate = oldRev === newRev;
    
// //     if (alreadyUpToDate) {
// //       console.log("Already up to date with wolf-bot repo");
// //       return { 
// //         oldRev, 
// //         newRev, 
// //         alreadyUpToDate, 
// //         source: `wolf-bot/${sourceBranch}`,
// //         type: "git"
// //       };
// //     }
    
// //     console.log(`Updating from wolf-bot/${sourceBranch}: ${oldRev.substring(0, 7)} → ${newRev.substring(0, 7)}`);
    
// //     // Create backup branch just in case
// //     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
// //     const backupBranch = `backup-before-update-${timestamp}`;
// //     await run(`git branch ${backupBranch}`);
// //     console.log(`Created backup branch: ${backupBranch}`);
    
// //     // Reset to wolf-bot's latest
// //     await run(`git reset --hard wolf-bot-upstream/${sourceBranch}`);
    
// //     // Try to preserve important local files
// //     await preserveLocalFiles();
    
// //     // Clean untracked files (be careful)
// //     try {
// //       await run("git clean -fd -e node_modules -e tmp -e logs -e session -e settings.js -e config.json -e .env");
// //     } catch (cleanError) {
// //       console.warn("Git clean failed:", cleanError.message);
// //     }
    
// //     return { 
// //       oldRev, 
// //       newRev, 
// //       alreadyUpToDate, 
// //       source: `wolf-bot/${sourceBranch}`,
// //       backupBranch,
// //       type: "git"
// //     };
    
// //   } catch (error) {
// //     console.error("Update from wolf-bot failed:", error);
    
// //     // Try to restore from backup
// //     try {
// //       const branches = await run("git branch --list backup-before-update-*");
// //       if (branches) {
// //         const latestBackup = branches.split('\n').filter(b => b.trim()).pop().trim();
// //         await run(`git reset --hard ${latestBackup}`);
// //         console.log(`Restored from backup: ${latestBackup}`);
// //       }
// //     } catch (restoreError) {
// //       console.error("Could not restore from backup:", restoreError);
// //     }
    
// //     throw new Error(`Update from wolf-bot failed: ${error.message}`);
// //   }
// // }

// // // Preserve important local files that shouldn't be overwritten
// // async function preserveLocalFiles() {
// //   const filesToPreserve = [
// //     'settings.js',
// //     'config.json',
// //     '.env',
// //     'session',
// //     'data',
// //     'logs'
// //   ];
  
// //   const tmpDir = path.join(process.cwd(), 'tmp_preserve');
// //   if (!fs.existsSync(tmpDir)) {
// //     fs.mkdirSync(tmpDir, { recursive: true });
// //   }
  
// //   for (const file of filesToPreserve) {
// //     const filePath = path.join(process.cwd(), file);
// //     const tmpPath = path.join(tmpDir, file);
    
// //     if (fs.existsSync(filePath)) {
// //       if (fs.statSync(filePath).isDirectory()) {
// //         // Copy directory
// //         await copyDir(filePath, tmpPath);
// //       } else {
// //         // Copy file
// //         fs.copyFileSync(filePath, tmpPath);
// //       }
// //       console.log(`Preserved: ${file}`);
// //     }
// //   }
  
// //   // After update, restore preserved files
// //   if (fs.existsSync(tmpDir)) {
// //     const preservedItems = fs.readdirSync(tmpDir);
// //     for (const item of preservedItems) {
// //       const srcPath = path.join(tmpDir, item);
// //       const destPath = path.join(process.cwd(), item);
      
// //       if (fs.existsSync(destPath)) {
// //         // If it's a directory, merge contents
// //         if (fs.statSync(srcPath).isDirectory() && fs.statSync(destPath).isDirectory()) {
// //           await copyDir(srcPath, destPath);
// //         } else {
// //           // Keep the preserved version
// //           if (fs.statSync(destPath).isDirectory()) {
// //             fs.rmSync(destPath, { recursive: true });
// //           }
// //           if (fs.statSync(srcPath).isDirectory()) {
// //             await copyDir(srcPath, destPath);
// //           } else {
// //             fs.copyFileSync(srcPath, destPath);
// //           }
// //         }
// //       } else {
// //         // Copy if doesn't exist
// //         if (fs.statSync(srcPath).isDirectory()) {
// //           await copyDir(srcPath, destPath);
// //         } else {
// //           fs.copyFileSync(srcPath, destPath);
// //         }
// //       }
// //     }
    
// //     // Cleanup
// //     fs.rmSync(tmpDir, { recursive: true });
// //   }
// // }

// // // Update via ZIP from wolf-bot repo
// // async function updateViaZip() {
// //   const zipUrl = "https://github.com/777Wolf-dot/wolf-bot/archive/refs/heads/main.zip";
// //   const tmpDir = path.join(process.cwd(), "tmp_update");
// //   const zipPath = path.join(tmpDir, "wolf-bot-update.zip");
// //   const extractDir = path.join(tmpDir, "extracted");
  
// //   try {
// //     // Create backup of important files
// //     await preserveLocalFiles();
    
// //     // Clean/create temp directory
// //     if (fs.existsSync(tmpDir)) {
// //       await run(`rm -rf ${tmpDir}`);
// //     }
// //     fs.mkdirSync(tmpDir, { recursive: true });
// //     fs.mkdirSync(extractDir, { recursive: true });
    
// //     console.log(`Downloading ZIP from wolf-bot: ${zipUrl}`);
    
// //     // Download using curl or wget
// //     let downloadCmd;
// //     if (await run("which curl").then(() => true).catch(() => false)) {
// //       downloadCmd = `curl -L "${zipUrl}" -o "${zipPath}" --connect-timeout 30 --max-time 300 --silent --show-error`;
// //     } else if (await run("which wget").then(() => true).catch(() => false)) {
// //       downloadCmd = `wget "${zipUrl}" -O "${zipPath}" --timeout=30 --tries=3 --quiet`;
// //     } else {
// //       throw new Error("Neither curl nor wget is available");
// //     }
    
// //     await run(downloadCmd);
    
// //     if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
// //       throw new Error("Downloaded ZIP file is empty or doesn't exist");
// //     }
    
// //     console.log(`Downloaded ${fs.statSync(zipPath).size} bytes from wolf-bot`);
    
// //     // Extract ZIP
// //     console.log("Extracting ZIP...");
    
// //     if (await run("which unzip").then(() => true).catch(() => false)) {
// //       await run(`unzip -o "${zipPath}" -d "${extractDir}"`);
// //     } else if (await run("which 7z").then(() => true).catch(() => false)) {
// //       await run(`7z x "${zipPath}" -o"${extractDir}" -y`);
// //     } else {
// //       throw new Error("No extraction tool found (install unzip or 7z)");
// //     }
    
// //     // Find the extracted content (GitHub ZIPs have wolf-bot-main folder)
// //     const extractedItems = fs.readdirSync(extractDir);
// //     let sourceDir = extractDir;
    
// //     // Look for wolf-bot-main folder
// //     const wolfBotFolder = extractedItems.find(item => 
// //       item.toLowerCase().includes('wolf-bot')
// //     );
    
// //     if (wolfBotFolder) {
// //       sourceDir = path.join(extractDir, wolfBotFolder);
// //       console.log(`Found source folder: ${wolfBotFolder}`);
// //     }
    
// //     console.log(`Copying files from ${sourceDir} to ${process.cwd()}`);
    
// //     // Files/directories to exclude from update
// //     const excludeItems = [
// //       '.git',
// //       'node_modules',
// //       'tmp',
// //       'logs',
// //       'session',
// //       'data',
// //       'settings.js',
// //       'config.json',
// //       '.env',
// //       'tmp_update',
// //       'tmp_preserve'
// //     ];
    
// //     // Copy files, excluding protected items
// //     await copyDirWithExclude(sourceDir, process.cwd(), excludeItems);
    
// //     // Cleanup
// //     await run(`rm -rf ${tmpDir}`);
    
// //     return { 
// //       success: true, 
// //       source: "wolf-bot ZIP",
// //       url: zipUrl 
// //     };
// //   } catch (error) {
// //     // Cleanup on error
// //     if (fs.existsSync(tmpDir)) {
// //       await run(`rm -rf ${tmpDir}`).catch(() => {});
// //     }
// //     throw new Error(`ZIP update from wolf-bot failed: ${error.message}`);
// //   }
// // }

// // // Helper function to copy directory with exclusions
// // async function copyDirWithExclude(src, dest, exclude = []) {
// //   if (!fs.existsSync(dest)) {
// //     fs.mkdirSync(dest, { recursive: true });
// //   }
  
// //   const entries = fs.readdirSync(src, { withFileTypes: true });
  
// //   for (const entry of entries) {
// //     const srcPath = path.join(src, entry.name);
// //     const destPath = path.join(dest, entry.name);
    
// //     // Check if excluded
// //     if (exclude.some(pattern => {
// //       if (pattern.includes('*')) {
// //         const regex = new RegExp(pattern.replace(/\*/g, '.*'));
// //         return regex.test(entry.name);
// //       }
// //       return entry.name === pattern;
// //     })) {
// //       console.log(`Skipping excluded: ${entry.name}`);
// //       continue;
// //     }
    
// //     if (entry.isDirectory()) {
// //       if (!fs.existsSync(destPath)) {
// //         fs.mkdirSync(destPath, { recursive: true });
// //       }
// //       await copyDirWithExclude(srcPath, destPath, exclude);
// //     } else {
// //       // Skip if destination is a protected file that should be preserved
// //       const isProtected = ['settings.js', 'config.json', '.env'].includes(entry.name.toLowerCase());
// //       if (isProtected && fs.existsSync(destPath)) {
// //         console.log(`Preserving existing: ${entry.name}`);
// //         continue;
// //       }
      
// //       fs.copyFileSync(srcPath, destPath);
// //       console.log(`Copied: ${entry.name}`);
// //     }
// //   }
// // }

// // // Copy directory (simple version)
// // async function copyDir(src, dest) {
// //   if (!fs.existsSync(dest)) {
// //     fs.mkdirSync(dest, { recursive: true });
// //   }
  
// //   const entries = fs.readdirSync(src, { withFileTypes: true });
  
// //   for (const entry of entries) {
// //     const srcPath = path.join(src, entry.name);
// //     const destPath = path.join(dest, entry.name);
    
// //     if (entry.isDirectory()) {
// //       await copyDir(srcPath, destPath);
// //     } else {
// //       fs.copyFileSync(srcPath, destPath);
// //     }
// //   }
// // }

// // // Enhanced settings loader
// // async function loadSettings() {
// //   const possiblePaths = [
// //     path.join(process.cwd(), "settings.js"),
// //     path.join(process.cwd(), "config", "settings.js"),
// //     path.join(__dirname, "..", "settings.js"),
// //     path.join(__dirname, "..", "..", "settings.js"),
// //   ];
  
// //   for (const settingsPath of possiblePaths) {
// //     try {
// //       if (fs.existsSync(settingsPath)) {
// //         console.log(`Loading settings from: ${settingsPath}`);
// //         const module = await import(`file://${settingsPath}`);
// //         return module.default || module;
// //       }
// //     } catch (error) {
// //       console.warn(`Failed to load settings from ${settingsPath}:`, error.message);
// //       continue;
// //     }
// //   }
  
// //   console.warn("No settings file found, using empty settings");
// //   return {};
// // }

// // // Restart process
// // async function restartProcess() {
// //   console.log("Restarting bot...");
  
// //   try {
// //     // Try PM2 first
// //     if (await run("which pm2").then(() => true).catch(() => false)) {
// //       console.log("Restarting with PM2...");
// //       await run("pm2 restart all");
// //       return;
// //     }
    
// //     // Try forever
// //     if (await run("which forever").then(() => true).catch(() => false)) {
// //       console.log("Restarting with Forever...");
// //       await run("forever restartall");
// //       return;
// //     }
    
// //     // If no process manager, just exit
// //     console.log("No process manager found, exiting...");
// //     process.exit(0);
    
// //   } catch (error) {
// //     console.error("Restart failed:", error);
// //     // Force exit
// //     process.exit(0);
// //   }
// // }

// // // Update progress bar animation
// // function getProgressBar(percentage) {
// //   const filled = Math.round((percentage / 100) * 10);
// //   const empty = 10 - filled;
// //   return `█`.repeat(filled) + `▒`.repeat(empty);
// // }

// // // Main command handler
// // export default {
// //   name: "update",
// //   description: "Update bot from wolf-bot repository",
// //   category: "owner",
// //   ownerOnly: true,

// //   async execute(sock, m, args) {
// //     const jid = m.key.remoteJid;
// //     const sender = m.key.participant || m.key.remoteJid;
    
// //     // Send initial message and store its key for editing
// //     const initialMessage = await sock.sendMessage(jid, { 
// //       text: "🔄 WolfBot Update System\nChecking for updates...\nInitializing update process..."
// //     }, { quoted: m });
    
// //     let updateMessageKey = initialMessage.key;
    
// //     // Edit message helper
// //     const editMessage = async (text) => {
// //       try {
// //         await sock.sendMessage(jid, { 
// //           text,
// //           edit: updateMessageKey
// //         }, { quoted: m });
// //       } catch (error) {
// //         console.log("Could not edit message, sending new one:", error.message);
// //         const newMsg = await sock.sendMessage(jid, { text }, { quoted: m });
// //         updateMessageKey = newMsg.key;
// //       }
// //     };
    
// //     // Animate progress
// //     const animateProgress = async (baseText, progress = 0) => {
// //       const bar = getProgressBar(progress);
// //       const progressText = `${baseText}\n${bar} ${progress}%`;
// //       await editMessage(progressText);
// //     };
    
// //     try {
// //       // Load settings
// //       await animateProgress("🔍 Loading bot settings...", 10);
// //       const settings = await loadSettings();
      
// //       // Check if owner
// //       const isOwner = m.key.fromMe || 
// //         (settings.ownerNumber && sender.includes(settings.ownerNumber)) ||
// //         (settings.botOwner && sender.includes(settings.botOwner));
      
// //       if (!isOwner) {
// //         await editMessage("❌ Permission Denied\nOnly the bot owner can update the bot.");
// //         return;
// //       }
      
// //       // Parse arguments
// //       const forceMethod = args[0]?.toLowerCase();
// //       const isForceZip = forceMethod === 'zip';
// //       const isForceGit = forceMethod === 'git';
      
// //       let updateResult;
      
// //       // Check if we have git repo, initialize if not
// //       await animateProgress("📁 Checking git repository...", 20);
// //       const hasGit = await hasGitRepo();
      
// //       if (!hasGit && !isForceZip) {
// //         await animateProgress("📦 Initializing git repository...", 30);
// //         await initGitRepo();
// //       }
      
// //       // Determine update method
// //       if ((hasGit && !isForceZip) || isForceGit) {
// //         // Git update from wolf-bot
// //         await animateProgress("🌐 Checking wolf-bot repository...", 40);
        
// //         updateResult = await updateFromWolfBot();
        
// //         if (updateResult.alreadyUpToDate) {
// //           await editMessage(
// //             "✅ Already Up to Date!\n" +
// //             `Source: ${updateResult.source}\n` +
// //             `Commit: ${updateResult.newRev.substring(0, 7)}\n` +
// //             "No updates available."
// //           );
// //         } else {
// //           await animateProgress("📥 Installing updates...", 60);
          
// //           // Install dependencies if package.json changed
// //           try {
// //             if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
// //               await animateProgress("📦 Installing dependencies...", 70);
// //               await run("npm install --no-audit --no-fund --loglevel=error");
// //               await animateProgress("✅ Dependencies installed!", 80);
// //             }
// //           } catch (npmError) {
// //             console.error("npm install failed:", npmError);
// //           }
          
// //           await editMessage(
// //             "✅ Update Complete!\n" +
// //             `Source: ${updateResult.source}\n` +
// //             `Updated: ${updateResult.oldRev.substring(0, 7)} → ${updateResult.newRev.substring(0, 7)}\n` +
// //             `Backup: ${updateResult.backupBranch || 'None'}\n` +
// //             "Preparing to restart..."
// //           );
// //         }
// //       } else {
// //         // ZIP update from wolf-bot
// //         await animateProgress("📦 Downloading wolf-bot update...", 40);
        
// //         updateResult = await updateViaZip();
        
// //         await animateProgress("📂 Extracting files...", 60);
// //         await animateProgress("📝 Installing updates...", 80);
        
// //         await editMessage(
// //           "✅ ZIP Update Complete!\n" +
// //           `Source: ${updateResult.source}\n` +
// //           `URL: ${updateResult.url}\n` +
// //           "Preparing to restart..."
// //         );
// //       }
      
// //       // Final restart
// //       await animateProgress("🔄 Restarting WolfBot...", 95);
      
// //       // Small delay to ensure message is sent
// //       await new Promise(resolve => setTimeout(resolve, 1000));
      
// //       // Send final message
// //       await editMessage(
// //         "🚀 Restarting Now!\n" +
// //         "Bot will be back in a few moments...\n" +
// //         "WolfBot is updating..."
// //       );
      
// //       await restartProcess();
      
// //     } catch (error) {
// //       console.error("Update error:", error);
      
// //       let errorMessage = 
// //         "❌ Update Failed\n" +
// //         `Error: ${error.message}\n\n`;
      
// //       // Add helpful suggestions
// //       if (error.message.includes('git') || error.message.includes('ZIP')) {
// //         errorMessage += "Try these solutions:\n";
// //         errorMessage += "• Use different method: `!update git` or `!update zip`\n";
// //         errorMessage += "• Check internet connection\n";
// //         errorMessage += "• Ensure required tools are installed: git, curl, unzip\n";
// //         errorMessage += "• Manually update from: https://github.com/777Wolf-dot/wolf-bot";
// //       }
      
// //       await editMessage(errorMessage);
// //     }
// //   }
// // };








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
import { createHash } from "crypto";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple, reliable exec
async function run(cmd, timeout = 60000) {
  console.log(`[CMD] ${cmd.substring(0, 100)}${cmd.length > 100 ? '...' : ''}`);
  
  try {
    const { stdout, stderr } = await execAsync(cmd, { 
      timeout,
      cwd: process.cwd(),
      shell: '/bin/bash'
    });
    
    if (stderr && !stderr.includes('warning') && !stderr.includes('npm')) {
      console.warn(`[STDERR] ${stderr.substring(0, 200)}`);
    }
    
    const result = stdout.trim();
    console.log(`[RESULT] ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`);
    return result;
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    throw error;
  }
}

// Get file hash to verify changes
function getFileHash(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath);
    return createHash('md5').update(content).digest('hex');
  } catch {
    return null;
  }
}

// Get directory hash (for checking if updates happened)
function getDirectoryHash(dirPath, exclude = ['.git', 'node_modules', 'logs', 'session', 'tmp']) {
  const hashes = [];
  
  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      // Skip excluded items
      if (exclude.some(pattern => 
        pattern === item.name || 
        fullPath.includes(pattern)
      )) continue;
      
      if (item.isDirectory()) {
        scan(fullPath);
      } else {
        const hash = getFileHash(fullPath);
        if (hash) {
          hashes.push(`${path.relative(process.cwd(), fullPath)}:${hash}`);
        }
      }
    }
  }
  
  scan(dirPath);
  hashes.sort(); // Sort for consistent hash
  
  if (hashes.length === 0) return null;
  return createHash('md5').update(hashes.join('|')).digest('hex');
}

// REAL GIT CHECK - Actually fetch and compare
async function checkForRealUpdates() {
  try {
    console.log("=== REAL UPDATE CHECK ===");
    
    // Check if git exists
    try {
      await run("git --version");
    } catch {
      console.log("Git not available");
      return { hasUpdates: false, method: 'nogit' };
    }
    
    // Check if we're in a git repo
    const gitDir = path.join(process.cwd(), '.git');
    if (!fs.existsSync(gitDir)) {
      console.log("Not a git repository");
      return { hasUpdates: false, method: 'nogit' };
    }
    
    // Get current state BEFORE any operations
    const beforeState = getDirectoryHash(process.cwd());
    console.log(`Before state hash: ${beforeState}`);
    
    // Get current commit
    let currentCommit;
    try {
      currentCommit = await run("git rev-parse HEAD");
      console.log(`Current commit: ${currentCommit.substring(0, 8)}`);
    } catch {
      console.log("No commits yet");
      currentCommit = 'none';
    }
    
    // Add upstream if not exists
    try {
      await run("git remote get-url wolf-bot-upstream");
      console.log("Upstream remote exists");
    } catch {
      console.log("Adding upstream remote...");
      await run("git remote add wolf-bot-upstream https://github.com/777Wolf-dot/wolf-bot.git");
    }
    
    // FETCH NEW CHANGES (this is what was missing!)
    console.log("Fetching from upstream...");
    const fetchOutput = await run("git fetch wolf-bot-upstream --verbose");
    console.log(`Fetch output: ${fetchOutput}`);
    
    // Check what changed
    let newCommits = [];
    try {
      if (currentCommit !== 'none') {
        const diff = await run(`git log --oneline ${currentCommit}..wolf-bot-upstream/main`);
        newCommits = diff.split('\n').filter(line => line.trim());
        console.log(`New commits: ${newCommits.length}`);
      } else {
        console.log("No local commits to compare against");
      }
    } catch (error) {
      console.log("Could not compare commits:", error.message);
    }
    
    // Get latest commit from upstream
    let upstreamCommit;
    try {
      upstreamCommit = await run("git rev-parse wolf-bot-upstream/main");
      console.log(`Upstream commit: ${upstreamCommit.substring(0, 8)}`);
    } catch (error) {
      console.log("Could not get upstream commit:", error.message);
      return { hasUpdates: false, method: 'git', error: 'no_upstream' };
    }
    
    const hasUpdates = currentCommit !== upstreamCommit && currentCommit !== 'none';
    
    return {
      hasUpdates,
      method: 'git',
      currentCommit: currentCommit.substring(0, 8),
      upstreamCommit: upstreamCommit.substring(0, 8),
      newCommits: newCommits.length,
      beforeState,
      commitDiff: newCommits
    };
  } catch (error) {
    console.error("Real update check failed:", error);
    return { hasUpdates: false, method: 'git', error: error.message };
  }
}

// ACTUAL GIT UPDATE - Force reset to upstream
async function performGitUpdate() {
  console.log("=== PERFORMING GIT UPDATE ===");
  
  try {
    // Get state before update
    const beforeState = getDirectoryHash(process.cwd());
    
    // Backup important files
    await backupImportantFiles();
    
    // Force reset to upstream
    console.log("Resetting to wolf-bot-upstream/main...");
    const resetOutput = await run("git reset --hard wolf-bot-upstream/main");
    console.log(`Reset output: ${resetOutput}`);
    
    // Clean untracked files (optional)
    try {
      await run("git clean -fd -e node_modules -e logs -e session -e settings.js -e config.json -e .env");
    } catch (cleanError) {
      console.log("Clean failed (non-critical):", cleanError.message);
    }
    
    // Restore backups
    await restoreBackup();
    
    // Get state after update
    const afterState = getDirectoryHash(process.cwd());
    
    // Get new commit
    const newCommit = await run("git rev-parse HEAD");
    
    return {
      success: true,
      method: 'git',
      newCommit: newCommit.substring(0, 8),
      beforeState,
      afterState,
      changed: beforeState !== afterState,
      message: `Reset to upstream: ${newCommit.substring(0, 8)}`
    };
  } catch (error) {
    console.error("Git update failed:", error);
    // Restore on failure
    await restoreBackup();
    throw error;
  }
}

// Backup important files
async function backupImportantFiles() {
  const backupDir = path.join(process.cwd(), '.update_backup');
  
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true });
  }
  
  fs.mkdirSync(backupDir, { recursive: true });
  
  const filesToBackup = [
    'settings.js',
    'config.json',
    '.env',
    'session',
    'data',
    'logs',
    'database.json',
    'storage.json'
  ];
  
  console.log("Backing up important files...");
  
  for (const file of filesToBackup) {
    const src = path.join(process.cwd(), file);
    if (fs.existsSync(src)) {
      const dest = path.join(backupDir, file);
      
      try {
        if (fs.statSync(src).isDirectory()) {
          copyDirSync(src, dest);
        } else {
          fs.copyFileSync(src, dest);
        }
        console.log(`✓ Backed up: ${file}`);
      } catch (error) {
        console.warn(`✗ Failed to backup ${file}:`, error.message);
      }
    }
  }
  
  return backupDir;
}

// Restore backup
async function restoreBackup() {
  const backupDir = path.join(process.cwd(), '.update_backup');
  
  if (!fs.existsSync(backupDir)) {
    console.log("No backup to restore");
    return;
  }
  
  console.log("Restoring backups...");
  
  const items = fs.readdirSync(backupDir);
  
  for (const item of items) {
    const src = path.join(backupDir, item);
    const dest = path.join(process.cwd(), item);
    
    try {
      if (fs.statSync(src).isDirectory()) {
        if (fs.existsSync(dest)) {
          fs.rmSync(dest, { recursive: true });
        }
        copyDirSync(src, dest);
      } else {
        fs.copyFileSync(src, dest);
      }
      console.log(`✓ Restored: ${item}`);
    } catch (error) {
      console.warn(`✗ Failed to restore ${item}:`, error.message);
    }
  }
  
  // Cleanup
  try {
    fs.rmSync(backupDir, { recursive: true });
    console.log("Cleaned up backup directory");
  } catch (error) {
    console.warn("Failed to cleanup backup:", error.message);
  }
}

// Simple directory copy
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src, { withFileTypes: true });
  
  for (const item of items) {
    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);
    
    if (item.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// DIRECT DOWNLOAD UPDATE - Bypass git completely
async function performDirectUpdate() {
  console.log("=== PERFORMING DIRECT UPDATE ===");
  
  const beforeState = getDirectoryHash(process.cwd());
  const backupDir = await backupImportantFiles();
  const tempDir = path.join(process.cwd(), '.direct_update_temp');
  
  try {
    // Clean temp dir
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Download using wget or curl
    console.log("Downloading latest version...");
    const zipPath = path.join(tempDir, 'latest.zip');
    
    let downloadCmd;
    try {
      await run("which wget");
      downloadCmd = `wget https://github.com/777Wolf-dot/wolf-bot/archive/refs/heads/main.zip -O "${zipPath}" --timeout=30 --tries=3`;
    } catch {
      downloadCmd = `curl -L https://github.com/777Wolf-dot/wolf-bot/archive/refs/heads/main.zip -o "${zipPath}" --connect-timeout 30 --max-time 300`;
    }
    
    await run(downloadCmd);
    
    // Check if download succeeded
    if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
      throw new Error("Download failed or empty");
    }
    
    console.log(`Downloaded: ${fs.statSync(zipPath).size} bytes`);
    
    // Extract
    console.log("Extracting...");
    await run(`unzip -o "${zipPath}" -d "${tempDir}"`);
    
    // Find extracted folder
    const items = fs.readdirSync(tempDir);
    let sourceDir = tempDir;
    
    for (const item of items) {
      if (fs.statSync(path.join(tempDir, item)).isDirectory() && item.includes('wolf-bot')) {
        sourceDir = path.join(tempDir, item);
        break;
      }
    }
    
    console.log(`Source directory: ${sourceDir}`);
    
    // Copy files (excluding protected ones)
    console.log("Copying files...");
    const exclude = [
      '.git',
      'node_modules',
      'logs',
      'session',
      'data',
      'settings.js',
      'config.json',
      '.env',
      '.update_backup',
      '.direct_update_temp'
    ];
    
    copyDirWithExclusions(sourceDir, process.cwd(), exclude);
    
    // Restore backups
    await restoreBackup();
    
    // Get after state
    const afterState = getDirectoryHash(process.cwd());
    
    // Get version info if available
    let version = "unknown";
    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        version = packageJson.version || "unknown";
      } catch { /* ignore */ }
    }
    
    // Cleanup
    fs.rmSync(tempDir, { recursive: true });
    
    return {
      success: true,
      method: 'direct',
      version,
      beforeState,
      afterState,
      changed: beforeState !== afterState,
      message: `Direct update to version ${version}`
    };
  } catch (error) {
    console.error("Direct update failed:", error);
    
    // Restore backup on error
    await restoreBackup();
    
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    
    throw error;
  }
}

function copyDirWithExclusions(src, dest, exclude) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src, { withFileTypes: true });
  
  for (const item of items) {
    if (exclude.includes(item.name)) {
      console.log(`Skipping: ${item.name}`);
      continue;
    }
    
    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);
    
    if (item.isDirectory()) {
      copyDirWithExclusions(srcPath, destPath, exclude);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${item.name}`);
      } catch (error) {
        console.warn(`Failed to copy ${item.name}:`, error.message);
      }
    }
  }
}

// Install dependencies with verification
async function installDependenciesWithCheck() {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    return { installed: false, reason: 'no_package_json' };
  }
  
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  const beforeExists = fs.existsSync(nodeModulesPath);
  
  try {
    console.log("Installing dependencies...");
    
    // Check package.json modification time
    const packageStat = fs.statSync(packagePath);
    const now = new Date();
    const packageAge = now - packageStat.mtime;
    
    // Only install if package.json is new or node_modules doesn't exist
    if (!beforeExists || packageAge < 3600000) { // 1 hour
      await run("npm install --no-audit --no-fund --loglevel=error", 300000);
      
      const afterExists = fs.existsSync(nodeModulesPath);
      return { 
        installed: true, 
        wasInstalled: !beforeExists && afterExists,
        message: afterExists ? "Dependencies installed" : "Installation may have failed"
      };
    } else {
      return { 
        installed: true, 
        wasInstalled: false,
        message: "node_modules already exists and package.json is old"
      };
    }
  } catch (error) {
    console.error("Dependency installation failed:", error.message);
    return { installed: false, error: error.message };
  }
}

// Verify update actually happened
function verifyUpdate(beforeState, afterState, updateResult) {
  const changed = beforeState !== afterState;
  
  if (!changed) {
    console.warn("⚠️ WARNING: No changes detected after update!");
    console.log(`Before hash: ${beforeState}`);
    console.log(`After hash:  ${afterState}`);
    
    // Check if we're already up to date
    if (updateResult?.method === 'git' && updateResult.currentCommit === updateResult.upstreamCommit) {
      return { verified: true, status: 'already_updated', message: 'Already up to date' };
    }
    
    return { verified: false, status: 'no_changes', message: 'Update did not change any files' };
  }
  
  console.log("✅ Changes detected - update verified!");
  console.log(`Before hash: ${beforeState}`);
  console.log(`After hash:  ${afterState}`);
  
  return { verified: true, status: 'updated', message: 'Files were changed' };
}

// Main update command with VERIFICATION
export default {
  name: 'update',
  description: 'Update bot with verification',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, m, args) {
    const jid = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    
    // Simple message sending
    const sendMessage = async (text) => {
      try {
        return await sock.sendMessage(jid, { text }, { quoted: m });
      } catch (error) {
        console.error("Failed to send message:", error.message);
        return null;
      }
    };
    
    let statusMsg = await sendMessage("🔄 *WolfBot Update*\nChecking for updates...\n\n⏳ Initializing...");
    
    try {
      // Quick permission check
      let settings = {};
      try {
        const settingsPath = path.join(process.cwd(), 'settings.js');
        if (fs.existsSync(settingsPath)) {
          const module = await import(`file://${settingsPath}`);
          settings = module.default || module;
        }
      } catch { /* ignore */ }
      
      const isOwner = m.key.fromMe || 
        (settings.ownerNumber && sender.includes(settings.ownerNumber)) ||
        (settings.botOwner && sender.includes(settings.botOwner));
      
      if (!isOwner) {
        await sock.sendMessage(jid, { 
          text: "❌ *Permission Denied*\nOnly the bot owner can update.",
          edit: statusMsg.key 
        });
        return;
      }
      
      // Parse method
      const method = args[0]?.toLowerCase();
      const useMethod = method === 'git' ? 'git' : method === 'direct' ? 'direct' : 'auto';
      
      // Step 1: Check current state
      await sock.sendMessage(jid, { 
        text: "🔍 *Checking current state...*\nGetting file hash...",
        edit: statusMsg.key 
      });
      
      const beforeState = getDirectoryHash(process.cwd());
      console.log(`Initial state hash: ${beforeState}`);
      
      // Step 2: Check for updates
      await sock.sendMessage(jid, { 
        text: "🌐 *Checking for updates...*\nContacting GitHub...",
        edit: statusMsg.key 
      });
      
      const updateCheck = await checkForRealUpdates();
      console.log("Update check result:", updateCheck);
      
      // Step 3: Perform update
      let updateResult;
      
      if (useMethod === 'git' || (useMethod === 'auto' && updateCheck.method === 'git' && !updateCheck.error)) {
        if (!updateCheck.hasUpdates && updateCheck.currentCommit && updateCheck.upstreamCommit) {
          await sock.sendMessage(jid, { 
            text: `✅ *Already Up to Date!*\n\nCurrent: ${updateCheck.currentCommit}\nUpstream: ${updateCheck.upstreamCommit}\n\nNo updates available.`,
            edit: statusMsg.key 
          });
          return;
        }
        
        await sock.sendMessage(jid, { 
          text: `🔄 *Updating via Git...*\n\nFrom: ${updateCheck.currentCommit || 'none'}\nTo: ${updateCheck.upstreamCommit || 'fetching...'}`,
          edit: statusMsg.key 
        });
        
        updateResult = await performGitUpdate();
      } else {
        await sock.sendMessage(jid, { 
          text: "📦 *Updating via Direct Download...*\n\nBypassing git, downloading directly from GitHub...",
          edit: statusMsg.key 
        });
        
        updateResult = await performDirectUpdate();
      }
      
      // Step 4: Verify update
      await sock.sendMessage(jid, { 
        text: "🔍 *Verifying update...*\nChecking if files were changed...",
        edit: statusMsg.key 
      });
      
      const afterState = getDirectoryHash(process.cwd());
      const verification = verifyUpdate(beforeState, afterState, updateResult);
      
      // Step 5: Install dependencies
      await sock.sendMessage(jid, { 
        text: "📦 *Installing dependencies...*\nThis may take a moment...",
        edit: statusMsg.key 
      });
      
      const depsResult = await installDependenciesWithCheck();
      
      // Step 6: Show results
      let resultMessage = `🔄 *Update Results*\n\n`;
      
      if (updateResult.method === 'git') {
        resultMessage += `*Method:* Git\n`;
        resultMessage += `*Commit:* ${updateResult.newCommit}\n`;
      } else {
        resultMessage += `*Method:* Direct Download\n`;
        resultMessage += `*Version:* ${updateResult.version}\n`;
      }
      
      resultMessage += `\n*Verification:* ${verification.verified ? '✅ PASS' : '⚠️ FAIL'}\n`;
      resultMessage += `*Status:* ${verification.message}\n`;
      
      if (updateCheck.newCommits > 0) {
        resultMessage += `*New Commits:* ${updateCheck.newCommits}\n`;
      }
      
      resultMessage += `\n*Dependencies:* ${depsResult.installed ? '✅ Installed' : '❌ Failed'}\n`;
      if (depsResult.message) {
        resultMessage += `*Note:* ${depsResult.message}\n`;
      }
      
      if (!verification.verified && verification.status !== 'already_updated') {
        resultMessage += `\n⚠️ *WARNING:* No changes detected!\n`;
        resultMessage += `The update may not have worked.\n`;
        resultMessage += `Try: \`!update direct\` for direct download method.`;
      } else {
        resultMessage += `\n✅ *Update successful!*`;
        
        // Only restart if actually updated
        if (verification.status === 'updated') {
          resultMessage += `\n\n🔄 *Restarting bot in 3 seconds...*`;
          
          await sock.sendMessage(jid, { 
            text: resultMessage,
            edit: statusMsg.key 
          });
          
          // Wait and restart
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          try {
            await run("pm2 restart all");
          } catch {
            await run("npm restart");
          }
          return;
        }
      }
      
      await sock.sendMessage(jid, { 
        text: resultMessage,
        edit: statusMsg.key 
      });
      
    } catch (error) {
      console.error("Update failed:", error);
      
      await sock.sendMessage(jid, { 
        text: `❌ *Update Failed*\n\n*Error:* ${error.message}\n\n*Debug Info:*\n- Check panel logs\n- Try: \`!update direct\`\n- SSH and run manually`,
        edit: statusMsg.key 
      });
    }
  }
};