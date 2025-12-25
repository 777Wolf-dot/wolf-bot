// import axios from 'axios';
// import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'fs';
// import { promisify } from 'util';
// import { exec } from 'child_process';
// import fs from 'fs';

// const execAsync = promisify(exec);

// let getUserCaption;

// async function initializeCaptionSystem() {
//   try {
//     const tiktokModule = await import('./tiktok.js');
//     getUserCaption = tiktokModule.getUserCaption || ((userId) => "WolfBot is the Alpha");
//   } catch (error) {
//     getUserCaption = (userId) => "WolfBot is the Alpha";
//   }
// }

// initializeCaptionSystem();

// function getCaption(userId) {
//   if (typeof getUserCaption === 'function') {
//     return getUserCaption(userId);
//   }
//   return "WolfBot is the Alpha";
// }

// export default {
//   name: "video",
//   description: "Search and download videos from YouTube",
//   async execute(sock, m, args) {
//     const jid = m.key.remoteJid;
//     const userId = m.key.participant || m.key.remoteJid;

//     try {
//       if (!args[0]) {
//         await sock.sendMessage(jid, { 
//           text: `🎬 *Video Downloader*\n\nUsage: video <search query>\nExample: video NF Home\nExample: video Ethical Hacking tutorial` 
//         }, { quoted: m });
//         return;
//       }

//       const searchQuery = args.join(' ');
//       await sock.sendMessage(jid, { text: `🔍 Searching for "${searchQuery}"...` }, { quoted: m });

//       // Search for videos
//       const searchResult = await searchYouTube(searchQuery);
      
//       if (!searchResult || !searchResult.url) {
//         await sock.sendMessage(jid, { text: '❌ No videos found' }, { quoted: m });
//         return;
//       }

//       await sock.sendMessage(jid, { text: `⏳ Downloading: ${searchResult.title}` }, { quoted: m });

//       // Download the video
//       const result = await downloadYouTubeVideo(searchResult.url);
      
//       if (!result.success) {
//         await sock.sendMessage(jid, { text: `❌ Download failed: ${result.error}` }, { quoted: m });
//         return;
//       }

//       const { filePath, fileSize } = result;
//       const userCaption = getCaption(userId);
//       const maxSize = 16 * 1024 * 1024;

//       if (fileSize > maxSize) {
//         await sock.sendMessage(jid, {
//           document: readFileSync(filePath),
//           fileName: `${sanitizeFileName(searchResult.title)}.mp4`,
//           mimetype: 'video/mp4',
//           caption: `📁 *${searchResult.title}*\n\n👤 ${searchResult.channel}\n⏱ ${searchResult.duration}\n📊 ${formatFileSize(fileSize)}\n\n${userCaption}`
//         }, { quoted: m });
//       } else {
//         await sock.sendMessage(jid, {
//           video: readFileSync(filePath),
//           caption: `🎬 *${searchResult.title}*\n\n👤 ${searchResult.channel}\n⏱ ${searchResult.duration}\n\n${userCaption}`
//         }, { quoted: m });
//       }

//       // Cleanup
//       setTimeout(() => {
//         try {
//           if (existsSync(filePath)) {
//             fs.unlinkSync(filePath);
//           }
//         } catch (e) {}
//       }, 30000);

//     } catch (error) {
//       console.error('Video command error:', error);
//       await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: m });
//     }
//   },
// };

// // Search YouTube videos
// async function searchYouTube(query) {
//   try {
//     // Method 1: Use yt-dlp for search
//     try {
//       await execAsync('yt-dlp --version');
      
//       const searchCmd = `yt-dlp "ytsearch:${query}" --dump-json --no-download`;
//       const { stdout } = await execAsync(searchCmd, { timeout: 30000 });
//       const results = JSON.parse(stdout);
      
//       if (results && results.title) {
//         return {
//           title: results.title,
//           url: results.webpage_url,
//           channel: results.uploader || 'Unknown',
//           duration: results.duration_string || 'N/A',
//           views: results.view_count || 0
//         };
//       }
//     } catch (ytdlpError) {
//       console.log('yt-dlp search failed:', ytdlpError.message);
//     }

//     // Method 2: Use YouTube search API
//     const encodedQuery = encodeURIComponent(query);
//     const searchUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;
    
//     const response = await axios.get(searchUrl, {
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//       },
//       timeout: 10000
//     });

//     // Extract video ID from search results
//     const html = response.data;
//     const videoIdMatch = html.match(/"videoId":"([^"]{11})"/);
    
