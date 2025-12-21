// import { exec } from "child_process";
// import { promisify } from "util";
// import fs from "fs";
// import path from "path";

// const execAsync = promisify(exec);

// async function run(cmd) {
//   const { stdout } = await execAsync(cmd);
//   return stdout.trim();
// }

// async function hasGitRepo() {
//   return fs.existsSync(path.join(process.cwd(), ".git"));
// }

// async function updateViaGit() {
//   const oldRev = await run("git rev-parse HEAD").catch(() => "unknown");
//   await run("git fetch --all --prune");
//   const newRev = await run("git rev-parse origin/main");
//   const alreadyUpToDate = oldRev === newRev;
//   if (!alreadyUpToDate) {
//     await run(`git reset --hard ${newRev}`);
//     await run("git clean -fd");
//   }
//   return { oldRev, newRev, alreadyUpToDate };
// }

// async function updateViaZip(zipUrl) {
//   const tmpDir = path.join(process.cwd(), "tmp");
//   const zipPath = path.join(tmpDir, "update.zip");
//   if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

//   // download + extract
//   await run(`curl -L ${zipUrl} -o ${zipPath}`);
//   await run(`unzip -o ${zipPath} -d ${process.cwd()}`);
//   return true;
// }

// async function restartProcess() {
//   try {
//     await run("pm2 restart all");
//   } catch {
//     process.exit(0);
//   }
// }

// // Load owner.json instead of settings.js
// function loadOwnerConfig() {
//   try {
//     const ownerPath = path.join(process.cwd(), 'owner.json');
//     if (fs.existsSync(ownerPath)) {
//       const data = fs.readFileSync(ownerPath, 'utf8');
//       return JSON.parse(data);
//     }
//   } catch (error) {
//     console.log("Error loading owner.json:", error.message);
//   }
//   return {};
// }

// export default {
//   name: "update",
//   description: "Update the bot via Git or ZIP",
//   category: "owner",
//   ownerOnly: true,

//   async execute(sock, m, args) {
//     const jid = m.key.remoteJid;
//     const sender = m.key.participant || m.key.remoteJid;

//     // Load owner config from owner.json
//     const ownerConfig = loadOwnerConfig();
    
//     // Get owner number from owner.json
//     const ownerNumber = ownerConfig.OWNER_NUMBER || ownerConfig.OWNER_CLEAN_NUMBER;
    
//     const isOwner = m.key.fromMe || (ownerNumber && sender.includes(ownerNumber));

//     if (!isOwner) {
//       await sock.sendMessage(jid, { text: "❌ Only owner can update/restart" }, { quoted: m });
//       return;
//     }

//     try {
//       let result;
//       if (await hasGitRepo()) {
//         result = await updateViaGit();
//         await run("npm install --no-audit --no-fund");
//         await sock.sendMessage(jid, {
//           text: result.alreadyUpToDate
//             ? `✅ Already up to date: ${result.newRev.substring(0, 8)}`
//             : `✅ Updated from ${result.oldRev.substring(0, 8)} to ${result.newRev.substring(0, 8)}`,
//         }, { quoted: m });
//       } else {
//         // Use your wolf-bot repo as default ZIP URL
//         const zipUrl = args[1] || "https://github.com/777Wolf-dot/wolf-bot/archive/refs/heads/main.zip";
//         await updateViaZip(zipUrl);
//         await sock.sendMessage(jid, { text: "✅ ZIP Update complete!" }, { quoted: m });
//       }

//       await sock.sendMessage(jid, { text: "🔄 Restarting..." }, { quoted: m });
//       await restartProcess();
//     } catch (err) {
//       await sock.sendMessage(jid, { text: `❌ Update failed: ${err.message}` }, { quoted: m });
//     }
//   },
// };












import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

async function run(cmd) {
  const { stdout } = await execAsync(cmd);
  return stdout.trim();
}

async function hasGitRepo() {
  return fs.existsSync(path.join(process.cwd(), ".git"));
}

async function updateViaGit() {
  const oldRev = await run("git rev-parse HEAD").catch(() => "unknown");
  await run("git fetch --all --prune");
  const newRev = await run("git rev-parse origin/main");
  const alreadyUpToDate = oldRev === newRev;
  if (!alreadyUpToDate) {
    await run(`git reset --hard ${newRev}`);
    await run("git clean -fd");
  }
  return { oldRev, newRev, alreadyUpToDate };
}

async function updateViaZip(zipUrl) {
  const tmpDir = path.join(process.cwd(), "tmp");
  const zipPath = path.join(tmpDir, "update.zip");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  // download + extract (simplified: assume unzip exists)
  await run(`curl -L ${zipUrl} -o ${zipPath}`);
  await run(`unzip -o ${zipPath} -d ${process.cwd()}`);
  return true;
}

async function restartProcess() {
  try {
    await run("pm2 restart all");
  } catch {
    process.exit(0);
  }
}

export default {
  name: "update",
  description: "Update the bot via Git or ZIP",
  category: "owner",
  ownerOnly: true,

  async execute(sock, m, args) {
    const jid = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;

    // load settings
    let settings = {};
    try {
      settings = (await import("../settings.js")).default;
    } catch {}

    const isOwner =
      m.key.fromMe ||
      (settings.ownerNumber && sender.includes(settings.ownerNumber)) ||
      (settings.botOwner && sender.includes(settings.botOwner));

    if (!isOwner) {
      await sock.sendMessage(jid, { text: "❌ Only owner can update/restart" }, { quoted: m });
      return;
    }

    try {
      let result;
      if (await hasGitRepo()) {
        result = await updateViaGit();
        await run("npm install --no-audit --no-fund");
        await sock.sendMessage(jid, {
          text: result.alreadyUpToDate
            ? `✅ Already up to date: ${result.newRev}`
            : `✅ Updated from ${result.oldRev} to ${result.newRev}`,
        }, { quoted: m });
      } else {
        const zipUrl = args[1] || settings.updateZipUrl || process.env.UPDATE_ZIP_URL;
        if (!zipUrl) throw new Error("No ZIP URL configured");
        await updateViaZip(zipUrl);
        await sock.sendMessage(jid, { text: "✅ ZIP Update complete!" }, { quoted: m });
      }

      await sock.sendMessage(jid, { text: "Restarting..." }, { quoted: m });
      await restartProcess();
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Update failed: ${err.message}` }, { quoted: m });
    }
  },
};