//     if (videoIdMatch && videoIdMatch[1]) {
//       const videoId = videoIdMatch[1];
//       const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
//       // Get video details
//       try {
//         const detailsCmd = `yt-dlp --dump-json "${videoUrl}" --no-download`;
//         const { stdout: detailsJson } = await execAsync(detailsCmd, { timeout: 30000 });
//         const details = JSON.parse(detailsJson);
        
//         return {
//           title: details.title || query,
//           url: videoUrl,
//           channel: details.uploader || 'Unknown',
//           duration: details.duration_string || 'N/A'
//         };
//       } catch (e) {
//         // Return basic info if details fail
//         return {
//           title: query,
//           url: videoUrl,
//           channel: 'YouTube',
//           duration: 'N/A'
//         };
//       }
//     }

//     // Method 3: Fallback to first result from search API
//     const apiUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&q=${encodedQuery}&maxResults=1&key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`;
    
//     try {
//       const apiResponse = await axios.get(apiUrl, { timeout: 10000 });
//       if (apiResponse.data.items && apiResponse.data.items.length > 0) {
//         const item = apiResponse.data.items[0];
//         const videoUrl = `https://www.youtube.com/watch?v=${item.id.videoId}`;
        
//         return {
//           title: item.snippet.title,
//           url: videoUrl,
//           channel: item.snippet.channelTitle,
//           duration: 'N/A'
//         };
//       }
//     } catch (apiError) {
//       console.log('YouTube API search failed:', apiError.message);
//     }

//     return null;

//   } catch (error) {
//     console.error('YouTube search error:', error);
//     return null;
//   }
// }

// // Download YouTube video
// async function downloadYouTubeVideo(url) {
//   const tempDir = './temp/video';
//   if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

//   const timestamp = Date.now();
//   const filePath = `${tempDir}/video_${timestamp}.mp4`;

//   try {
//     await execAsync('yt-dlp --version');
    
//     // Download with WhatsApp-compatible format
//     const downloadCmd = `yt-dlp -f "best[ext=mp4][height<=720]/best[ext=mp4]/best" --no-check-certificate -o "${filePath}" "${url}"`;
//     await execAsync(downloadCmd, { timeout: 120000 });

//     const stats = fs.statSync(filePath);
    
//     if (stats.size === 0) {
//       throw new Error('Empty file downloaded');
//     }

//     return {
//       success: true,
//       filePath,
//       fileSize: stats.size
//     };

//   } catch (error) {
//     console.error('Video download error:', error);
//     if (existsSync(filePath)) fs.unlinkSync(filePath);
//     return { success: false, error: error.message };
//   }
// }

// // Utility functions
// function formatFileSize(bytes) {
//   if (!bytes) return 'Unknown';
//   const k = 1024;
//   const sizes = ['B', 'KB', 'MB', 'GB'];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
// }

// function sanitizeFileName(name) {
//   return name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
// }


























// import axios from 'axios';
// import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'fs';
// import { promisify } from 'util';
// import { exec } from 'child_process';
// import fs from 'fs';

// const execAsync = promisify(exec);

// let getUserCaption;

// async function initializeCaptionSystem() {
//   try {
//     const tiktokModule = await import('./tiktok.js');
//     getUserCaption = tiktokModule.getUserCaption || ((userId) => "WolfBot is the Alpha");
//   } catch (error) {
//     getUserCaption = (userId) => "WolfBot is the Alpha";
//   }
// }

// initializeCaptionSystem();

// function getCaption(userId) {
//   if (typeof getUserCaption === 'function') {
//     return getUserCaption(userId);
//   }
//   return "WolfBot is the Alpha";
// }

// export default {
//   name: "video",
//   description: "Search and download videos from YouTube",
//   async execute(sock, m, args) {
//     const jid = m.key.remoteJid;
//     const userId = m.key.participant || m.key.remoteJid;
//     let statusMsg = null;

//     try {
//       if (!args[0]) {
//         await sock.sendMessage(jid, { 
//           text: `🎬 *Video Downloader*\n\nUsage: video <search query>\nExample: video NF Home\nExample: video Ethical Hacking tutorial` 
//         }, { quoted: m });
//         return;
//       }

//       const searchQuery = args.join(' ');
      
//       // Send initial status message
//       statusMsg = await sock.sendMessage(jid, { 
//         text: `🔍 *Searching for*: "${searchQuery}"...` 
//       }, { quoted: m });

//       // Search for videos
//       const searchResult = await searchYouTube(searchQuery);
      
//       if (!searchResult || !searchResult.url) {
//         // Edit the status message to show error
//         await sock.sendMessage(jid, { 
//           text: `🔍 *Searching for*: "${searchQuery}"... ❌\n\n❌ No videos found`,
//           edit: statusMsg.key 
//         });
//         return;
//       }

//       // Update status message to show found video
//       await sock.sendMessage(jid, { 
//         text: `🔍 *Searching for*: "${searchQuery}"... ✅\n⏳ *Downloading*: ${searchResult.title}`,
//         edit: statusMsg.key 
//       });

//       // Download the video
//       const result = await downloadYouTubeVideo(searchResult.url);
      
//       if (!result.success) {
//         // Update status message with download failure
//         await sock.sendMessage(jid, { 
//           text: `🔍 *Searching for*: "${searchQuery}"... ✅\n⏳ *Downloading*: ${searchResult.title} ❌\n\n❌ Download failed: ${result.error}`,
//           edit: statusMsg.key 
//         });
//         return;
//       }

//       const { filePath, fileSize } = result;
//       const userCaption = getCaption(userId);
//       const maxSize = 16 * 1024 * 1024; // 16MB limit for videos

//       // Update status message to show downloading progress
//       await sock.sendMessage(jid, { 
//         text: `🔍 *Searching for*: "${searchQuery}"... ✅\n⏳ *Downloading*: ${searchResult.title} ✅\n📤 *Uploading video...*`,
//         edit: statusMsg.key 
//       });

//       if (fileSize > maxSize) {
//         // Send as document if too large
//         await sock.sendMessage(jid, {
//           document: readFileSync(filePath),
//           fileName: `${sanitizeFileName(searchResult.title)}.mp4`,
//           mimetype: 'video/mp4',
//           caption: `📁 *${searchResult.title}*\n\n👤 ${searchResult.channel}\n⏱ ${searchResult.duration}\n📊 ${formatFileSize(fileSize)}\n\n${userCaption}`
//         });
//       } else {
//         // Send as video
//         await sock.sendMessage(jid, {
//           video: readFileSync(filePath),
//           caption: `🎬 *${searchResult.title}*\n\n👤 ${searchResult.channel}\n⏱ ${searchResult.duration}\n\n${userCaption}`
//         });
//       }

//       // Update status message to show completion
//       await sock.sendMessage(jid, { 
//         text: `🔍 *Searching for*: "${searchQuery}"... ✅\n⏳ *Downloading*: ${searchResult.title} ✅\n📤 *Uploading video...* ✅\n\n✅ *Video sent successfully!*`,
//         edit: statusMsg.key 
//       });

//       // Cleanup
//       setTimeout(() => {
//         try {
//           if (existsSync(filePath)) {
//             fs.unlinkSync(filePath);
//             console.log(`🧹 Cleaned up video file: ${filePath}`);
//           }
//         } catch (e) {
//           console.log('Cleanup error:', e.message);
//         }
//       }, 30000);

//     } catch (error) {
//       console.error('Video command error:', error);
      
//       // Update status message with error if it exists
//       if (statusMsg) {
//         await sock.sendMessage(jid, { 
//           text: `🔍 *Searching for*: "${args.join(' ')}"... ❌\n\n❌ Error: ${error.message}`,
//           edit: statusMsg.key 
//         });
//       } else {
//         await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: m });
//       }
//     }
//   },
// };

// // Search YouTube videos
// async function searchYouTube(query) {
//   try {
//     // Method 1: Use yt-dlp for search
//     try {
//       await execAsync('yt-dlp --version');
      
//       const searchCmd = `yt-dlp "ytsearch:${query}" --dump-json --no-download`;
//       const { stdout } = await execAsync(searchCmd, { timeout: 30000 });
//       const results = JSON.parse(stdout);
      
//       if (results && results.title) {
//         return {
//           title: results.title,
//           url: results.webpage_url,
//           channel: results.uploader || 'Unknown',
//           duration: results.duration_string || 'N/A',
//           views: results.view_count || 0
//         };
//       }
//     } catch (ytdlpError) {
//       console.log('yt-dlp search failed:', ytdlpError.message);
//     }

//     // Method 2: Use YouTube search API
//     const encodedQuery = encodeURIComponent(query);
//     const searchUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;
    
//     const response = await axios.get(searchUrl, {
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//       },
//       timeout: 10000
//     });

//     // Extract video ID from search results
//     const html = response.data;
//     const videoIdMatch = html.match(/"videoId":"([^"]{11})"/);
    
//     if (videoIdMatch && videoIdMatch[1]) {
//       const videoId = videoIdMatch[1];
//       const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
//       // Get video details
//       try {
//         const detailsCmd = `yt-dlp --dump-json "${videoUrl}" --no-download`;
//         const { stdout: detailsJson } = await execAsync(detailsCmd, { timeout: 30000 });
//         const details = JSON.parse(detailsJson);
        
//         return {
//           title: details.title || query,
//           url: videoUrl,
//           channel: details.uploader || 'Unknown',
//           duration: details.duration_string || 'N/A'
//         };
//       } catch (e) {
//         // Return basic info if details fail
//         return {
//           title: query,
//           url: videoUrl,
//           channel: 'YouTube',
//           duration: 'N/A'
//         };
//       }
//     }

//     // Method 3: Fallback to first result from search API
//     const apiUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&q=${encodedQuery}&maxResults=1&key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`;
    
//     try {
//       const apiResponse = await axios.get(apiUrl, { timeout: 10000 });
//       if (apiResponse.data.items && apiResponse.data.items.length > 0) {
//         const item = apiResponse.data.items[0];
//         const videoUrl = `https://www.youtube.com/watch?v=${item.id.videoId}`;
        
//         return {
//           title: item.snippet.title,
//           url: videoUrl,
//           channel: item.snippet.channelTitle,
//           duration: 'N/A'
//         };
//       }
//     } catch (apiError) {
//       console.log('YouTube API search failed:', apiError.message);
//     }

//     return null;

//   } catch (error) {
//     console.error('YouTube search error:', error);
//     return null;
//   }
// }

// // Download YouTube video
// async function downloadYouTubeVideo(url) {
//   const tempDir = './temp/video';
//   if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

//   const timestamp = Date.now();
//   const filePath = `${tempDir}/video_${timestamp}.mp4`;

//   try {
//     await execAsync('yt-dlp --version');
    
//     // Download with WhatsApp-compatible format
//     const downloadCmd = `yt-dlp -f "best[ext=mp4][height<=720]/best[ext=mp4]/best" --no-check-certificate -o "${filePath}" "${url}"`;
//     await execAsync(downloadCmd, { timeout: 120000 });

//     const stats = fs.statSync(filePath);
    
//     if (stats.size === 0) {
//       throw new Error('Empty file downloaded');
//     }

//     return {
//       success: true,
//       filePath,
//       fileSize: stats.size
//     };

//   } catch (error) {
//     console.error('Video download error:', error);
//     if (existsSync(filePath)) fs.unlinkSync(filePath);
//     return { success: false, error: error.message };
//   }
// }

// // Utility functions
// function formatFileSize(bytes) {
//   if (!bytes) return 'Unknown';
//   const k = 1024;
//   const sizes = ['B', 'KB', 'MB', 'GB'];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
// }

// function sanitizeFileName(name) {
//   return name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
// }





















import axios from 'axios';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let getUserCaption;
let ytDlpInstalled = false;
let ytDlpPath = null;

async function initializeCaptionSystem() {
  try {
    const tiktokModule = await import('./tiktok.js');
    getUserCaption = tiktokModule.getUserCaption || ((userId) => "WolfBot is the Alpha");
  } catch (error) {
    getUserCaption = (userId) => "WolfBot is the Alpha";
  }
}

initializeCaptionSystem();

// Initialize yt-dlp on script load
async function initializeYtDlp() {
  console.log('🔍 Checking for yt-dlp...');
  
  // First, try to find existing yt-dlp
  ytDlpPath = await findYtDlp();
  
  if (ytDlpPath) {
    console.log(`✅ yt-dlp found at: ${ytDlpPath}`);
    ytDlpInstalled = true;
    return true;
  }
  
  // If not found, offer to install it automatically
  console.log('⚠️ yt-dlp not found. It will be installed when needed.');
  return false;
}

// Call initialization
initializeYtDlp().catch(console.error);

function getCaption(userId) {
  if (typeof getUserCaption === 'function') {
    return getUserCaption(userId);
  }
  return "WolfBot is the Alpha";
}

// Progress bar function
function getProgressBar(percentage) {
  const filled = Math.round((percentage / 100) * 10);
  const empty = 10 - filled;
  return `█`.repeat(filled) + `▒`.repeat(empty);
}

export default {
  name: "video",
  description: "Search and download videos from YouTube",
  async execute(sock, m, args) {
    const jid = m.key.remoteJid;
    const userId = m.key.participant || m.key.remoteJid;
    let statusMsg = null;

    try {
      if (!args[0]) {
        await sock.sendMessage(jid, { 
          text: `🎬 *Video Downloader*\n\nUsage: video <search query>\nExample: video NF Home\nExample: video Ethical Hacking tutorial` 
        }, { quoted: m });
        return;
      }

      const searchQuery = args.join(' ');
      
      // Send initial status message
      statusMsg = await sock.sendMessage(jid, { 
        text: `🔍 *Searching for*: "${searchQuery}"...\n${getProgressBar(10)} 10%` 
      }, { quoted: m });

      const updateStatus = async (text, progress = 0) => {
        const progressBar = getProgressBar(progress);
        try {
          await sock.sendMessage(jid, { 
            text: `${text}\n${progressBar} ${progress}%`,
            edit: statusMsg.key 
          });
        } catch (editError) {
          console.log("Could not edit message:", editError.message);
        }
      };

      // Search for videos
      await updateStatus(`🔍 *Searching for*: "${searchQuery}"...`, 20);
      const searchResult = await searchYouTube(searchQuery, updateStatus);
      
      if (!searchResult || !searchResult.url) {
        await updateStatus(`❌ No videos found for "${searchQuery}"`, 100);
        return;
      }

      // Update status message to show found video
      await updateStatus(`✅ Found: ${searchResult.title}\n⏳ *Downloading...*`, 40);

      // Ensure yt-dlp is available or install it
      await ensureYtDlpInstalled(updateStatus);

      // Download the video with progress updates
      const result = await downloadYouTubeVideo(searchResult.url, async (progress) => {
        await updateStatus(`✅ Found: ${searchResult.title}\n⏳ *Downloading...*`, 40 + Math.floor(progress * 0.4));
      });
      
      if (!result.success) {
        await updateStatus(`❌ Download failed: ${result.error}`, 100);
        return;
      }

      const { filePath, fileSize } = result;
      const userCaption = getCaption(userId);
      const maxSize = 16 * 1024 * 1024; // 16MB limit for videos

      // Update status message to show uploading
      await updateStatus(`📤 *Uploading video...*`, 90);

      try {
        if (fileSize > maxSize) {
          // Send as document if too large
          await sock.sendMessage(jid, {
            document: readFileSync(filePath),
            fileName: `${sanitizeFileName(searchResult.title)}.mp4`,
            mimetype: 'video/mp4',
            caption: `📁 *${searchResult.title}*\n\n👤 ${searchResult.channel}\n⏱ ${searchResult.duration}\n📊 ${formatFileSize(fileSize)}\n\n${userCaption}`
          });
        } else {
          // Send as video
          await sock.sendMessage(jid, {
            video: readFileSync(filePath),
            caption: `🎬 *${searchResult.title}*\n\n👤 ${searchResult.channel}\n⏱ ${searchResult.duration}\n\n${userCaption}`
          });
        }

        await updateStatus(`✅ *Video sent successfully!*\n\n📁 Title: ${searchResult.title}\n👤 Channel: ${searchResult.channel}\n⏱ Duration: ${searchResult.duration}\n📊 Size: ${formatFileSize(fileSize)}`, 100);

      } catch (uploadError) {
        await updateStatus(`❌ Upload failed: ${uploadError.message}`, 100);
        throw uploadError;
      }

      // Cleanup
      setTimeout(() => {
        try {
          if (existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🧹 Cleaned up video file: ${filePath}`);
          }
        } catch (e) {
          console.log('Cleanup error:', e.message);
        }
      }, 30000);

    } catch (error) {
      console.error('Video command error:', error);
      
      // Update status message with error if it exists
      if (statusMsg) {
        await sock.sendMessage(jid, { 
          text: `❌ Error: ${error.message}`,
          edit: statusMsg.key 
        });
      } else {
        await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: m });
      }
    }
  },
};

// Ensure yt-dlp is installed, install if not
async function ensureYtDlpInstalled(updateStatus = () => {}) {
  if (ytDlpInstalled && ytDlpPath) {
    return true;
  }

  try {
    await updateStatus(`🔧 Installing yt-dlp...`, 25);
    
    // Try to find it again first
    ytDlpPath = await findYtDlp();
    if (ytDlpPath) {
      ytDlpInstalled = true;
      console.log(`✅ yt-dlp already installed at: ${ytDlpPath}`);
      return true;
    }

    await updateStatus(`🔧 Downloading yt-dlp...`, 30);
    
    // Determine OS and install accordingly
    const platform = os.platform();
    const isWindows = platform === 'win32';
    const isLinux = platform === 'linux';
    const isMac = platform === 'darwin';
    
    const botDir = process.cwd();
    const ytDlpBin = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    const ytDlpFullPath = `${botDir}/${ytDlpBin}`;
    
    console.log(`Installing yt-dlp for ${platform} in ${botDir}`);
    
    if (isWindows) {
      // Windows installation
      await updateStatus(`🔧 Installing for Windows...`, 35);
      
      // Download yt-dlp.exe
      const downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
      await downloadFile(downloadUrl, ytDlpFullPath);
      
      console.log(`✅ Downloaded yt-dlp.exe to ${ytDlpFullPath}`);
      
    } else if (isLinux || isMac) {
      // Linux/Mac installation
      await updateStatus(`🔧 Installing for ${isLinux ? 'Linux' : 'Mac'}...`, 35);
      
      // Method 1: Download binary
      const downloadUrl = isLinux 
        ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux'
        : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
      
      await downloadFile(downloadUrl, ytDlpFullPath);
      
      // Make executable
      await execAsync(`chmod +x "${ytDlpFullPath}"`);
      
      console.log(`✅ Downloaded and made yt-dlp executable at ${ytDlpFullPath}`);
    }
    
    // Verify installation
    await updateStatus(`🔧 Verifying installation...`, 40);
    
    try {
      await execAsync(`"${ytDlpFullPath}" --version`);
      ytDlpPath = ytDlpFullPath;
      ytDlpInstalled = true;
      
      console.log(`✅ yt-dlp successfully installed at: ${ytDlpFullPath}`);
      await updateStatus(`✅ yt-dlp installed successfully!`, 45);
      
      return true;
    } catch (verifyError) {
      console.error('yt-dlp verification failed:', verifyError);
      
      // Try alternative installation method
      await updateStatus(`🔧 Trying alternative installation...`, 42);
      
      if (isLinux) {
        try {
          // Try installing via pip
          await execAsync('python3 -m pip install --upgrade yt-dlp');
          ytDlpPath = 'yt-dlp';
          ytDlpInstalled = true;
          
          console.log('✅ yt-dlp installed via pip');
          await updateStatus(`✅ yt-dlp installed via pip!`, 45);
          
          return true;
        } catch (pipError) {
          console.error('pip installation failed:', pipError);
        }
      }
      
      throw new Error('Failed to install yt-dlp');
    }
    
  } catch (error) {
    console.error('yt-dlp installation failed:', error);
    await updateStatus(`⚠️ yt-dlp installation failed. Using alternative methods...`, 45);
    return false;
  }
}

// Search YouTube videos with multiple methods
async function searchYouTube(query, updateStatus = () => {}) {
  try {
    // Method 1: Use YouTube Data API
    await updateStatus(`🔍 Method 1: YouTube API...`, 30);
    const apiResult = await searchYouTubeAPI(query);
    if (apiResult) return apiResult;

    // Method 2: Use public YouTube search
    await updateStatus(`🔍 Method 2: Public search...`, 40);
    const publicResult = await searchYouTubePublic(query);
    if (publicResult) return publicResult;

    // Method 3: Use yt-dlp if available
    await updateStatus(`🔍 Method 3: yt-dlp search...`, 50);
    const ytDlpResult = await searchYouTubeWithYtDlp(query);
    if (ytDlpResult) return ytDlpResult;

    return null;

  } catch (error) {
    console.error('YouTube search error:', error);
    return null;
  }
}

// Method 1: YouTube Data API
async function searchYouTubeAPI(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    
    // Try multiple API keys (free tier allows 100 searches/day)
    const apiKeys = [
      'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', // Provided key
      'AIzaSyC-2VxZYsJcJYF6T7qYQcW8vqQ1QkQ-X-Q', // Additional key
      'AIzaSyB7K5N-7ZqZ8ZqZ8ZqZ8ZqZ8ZqZ8ZqZ8Zq'  // Fallback
    ];

    for (const apiKey of apiKeys) {
      try {
        const apiUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&q=${encodedQuery}&maxResults=1&type=video&key=${apiKey}`;
        
        const response = await axios.get(apiUrl, { 
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (response.data.items && response.data.items.length > 0) {
          const item = response.data.items[0];
          const videoUrl = `https://www.youtube.com/watch?v=${item.id.videoId}`;
          
          return {
            title: item.snippet.title,
            url: videoUrl,
            channel: item.snippet.channelTitle,
            duration: 'N/A',
            thumbnail: item.snippet.thumbnails?.medium?.url || ''
          };
        }
      } catch (apiError) {
        console.log(`API key ${apiKey.substring(0, 10)}... failed:`, apiError.message);
        continue;
      }
    }
  } catch (error) {
    console.log('YouTube API search failed:', error.message);
  }
  return null;
}

// Method 2: Public YouTube search scraping
async function searchYouTubePublic(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    // Extract video ID from search results using multiple patterns
    const html = response.data;
    
    // Pattern 1: videoId in JSON
    const videoIdMatch = html.match(/"videoId":"([^"]{11})"/);
    // Pattern 2: watch?v= in links
    const watchMatch = html.match(/watch\?v=([^"&]{11})/);
    
    const videoId = (videoIdMatch && videoIdMatch[1]) || (watchMatch && watchMatch[1]);
    
    if (videoId) {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      // Try to get title from page
      const titleMatch = html.match(/"title":{"simpleText":"([^"]+)"}/);
      const title = titleMatch ? titleMatch[1] : query;
      
      return {
        title: title.substring(0, 100),
        url: videoUrl,
        channel: 'YouTube',
        duration: 'N/A',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      };
    }
  } catch (error) {
    console.log('Public YouTube search failed:', error.message);
  }
  return null;
}

// Method 3: yt-dlp search (if available)
async function searchYouTubeWithYtDlp(query) {
  try {
    if (!ytDlpInstalled || !ytDlpPath) {
      return null;
    }
    
    const searchCmd = `"${ytDlpPath}" "ytsearch:${query}" --dump-json --no-download`;
    const { stdout } = await execAsync(searchCmd, { timeout: 30000 });
    const results = JSON.parse(stdout);
    
    if (results && results.title) {
      return {
        title: results.title,
        url: results.webpage_url,
        channel: results.uploader || 'Unknown',
        duration: results.duration_string || 'N/A',
        views: results.view_count || 0,
        thumbnail: results.thumbnail || ''
      };
    }
  } catch (ytdlpError) {
    console.log('yt-dlp search failed:', ytdlpError.message);
  }
  return null;
}

// Find yt-dlp in multiple locations
async function findYtDlp() {
  const possiblePaths = [
    'yt-dlp',
    'yt-dlp.exe',
    './yt-dlp',
    './yt-dlp.exe',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    '/bin/yt-dlp',
    process.cwd() + '/yt-dlp',
    process.cwd() + '/yt-dlp.exe',
    __dirname + '/yt-dlp',
    __dirname + '/yt-dlp.exe',
    '/usr/bin/python3 -m yt_dlp',
    '/usr/bin/python -m yt_dlp',
    'python3 -m yt_dlp',
    'python -m yt_dlp'
  ];

  for (const path of possiblePaths) {
    try {
      if (path.includes('python') && path.includes('yt_dlp')) {
        // Check python module
        await execAsync(`${path} --version`);
        console.log(`✅ Found yt-dlp as python module: ${path}`);
        return path;
      } else {
        await execAsync(`"${path}" --version`);
        console.log(`✅ Found yt-dlp at: ${path}`);
        return path;
      }
    } catch (e) {
      continue;
    }
  }
  console.log('❌ yt-dlp not found in any location');
  return null;
}

// Download YouTube video with multiple methods
async function downloadYouTubeVideo(url, progressCallback = () => {}) {
  const tempDir = './temp/video';
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

  const timestamp = Date.now();
  const filePath = `${tempDir}/video_${timestamp}.mp4`;

  try {
    progressCallback(10);
    
    // Try yt-dlp first if available
    if (ytDlpInstalled && ytDlpPath) {
      progressCallback(20);
      const result = await downloadWithYtDlp(ytDlpPath, url, filePath, progressCallback);
      if (result.success) return result;
    }

    progressCallback(40);
    
    // Try YouTube download APIs
    const apiResult = await downloadWithAPIs(url, filePath, progressCallback);
    if (apiResult.success) return apiResult;

    progressCallback(60);
    
    // Try y2mate API
    const y2mateResult = await downloadWithY2Mate(url, filePath, progressCallback);
    if (y2mateResult.success) return y2mateResult;

    throw new Error('All download methods failed');

  } catch (error) {
    console.error('Video download error:', error);
    if (existsSync(filePath)) fs.unlinkSync(filePath);
    return { success: false, error: error.message };
  }
}

// Download using yt-dlp
async function downloadWithYtDlp(ytDlpPath, url, filePath, progressCallback) {
  try {
    // Download with WhatsApp-compatible format (720p max, MP4)
    const downloadCmd = `"${ytDlpPath}" -f "best[height<=720][ext=mp4]/best[ext=mp4]/best" --no-check-certificate --no-warnings -o "${filePath}" "${url}"`;
    
    await execAsync(downloadCmd, { timeout: 120000 });
    
    progressCallback(80);
    
    const stats = fs.statSync(filePath);
    
    if (stats.size === 0) {
      throw new Error('Empty file downloaded');
    }

    progressCallback(100);
    
    return {
      success: true,
      filePath,
      fileSize: stats.size
    };

  } catch (error) {
    console.error('yt-dlp download failed:', error.message);
    return { success: false, error: `yt-dlp: ${error.message}` };
  }
}

// Download using public YouTube APIs
async function downloadWithAPIs(url, filePath, progressCallback) {
  const apis = [
    {
      name: 'youtube-downloader-api',
      url: `https://youtube-downloader-api.vercel.app/download?url=${encodeURIComponent(url)}&type=video`
    },
    {
      name: 'loader-to',
      url: `https://loader.to/ajax/download.php?format=mp4&url=${encodeURIComponent(url)}`
    },
    {
      name: 'yt5s',
      url: `https://yt5s.com/api/ajaxSearch/index`
    }
  ];

  for (const api of apis) {
    try {
      progressCallback(50);
      
      let downloadUrl;
      
      if (api.name === 'yt5s') {
        // yt5s requires POST with form data
        const response = await axios.post(api.url, `q=${encodeURIComponent(url)}&vt=home`, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0'
          },
          timeout: 30000
        });
        
        if (response.data && response.data.vid && response.data.title) {
          // Need to get download URL from second API call
          const convertResponse = await axios.post('https://yt5s.com/api/ajaxConvert/convert', `vid=${response.data.vid}&k=${response.data.links.mp4['720p'].k}`, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0'
            },
            timeout: 30000
          });
          
          downloadUrl = convertResponse.data.dlink;
        }
      } else {
        const response = await axios.get(api.url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 30000
        });
        
        downloadUrl = response.data.url || response.data.downloadUrl;
      }

      if (downloadUrl) {
        progressCallback(70);
        await downloadFile(downloadUrl, filePath);
        
        progressCallback(90);
        const stats = fs.statSync(filePath);
        
        if (stats.size > 0) {
          return {
            success: true,
            filePath,
            fileSize: stats.size
          };
        }
      }
    } catch (apiError) {
      console.log(`${api.name} failed:`, apiError.message);
      continue;
    }
  }
  
  return { success: false, error: 'All APIs failed' };
}

// Download using y2mate
async function downloadWithY2Mate(url, filePath, progressCallback) {
  try {
    progressCallback(60);
    
    // Get video ID from URL
    const videoId = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1];
    if (!videoId) throw new Error('Invalid YouTube URL');
    
    const apiUrl = `https://y2mate.com/mates/analyzeV2/ajax`;
    const formData = new URLSearchParams({
      k_query: `https://www.youtube.com/watch?v=${videoId}`,
      k_page: 'home',
      hl: 'en',
      q_auto: '0'
    });
    
    const response = await axios.post(apiUrl, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 30000
    });
    
    if (response.data && response.data.links && response.data.links.mp4) {
      // Find 720p or best quality
      const quality = response.data.links.mp4['720'] || 
                     response.data.links.mp4['360'] || 
                     Object.values(response.data.links.mp4)[0];
      
      if (quality && quality.dlink) {
        progressCallback(80);
        await downloadFile(quality.dlink, filePath);
        
        progressCallback(95);
        const stats = fs.statSync(filePath);
        
        if (stats.size > 0) {
          return {
            success: true,
            filePath,
            fileSize: stats.size
          };
        }
      }
    }
    
    return { success: false, error: 'y2mate API failed' };
  } catch (error) {
    console.log('y2mate failed:', error.message);
    return { success: false, error: `y2mate: ${error.message}` };
  }
}

// Download file helper
async function downloadFile(url, filePath) {
  const writer = createWriteStream(filePath);
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
    timeout: 60000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.youtube.com/'
    }
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// Utility functions
function formatFileSize(bytes) {
  if (!bytes) return 'Unknown';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function sanitizeFileName(name) {
  return name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
}