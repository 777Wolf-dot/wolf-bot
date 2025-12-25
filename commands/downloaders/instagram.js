
// import axios from 'axios';
// import { createWriteStream, existsSync, mkdirSync } from 'fs';
// import { promisify } from 'util';
// import { exec } from 'child_process';
// import fs from 'fs';

// const execAsync = promisify(exec);

// // Import the global caption system from tiktok.js
// let getUserCaption;
// try {
//   ({ getUserCaption } = await import('./tiktok.js'));
// } catch (error) {
//   // Fallback if tiktok.js not available
//   getUserCaption = (userId) => "WolfBot is the Alpha";
// }

// export default {
//   name: "instagram",
//   description: "Download Instagram posts, reels, and stories",
//   async execute(sock, m, args) {
//     const jid = m.key.remoteJid;
//     const userId = m.key.participant || m.key.remoteJid;

//     try {
//       if (!args[0]) {
//         await sock.sendMessage(jid, { 
//           text: `📷 *Instagram Downloader*\n\nUsage: instagram <url>\n\nSupports:\n• Posts\n• Reels\n• Stories\n• IGTV\n\nEx: instagram https://instagram.com/p/xyz` 
//         }, { quoted: m });
//         return;
//       }

//       const url = args[0];
      
//       if (!isValidInstagramUrl(url)) {
//         await sock.sendMessage(jid, { text: `❌ Invalid Instagram URL` }, { quoted: m });
//         return;
//       }

//       await sock.sendMessage(jid, { text: `⏳ Downloading...` }, { quoted: m });

//       const result = await downloadInstagram(url);
      
//       if (!result.success) {
//         await sock.sendMessage(jid, { text: `❌ Download failed` }, { quoted: m });
//         return;
//       }

//       const { mediaPath, mediaType, mediaInfo } = result;
      
//       // Get user's global custom caption
//       const userCaption = getUserCaption(userId);

//       if (mediaType === 'image') {
//         await sock.sendMessage(jid, {
//           image: fs.readFileSync(mediaPath),
//           caption: userCaption
//         }, { quoted: m });
//       } else if (mediaType === 'video') {
//         await sock.sendMessage(jid, {
//           video: fs.readFileSync(mediaPath),
//           caption: userCaption
//         }, { quoted: m });
//       } else if (mediaType === 'carousel') {
//         // Send multiple images
//         const images = mediaPath.map(path => fs.readFileSync(path));
//         for (const image of images) {
//           await sock.sendMessage(jid, {
//             image: image,
//             caption: userCaption
//           }, { quoted: m });
//         }
//       }

//       // Cleanup
//       setTimeout(() => {
//         try {
//           if (Array.isArray(mediaPath)) {
//             mediaPath.forEach(path => {
//               if (existsSync(path)) fs.unlinkSync(path);
//             });
//           } else {
//             if (existsSync(mediaPath)) fs.unlinkSync(mediaPath);
//           }
//         } catch (e) {}
//       }, 30000);

//     } catch (error) {
//       await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: m });
//     }
//   },
// };

// function isValidInstagramUrl(url) {
//   const patterns = [
//     /https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|story|stories|tv)\/[\w\-\.]+/i,
//     /https?:\/\/instagram\.com\/(p|reel|reels|story|stories|tv)\/[\w\-\.]+/i,
//     /https?:\/\/(www\.)?instagr\.am\/(p|reel|reels|story|stories|tv)\/[\w\-\.]+/i
//   ];
//   return patterns.some(pattern => pattern.test(url));
// }

// async function downloadInstagram(url) {
//   try {
//     const tempDir = './temp/instagram';
//     if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

//     const timestamp = Date.now();

//     // Try multiple Instagram downloader APIs
//     const apis = [
//       {
//         name: 'igram',
//         url: `https://igram.io/api/ajax`,
//         method: 'POST',
//         data: `q=${encodeURIComponent(url)}&t=media&lang=en`,
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//         }
//       },
//       {
//         name: 'instasupreme',
//         url: `https://instasupreme.com/api/instagram`,
//         method: 'POST',
//         data: { url: url },
//         headers: {
//           'Content-Type': 'application/json',
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//         }
//       },
//       {
//         name: 'igdownloader',
//         url: `https://igdownloader.com/api/convert`,
//         method: 'POST',
//         data: `url=${encodeURIComponent(url)}`,
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//         }
//       }
//     ];

//     let downloadUrl = null;
//     let mediaType = null;
//     let mediaInfo = {};

//     for (const api of apis) {
//       try {
//         console.log(`Trying ${api.name} API...`);
        
//         let response;
//         if (api.method === 'POST') {
//           response = await axios.post(api.url, api.data, {
//             headers: api.headers,
//             timeout: 30000
//           });
//         } else {
//           response = await axios.get(api.url, {
//             headers: api.headers,
//             timeout: 30000
//           });
//         }

//         if (response.data) {
//           const data = response.data;
          
//           // Parse response based on API
//           if (api.name === 'igram') {
//             if (data.data && data.data.medias) {
//               const media = data.data.medias[0];
//               downloadUrl = media.url;
//               mediaType = media.type === 'image' ? 'image' : 'video';
//               mediaInfo = {
//                 username: data.data.user?.username || 'instagram',
//                 caption: data.data.description || ''
//               };
//             }
//           } else if (api.name === 'instasupreme') {
//             if (data.downloadUrl) {
//               downloadUrl = data.downloadUrl;
//               mediaType = data.type || 'video';
//               mediaInfo = {
//                 username: data.username || 'instagram',
//                 caption: data.caption || ''
//               };
//             }
//           } else if (api.name === 'igdownloader') {
//             if (data.url) {
//               downloadUrl = data.url;
//               mediaType = data.type || 'video';
//               mediaInfo = {
//                 username: data.username || 'instagram',
//                 caption: data.caption || ''
//               };
//             }
//           }

//           if (downloadUrl) {
//             console.log(`Success with ${api.name}`);
//             break;
//           }
//         }
//       } catch (e) {
//         console.log(`${api.name} failed:`, e.message);
//         continue;
//       }
//     }

//     if (!downloadUrl) {
//       // Fallback to yt-dlp
//       return await downloadWithYtDlp(url, tempDir, timestamp);
//     }

//     // Determine file extension
//     const extension = mediaType === 'image' ? 'jpg' : 'mp4';
//     const mediaPath = `${tempDir}/instagram_${timestamp}.${extension}`;

//     await downloadFile(downloadUrl, mediaPath);

//     return {
//       success: true,
//       mediaPath,
//       mediaType,
//       mediaInfo
//     };

//   } catch (error) {
//     console.error('Instagram download error:', error);
//     return { success: false, error: error.message };
//   }
// }

// async function downloadWithYtDlp(url, tempDir, timestamp) {
//   try {
//     await execAsync('yt-dlp --version');
//   } catch {
//     return { success: false, error: 'yt-dlp not installed' };
//   }

//   try {
//     const outputTemplate = `${tempDir}/instagram_${timestamp}.%(ext)s`;
    
//     // Get video info first
//     const infoCommand = `yt-dlp --dump-json "${url}"`;
//     const { stdout: infoJson } = await execAsync(infoCommand);
//     const info = JSON.parse(infoJson);

//     let mediaType = 'video';
//     let mediaPath = `${tempDir}/instagram_${timestamp}.mp4`;

//     if (info._type === 'playlist' || info.entries) {
//       // Carousel post with multiple images
//       mediaType = 'carousel';
//       const outputTemplate = `${tempDir}/instagram_${timestamp}_%(playlist_index)s.%(ext)s`;
//       await execAsync(`yt-dlp -o "${outputTemplate}" "${url}"`);
      
//       // Find all downloaded files
//       const files = fs.readdirSync(tempDir)
//         .filter(file => file.startsWith(`instagram_${timestamp}_`))
//         .map(file => `${tempDir}/${file}`);
      
//       mediaPath = files;
//     } else if (info.ext === 'jpg' || info.ext === 'png' || info.ext === 'webp') {
//       // Single image
//       mediaType = 'image';
//       mediaPath = `${tempDir}/instagram_${timestamp}.${info.ext}`;
//       await execAsync(`yt-dlp -o "${mediaPath}" "${url}"`);
//     } else {
//       // Video
//       await execAsync(`yt-dlp -f "best[ext=mp4]" -o "${mediaPath}" "${url}"`);
//     }

//     return {
//       success: true,
//       mediaPath,
//       mediaType,
//       mediaInfo: {
//         username: info.uploader || 'instagram',
//         caption: info.description || info.title || ''
//       }
//     };
//   } catch (error) {
//     return { success: false, error: error.message };
//   }
// }

// async function downloadFile(url, filePath) {
//   const writer = createWriteStream(filePath);
//   const response = await axios({
//     method: 'GET',
//     url: url,
//     responseType: 'stream',
//     timeout: 60000,
//     headers: {
//       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
//       'Referer': 'https://www.instagram.com/',
//       'Origin': 'https://www.instagram.com'
//     }
//   });

//   response.data.pipe(writer);

//   return new Promise((resolve, reject) => {
//     writer.on('finish', resolve);
//     writer.on('error', reject);
//   });
// }





























// import axios from 'axios';
// import { createWriteStream, existsSync, mkdirSync } from 'fs';
// import { promisify } from 'util';
// import { exec } from 'child_process';
// import fs from 'fs';

// const execAsync = promisify(exec);

// // Import the global caption system from tiktok.js with proper error handling
// let getUserCaption;

// async function initializeCaptionSystem() {
//   try {
//     const tiktokModule = await import('./tiktok.js');
//     getUserCaption = tiktokModule.getUserCaption || ((userId) => "WolfBot is the Alpha");
//   } catch (error) {
//     console.log('tiktok.js not available, using default caption');
//     getUserCaption = (userId) => "WolfBot is the Alpha";
//   }
// }

// // Initialize the caption system
// initializeCaptionSystem();

// // Fallback function in case getUserCaption is still not defined
// function getCaption(userId) {
//   if (typeof getUserCaption === 'function') {
//     return getUserCaption(userId);
//   }
//   return "WolfBot is the Alpha";
// }

// export default {
//   name: "instagram",
//   description: "Download Instagram posts, reels, and stories",
//   async execute(sock, m, args) {
//     const jid = m.key.remoteJid;
//     const userId = m.key.participant || m.key.remoteJid;

//     try {
//       if (!args[0]) {
//         await sock.sendMessage(jid, { 
//           text: `📷 *Instagram Downloader*\n\nUsage: instagram <url>\n\nSupports:\n• Posts\n• Reels\n• Stories\n• IGTV\n\nEx: instagram https://instagram.com/p/xyz` 
//         }, { quoted: m });
//         return;
//       }

//       const url = args[0];
      
//       if (!isValidInstagramUrl(url)) {
//         await sock.sendMessage(jid, { text: `❌ Invalid Instagram URL` }, { quoted: m });
//         return;
//       }

//       await sock.sendMessage(jid, { text: `⏳ Downloading...` }, { quoted: m });

//       const result = await downloadInstagram(url);
      
//       if (!result.success) {
//         await sock.sendMessage(jid, { text: `❌ Download failed: ${result.error || 'Unknown error'}` }, { quoted: m });
//         return;
//       }

//       const { mediaPath, mediaType, mediaInfo } = result;
      
//       // Get user's global custom caption with safe fallback
//       const userCaption = getCaption(userId);

//       if (mediaType === 'image') {
//         await sock.sendMessage(jid, {
//           image: fs.readFileSync(mediaPath),
//           caption: userCaption
//         }, { quoted: m });
//       } else if (mediaType === 'video') {
//         await sock.sendMessage(jid, {
//           video: fs.readFileSync(mediaPath),
//           caption: userCaption
//         }, { quoted: m });
//       } else if (mediaType === 'carousel') {
//         // Send multiple images
//         const images = mediaPath.map(path => ({
//           image: fs.readFileSync(path),
//           caption: images.indexOf(path) === 0 ? userCaption : '' // Only caption first image
//         }));
        
//         for (const media of images) {
//           await sock.sendMessage(jid, media, { quoted: m });
//         }
//       }

//       // Cleanup with better error handling
//       setTimeout(() => {
//         try {
//           if (Array.isArray(mediaPath)) {
//             mediaPath.forEach(path => {
//               if (existsSync(path)) {
//                 fs.unlinkSync(path);
//                 console.log(`Cleaned up: ${path}`);
//               }
//             });
//           } else {
//             if (existsSync(mediaPath)) {
//               fs.unlinkSync(mediaPath);
//               console.log(`Cleaned up: ${mediaPath}`);
//             }
//           }
//         } catch (e) {
//           console.log('Cleanup error:', e.message);
//         }
//       }, 30000);

//     } catch (error) {
//       console.error('Instagram command error:', error);
//       await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: m });
//     }
//   },
// };

// function isValidInstagramUrl(url) {
//   const patterns = [
//     /https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|story|stories|tv)\/[\w\-\.]+/i,
//     /https?:\/\/instagram\.com\/(p|reel|reels|story|stories|tv)\/[\w\-\.]+/i,
//     /https?:\/\/(www\.)?instagr\.am\/(p|reel|reels|story|stories|tv)\/[\w\-\.]+/i
//   ];
//   return patterns.some(pattern => pattern.test(url));
// }

// async function downloadInstagram(url) {
//   try {
//     const tempDir = './temp/instagram';
//     if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

//     const timestamp = Date.now();

//     // Try multiple Instagram downloader APIs
//     const apis = [
//       {
//         name: 'igram',
//         url: `https://igram.io/api/ajax`,
//         method: 'POST',
//         data: `q=${encodeURIComponent(url)}&t=media&lang=en`,
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//         }
//       },
//       {
//         name: 'instasupreme',
//         url: `https://instasupreme.com/api/instagram`,
//         method: 'POST',
//         data: { url: url },
//         headers: {
//           'Content-Type': 'application/json',
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//         }
//       },
//       {
//         name: 'igdownloader',
//         url: `https://igdownloader.com/api/convert`,
//         method: 'POST',
//         data: `url=${encodeURIComponent(url)}`,
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//         }
//       }
//     ];

//     let downloadUrl = null;
//     let mediaType = null;
//     let mediaInfo = {};

//     for (const api of apis) {
//       try {
//         console.log(`Trying ${api.name} API...`);
        
//         let response;
//         if (api.method === 'POST') {
//           response = await axios.post(api.url, api.data, {
//             headers: api.headers,
//             timeout: 30000
//           });
//         } else {
//           response = await axios.get(api.url, {
//             headers: api.headers,
//             timeout: 30000
//           });
//         }

//         if (response.data) {
//           const data = response.data;
          
//           // Parse response based on API
//           if (api.name === 'igram') {
//             if (data.data && data.data.medias) {
//               const media = data.data.medias[0];
//               downloadUrl = media.url;
//               mediaType = media.type === 'image' ? 'image' : 'video';
//               mediaInfo = {
//                 username: data.data.user?.username || 'instagram',
//                 caption: data.data.description || ''
//               };
//             }
//           } else if (api.name === 'instasupreme') {
//             if (data.downloadUrl) {
//               downloadUrl = data.downloadUrl;
//               mediaType = data.type || 'video';
//               mediaInfo = {
//                 username: data.username || 'instagram',
//                 caption: data.caption || ''
//               };
//             }
//           } else if (api.name === 'igdownloader') {
//             if (data.url) {
//               downloadUrl = data.url;
//               mediaType = data.type || 'video';
//               mediaInfo = {
//                 username: data.username || 'instagram',
//                 caption: data.caption || ''
//               };
//             }
//           }

//           if (downloadUrl) {
//             console.log(`Success with ${api.name}`);
//             break;
//           }
//         }
//       } catch (e) {
//         console.log(`${api.name} failed:`, e.message);
//         continue;
//       }
//     }

//     if (!downloadUrl) {
//       // Fallback to yt-dlp
//       return await downloadWithYtDlp(url, tempDir, timestamp);
//     }

//     // Determine file extension
//     const extension = mediaType === 'image' ? 'jpg' : 'mp4';
//     const mediaPath = `${tempDir}/instagram_${timestamp}.${extension}`;

//     await downloadFile(downloadUrl, mediaPath);

//     return {
//       success: true,
//       mediaPath,
//       mediaType,
//       mediaInfo
//     };

//   } catch (error) {
//     console.error('Instagram download error:', error);
//     return { success: false, error: error.message };
//   }
// }

// async function downloadWithYtDlp(url, tempDir, timestamp) {
//   try {
//     await execAsync('yt-dlp --version');
//   } catch {
//     return { success: false, error: 'yt-dlp not installed' };
//   }

//   try {
//     const outputTemplate = `${tempDir}/instagram_${timestamp}.%(ext)s`;
    
//     // Get video info first
//     const infoCommand = `yt-dlp --dump-json "${url}"`;
//     const { stdout: infoJson } = await execAsync(infoCommand);
//     const info = JSON.parse(infoJson);

//     let mediaType = 'video';
//     let mediaPath = `${tempDir}/instagram_${timestamp}.mp4`;

//     if (info._type === 'playlist' || info.entries) {
//       // Carousel post with multiple images
//       mediaType = 'carousel';
//       const outputTemplate = `${tempDir}/instagram_${timestamp}_%(playlist_index)s.%(ext)s`;
//       await execAsync(`yt-dlp -o "${outputTemplate}" "${url}"`);
      
//       // Find all downloaded files
//       const files = fs.readdirSync(tempDir)
//         .filter(file => file.startsWith(`instagram_${timestamp}_`))
//         .sort() // Sort to maintain order
//         .map(file => `${tempDir}/${file}`);
      
//       mediaPath = files;
//     } else if (info.ext === 'jpg' || info.ext === 'png' || info.ext === 'webp') {
//       // Single image
//       mediaType = 'image';
//       mediaPath = `${tempDir}/instagram_${timestamp}.${info.ext}`;
//       await execAsync(`yt-dlp -o "${mediaPath}" "${url}"`);
//     } else {
//       // Video
//       await execAsync(`yt-dlp -f "best[ext=mp4]" -o "${mediaPath}" "${url}"`);
//     }

//     return {
//       success: true,
//       mediaPath,
//       mediaType,
//       mediaInfo: {
//         username: info.uploader || 'instagram',
//         caption: info.description || info.title || ''
//       }
//     };
//   } catch (error) {
//     return { success: false, error: error.message };
//   }
// }

// async function downloadFile(url, filePath) {
//   const writer = createWriteStream(filePath);
//   const response = await axios({
//     method: 'GET',
//     url: url,
//     responseType: 'stream',
//     timeout: 60000,
//     headers: {
//       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
//       'Referer': 'https://www.instagram.com/',
//       'Origin': 'https://www.instagram.com'
//     }
//   });

//   response.data.pipe(writer);

//   return new Promise((resolve, reject) => {
//     writer.on('finish', resolve);
//     writer.on('error', reject);
//   });
// }


















// import axios from 'axios';
// import { createWriteStream, existsSync, mkdirSync } from 'fs';
// import { promisify } from 'util';
// import { exec } from 'child_process';
// import fs from 'fs';

// const execAsync = promisify(exec);

// // Import the global caption system from tiktok.js with proper error handling
// let getUserCaption;

// async function initializeCaptionSystem() {
//   try {
//     const tiktokModule = await import('./tiktok.js');
//     getUserCaption = tiktokModule.getUserCaption || ((userId) => "WolfBot is the Alpha");
//   } catch (error) {
//     console.log('tiktok.js not available, using default caption');
//     getUserCaption = (userId) => "WolfBot is the Alpha";
//   }
// }

// // Initialize the caption system
// initializeCaptionSystem();

// // Fallback function in case getUserCaption is still not defined
// function getCaption(userId) {
//   if (typeof getUserCaption === 'function') {
//     return getUserCaption(userId);
//   }
//   return "WolfBot is the Alpha";
// }

// export default {
//   name: "instagram",
//   description: "Download Instagram posts, reels, and stories",
//   async execute(sock, m, args) {
//     const jid = m.key.remoteJid;
//     const userId = m.key.participant || m.key.remoteJid;

//     try {
//       if (!args[0]) {
//         await sock.sendMessage(jid, { 
//           text: `📷 *Instagram Downloader*\n\nUsage: instagram <url>\n\nSupports:\n• Posts\n• Reels\n• Stories\n• IGTV\n\nEx: instagram https://instagram.com/p/xyz` 
//         }, { quoted: m });
//         return;
//       }

//       const url = args[0];
      
//       if (!isValidInstagramUrl(url)) {
//         await sock.sendMessage(jid, { text: `❌ Invalid Instagram URL` }, { quoted: m });
//         return;
//       }

//       await sock.sendMessage(jid, { text: `⏳ Downloading...` }, { quoted: m });

//       const result = await downloadInstagram(url);
      
//       if (!result.success) {
//         await sock.sendMessage(jid, { text: `❌ Download failed: ${result.error || 'Unknown error'}` }, { quoted: m });
//         return;
//       }

//       const { mediaPath, mediaType, mediaInfo } = result;
      
//       // Get user's global custom caption with safe fallback
//       const userCaption = getCaption(userId);

//       try {
//         if (mediaType === 'image') {
//           const imageData = fs.readFileSync(mediaPath);
//           await sock.sendMessage(jid, {
//             image: imageData,
//             caption: userCaption
//           }, { quoted: m });
          
//           // Delete immediately after sending
//           if (existsSync(mediaPath)) {
//             fs.unlinkSync(mediaPath);
//             console.log(`✅ Cleaned up image: ${mediaPath}`);
//           }
//         } else if (mediaType === 'video') {
//           const videoData = fs.readFileSync(mediaPath);
//           await sock.sendMessage(jid, {
//             video: videoData,
//             caption: userCaption
//           }, { quoted: m });
          
//           // Delete immediately after sending
//           if (existsSync(mediaPath)) {
//             fs.unlinkSync(mediaPath);
//             console.log(`✅ Cleaned up video: ${mediaPath}`);
//           }
//         } else if (mediaType === 'carousel') {
//           // Send multiple images
//           for (let i = 0; i < mediaPath.length; i++) {
//             const path = mediaPath[i];
//             const imageData = fs.readFileSync(path);
//             const caption = i === 0 ? userCaption : ''; // Only caption first image
            
//             await sock.sendMessage(jid, {
//               image: imageData,
//               caption: caption
//             }, { quoted: m });
            
//             // Delete each image immediately after sending
//             if (existsSync(path)) {
//               fs.unlinkSync(path);
//               console.log(`✅ Cleaned up carousel image ${i + 1}: ${path}`);
//             }
//           }
//         }

//       } catch (sendError) {
//         console.error('Error sending media:', sendError);
//         // Cleanup even if sending fails
//         cleanupFiles(mediaPath, mediaType);
//         throw sendError;
//       }

//     } catch (error) {
//       console.error('Instagram command error:', error);
//       await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: m });
//     }
//   },
// };

// function isValidInstagramUrl(url) {
//   const patterns = [
//     /https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|story|stories|tv)\/[\w\-\.]+/i,
//     /https?:\/\/instagram\.com\/(p|reel|reels|story|stories|tv)\/[\w\-\.]+/i,
//     /https?:\/\/(www\.)?instagr\.am\/(p|reel|reels|story|stories|tv)\/[\w\-\.]+/i
//   ];
//   return patterns.some(pattern => pattern.test(url));
// }

// async function downloadInstagram(url) {
//   try {
//     const tempDir = './temp/instagram';
//     if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

//     const timestamp = Date.now();

//     // Try multiple Instagram downloader APIs
//     const apis = [
//       {
//         name: 'igram',
//         url: `https://igram.io/api/ajax`,
//         method: 'POST',
//         data: `q=${encodeURIComponent(url)}&t=media&lang=en`,
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//         }
//       },
//       {
//         name: 'instasupreme',
//         url: `https://instasupreme.com/api/instagram`,
//         method: 'POST',
//         data: { url: url },
//         headers: {
//           'Content-Type': 'application/json',
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//         }
//       },
//       {
//         name: 'igdownloader',
//         url: `https://igdownloader.com/api/convert`,
//         method: 'POST',
//         data: `url=${encodeURIComponent(url)}`,
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//         }
//       }
//     ];

//     let downloadUrl = null;
//     let mediaType = null;
//     let mediaInfo = {};

//     for (const api of apis) {
//       try {
//         console.log(`Trying ${api.name} API...`);
        
//         let response;
//         if (api.method === 'POST') {
//           response = await axios.post(api.url, api.data, {
//             headers: api.headers,
//             timeout: 30000
//           });
//         } else {
//           response = await axios.get(api.url, {
//             headers: api.headers,
//             timeout: 30000
//           });
//         }

//         if (response.data) {
//           const data = response.data;
          
//           // Parse response based on API
//           if (api.name === 'igram') {
//             if (data.data && data.data.medias) {
//               const media = data.data.medias[0];
//               downloadUrl = media.url;
//               mediaType = media.type === 'image' ? 'image' : 'video';
//               mediaInfo = {
//                 username: data.data.user?.username || 'instagram',
//                 caption: data.data.description || ''
//               };
//             }
//           } else if (api.name === 'instasupreme') {
//             if (data.downloadUrl) {
//               downloadUrl = data.downloadUrl;
//               mediaType = data.type || 'video';
//               mediaInfo = {
//                 username: data.username || 'instagram',
//                 caption: data.caption || ''
//               };
//             }
//           } else if (api.name === 'igdownloader') {
//             if (data.url) {
//               downloadUrl = data.url;
//               mediaType = data.type || 'video';
//               mediaInfo = {
//                 username: data.username || 'instagram',
//                 caption: data.caption || ''
//               };
//             }
//           }

//           if (downloadUrl) {
//             console.log(`Success with ${api.name}`);
//             break;
//           }
//         }
//       } catch (e) {
//         console.log(`${api.name} failed:`, e.message);
//         continue;
//       }
//     }

//     if (!downloadUrl) {
//       // Fallback to yt-dlp
//       return await downloadWithYtDlp(url, tempDir, timestamp);
//     }

//     // Determine file extension
//     const extension = mediaType === 'image' ? 'jpg' : 'mp4';
//     const mediaPath = `${tempDir}/instagram_${timestamp}.${extension}`;

//     await downloadFile(downloadUrl, mediaPath);

//     return {
//       success: true,
//       mediaPath,
//       mediaType,
//       mediaInfo
//     };

//   } catch (error) {
//     console.error('Instagram download error:', error);
//     return { success: false, error: error.message };
//   }
// }

// async function downloadWithYtDlp(url, tempDir, timestamp) {
//   try {
//     await execAsync('yt-dlp --version');
//   } catch {
//     return { success: false, error: 'yt-dlp not installed' };
//   }

//   try {
//     const outputTemplate = `${tempDir}/instagram_${timestamp}.%(ext)s`;
    
//     // Get video info first
//     const infoCommand = `yt-dlp --dump-json "${url}"`;
//     const { stdout: infoJson } = await execAsync(infoCommand);
//     const info = JSON.parse(infoJson);

//     let mediaType = 'video';
//     let mediaPath = `${tempDir}/instagram_${timestamp}.mp4`;

//     if (info._type === 'playlist' || info.entries) {
//       // Carousel post with multiple images
//       mediaType = 'carousel';
//       const outputTemplate = `${tempDir}/instagram_${timestamp}_%(playlist_index)s.%(ext)s`;
//       await execAsync(`yt-dlp -o "${outputTemplate}" "${url}"`);
      
//       // Find all downloaded files
//       const files = fs.readdirSync(tempDir)
//         .filter(file => file.startsWith(`instagram_${timestamp}_`))
//         .sort() // Sort to maintain order
//         .map(file => `${tempDir}/${file}`);
      
//       mediaPath = files;
//     } else if (info.ext === 'jpg' || info.ext === 'png' || info.ext === 'webp') {
//       // Single image
//       mediaType = 'image';
//       mediaPath = `${tempDir}/instagram_${timestamp}.${info.ext}`;
//       await execAsync(`yt-dlp -o "${mediaPath}" "${url}"`);
//     } else {
//       // Video
//       await execAsync(`yt-dlp -f "best[ext=mp4]" -o "${mediaPath}" "${url}"`);
//     }

//     return {
//       success: true,
//       mediaPath,
//       mediaType,
//       mediaInfo: {
//         username: info.uploader || 'instagram',
//         caption: info.description || info.title || ''
//       }
//     };
//   } catch (error) {
//     return { success: false, error: error.message };
//   }
// }

// async function downloadFile(url, filePath) {
//   const writer = createWriteStream(filePath);
//   const response = await axios({
//     method: 'GET',
//     url: url,
//     responseType: 'stream',
//     timeout: 60000,
//     headers: {
//       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
//       'Referer': 'https://www.instagram.com/',
//       'Origin': 'https://www.instagram.com'
//     }
//   });

//   response.data.pipe(writer);

//   return new Promise((resolve, reject) => {
//     writer.on('finish', resolve);
//     writer.on('error', reject);
//   });
// }

// // Helper function to cleanup files
// function cleanupFiles(mediaPath, mediaType) {
//   try {
//     if (Array.isArray(mediaPath)) {
//       mediaPath.forEach(path => {
//         if (existsSync(path)) {
//           fs.unlinkSync(path);
//           console.log(`🧹 Cleaned up: ${path}`);
//         }
//       });
//     } else {
//       if (existsSync(mediaPath)) {
//         fs.unlinkSync(mediaPath);
//         console.log(`🧹 Cleaned up: ${mediaPath}`);
//       }
//     }
//   } catch (cleanupError) {
//     console.log('Cleanup error:', cleanupError.message);
//   }
// }



































import axios from 'axios';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the global caption system from tiktok.js with proper error handling
let getUserCaption;

async function initializeCaptionSystem() {
  try {
    const tiktokModule = await import('./tiktok.js');
    getUserCaption = tiktokModule.getUserCaption || ((userId) => "WolfBot is the Alpha");
  } catch (error) {
    console.log('tiktok.js not available, using default caption');
    getUserCaption = (userId) => "WolfBot is the Alpha";
  }
}

// Initialize the caption system
initializeCaptionSystem();

// Fallback function in case getUserCaption is still not defined
function getCaption(userId) {
  if (typeof getUserCaption === 'function') {
    return getUserCaption(userId);
  }
  return "WolfBot is the Alpha";
}

export default {
  name: "instagram",
  description: "Download Instagram posts, reels, and stories",
  async execute(sock, m, args) {
    const jid = m.key.remoteJid;
    const userId = m.key.participant || m.key.remoteJid;

    try {
      if (!args[0]) {
        await sock.sendMessage(jid, { 
          text: `📷 *Instagram Downloader*\n\nUsage: instagram <url>\n\nSupports:\n• Posts\n• Reels\n• Stories\n• IGTV\n\nEx: instagram https://instagram.com/p/xyz` 
        }, { quoted: m });
        return;
      }

      const url = args[0];
      
      if (!isValidInstagramUrl(url)) {
        await sock.sendMessage(jid, { text: `❌ Invalid Instagram URL` }, { quoted: m });
        return;
      }

      // Show initial status with progress indicator
      const statusMsg = await sock.sendMessage(jid, { 
        text: `📥 *Downloading Instagram content...*\n\n▰▱▱▱▱▱▱▱▱ 10%` 
      }, { quoted: m });

      const updateProgress = async (text, progress) => {
        const progressBar = getProgressBar(progress);
        try {
          await sock.sendMessage(jid, { 
            text: `${text}\n\n${progressBar} ${progress}%`,
            edit: statusMsg.key
          }, { quoted: m });
        } catch (editError) {
          console.log("Could not edit message:", editError.message);
        }
      };

      const result = await downloadInstagram(url, updateProgress);
      
      if (!result.success) {
        await updateProgress(`❌ Download failed: ${result.error || 'Unknown error'}`, 100);
        return;
      }

      const { mediaPath, mediaType, mediaInfo } = result;
      
      // Get user's global custom caption with safe fallback
      const userCaption = getCaption(userId);

      try {
        await updateProgress(`✅ Download complete! Sending media...`, 100);
        
        if (mediaType === 'image') {
          const imageData = fs.readFileSync(mediaPath);
          await sock.sendMessage(jid, {
            image: imageData,
            caption: userCaption
          }, { quoted: m });
          
        } else if (mediaType === 'video') {
          const videoData = fs.readFileSync(mediaPath);
          await sock.sendMessage(jid, {
            video: videoData,
            caption: userCaption
          }, { quoted: m });
          
        } else if (mediaType === 'carousel') {
          // Send multiple images
          for (let i = 0; i < mediaPath.length; i++) {
            const path = mediaPath[i];
            const imageData = fs.readFileSync(path);
            const caption = i === 0 ? userCaption : ''; // Only caption first image
            
            await sock.sendMessage(jid, {
              image: imageData,
              caption: caption
            }, { quoted: m });
          }
        }

        // Final success message
        await updateProgress(`✅ Successfully sent Instagram content!`, 100);

      } catch (sendError) {
        console.error('Error sending media:', sendError);
        await updateProgress(`❌ Failed to send media: ${sendError.message}`, 100);
      } finally {
        // Always cleanup files
        cleanupFiles(mediaPath, mediaType);
      }

    } catch (error) {
      console.error('Instagram command error:', error);
      await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: m });
    }
  },
};

function getProgressBar(percentage) {
  const filled = Math.round((percentage / 100) * 10);
  const empty = 10 - filled;
  return `▰`.repeat(filled) + `▱`.repeat(empty);
}

function isValidInstagramUrl(url) {
  const patterns = [
    /https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|story|stories|tv)\/[\w\-\.]+/i,
    /https?:\/\/instagram\.com\/(p|reel|reels|story|stories|tv)\/[\w\-\.]+/i,
    /https?:\/\/(www\.)?instagr\.am\/(p|reel|reels|story|stories|tv)\/[\w\-\.]+/i
  ];
  return patterns.some(pattern => pattern.test(url));
}

async function downloadInstagram(url, updateProgress) {
  try {
    const tempDir = './temp/instagram';
    if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

    const timestamp = Date.now();

    // Try multiple Instagram downloader APIs first (they don't require yt-dlp)
    await updateProgress("🔍 Checking available APIs...", 20);
    
    const apis = [
      {
        name: 'igram',
        url: `https://igram.io/api/ajax`,
        method: 'POST',
        data: `q=${encodeURIComponent(url)}&t=media&lang=en`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      },
      {
        name: 'instasupreme',
        url: `https://instasupreme.com/api/instagram`,
        method: 'POST',
        data: { url: url },
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      },
      {
        name: 'igdownloader',
        url: `https://igdownloader.com/api/convert`,
        method: 'POST',
        data: `url=${encodeURIComponent(url)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      },
      {
        name: 'instagram-scraper',
        url: `https://www.instagramscraper.xyz/api/ig/media`,
        method: 'POST',
        data: { url: url },
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    ];

    let downloadUrl = null;
    let mediaType = null;
    let mediaInfo = {};

    for (let i = 0; i < apis.length; i++) {
      const api = apis[i];
      try {
        await updateProgress(`🔄 Trying ${api.name} API...`, 25 + (i * 10));
        
        let response;
        if (api.method === 'POST') {
          if (typeof api.data === 'string') {
            response = await axios.post(api.url, api.data, {
              headers: api.headers,
              timeout: 15000
            });
          } else {
            response = await axios.post(api.url, api.data, {
              headers: api.headers,
              timeout: 15000
            });
          }
        } else {
          response = await axios.get(api.url, {
            headers: api.headers,
            timeout: 15000
          });
        }

        if (response.data) {
          const data = response.data;
          
          // Parse response based on API
          if (api.name === 'igram') {
            if (data.data && data.data.medias) {
              const media = data.data.medias[0];
              downloadUrl = media.url;
              mediaType = media.type === 'image' ? 'image' : 'video';
              mediaInfo = {
                username: data.data.user?.username || 'instagram',
                caption: data.data.description || ''
              };
            }
          } else if (api.name === 'instasupreme') {
            if (data.downloadUrl) {
              downloadUrl = data.downloadUrl;
              mediaType = data.type || 'video';
              mediaInfo = {
                username: data.username || 'instagram',
                caption: data.caption || ''
              };
            }
          } else if (api.name === 'igdownloader') {
            if (data.url) {
              downloadUrl = data.url;
              mediaType = data.type || 'video';
              mediaInfo = {
                username: data.username || 'instagram',
                caption: data.caption || ''
              };
            }
          } else if (api.name === 'instagram-scraper') {
            if (data.url) {
              downloadUrl = data.url;
              mediaType = data.type || 'video';
              mediaInfo = {
                username: data.author || 'instagram',
                caption: data.title || ''
              };
            }
          }

          if (downloadUrl) {
            console.log(`✅ Success with ${api.name} API`);
            await updateProgress(`✅ Found media via ${api.name}`, 70);
            break;
          }
        }
      } catch (e) {
        console.log(`${api.name} API failed:`, e.message);
        continue;
      }
    }

    // If no API worked, try yt-dlp as fallback
    if (!downloadUrl) {
      await updateProgress("🔄 Trying yt-dlp...", 70);
      const ytDlpResult = await downloadWithYtDlp(url, tempDir, timestamp);
      if (ytDlpResult.success) {
        return ytDlpResult;
      } else {
        // If yt-dlp also fails, try node module method
        await updateProgress("🔄 Trying alternative method...", 80);
        return await downloadWithNodeMethod(url, tempDir, timestamp);
      }
    }

    // Download the media
    await updateProgress("⬇️ Downloading media...", 80);
    
    // Determine file extension
    const extension = mediaType === 'image' ? 'jpg' : 'mp4';
    const mediaPath = `${tempDir}/instagram_${timestamp}.${extension}`;

    await downloadFile(downloadUrl, mediaPath);

    return {
      success: true,
      mediaPath,
      mediaType,
      mediaInfo
    };

  } catch (error) {
    console.error('Instagram download error:', error);
    return { success: false, error: error.message };
  }
}

async function downloadWithYtDlp(url, tempDir, timestamp) {
  try {
    // Check if yt-dlp is available
    const ytDlpPath = await findYtDlp();
    if (!ytDlpPath) {
      console.log('yt-dlp not found, trying alternative methods');
      return { success: false, error: 'yt-dlp not available' };
    }

    const outputTemplate = `${tempDir}/instagram_${timestamp}.%(ext)s`;
    
    // Get video info first
    const infoCommand = `"${ytDlpPath}" --dump-json "${url}"`;
    const { stdout: infoJson } = await execAsync(infoCommand, { timeout: 30000 });
    const info = JSON.parse(infoJson);

    let mediaType = 'video';
    let mediaPath = `${tempDir}/instagram_${timestamp}.mp4`;

    if (info._type === 'playlist' || info.entries) {
      // Carousel post with multiple images
      mediaType = 'carousel';
      const outputTemplate = `${tempDir}/instagram_${timestamp}_%(playlist_index)s.%(ext)s`;
      await execAsync(`"${ytDlpPath}" -o "${outputTemplate}" "${url}"`, { timeout: 60000 });
      
      // Find all downloaded files
      const files = fs.readdirSync(tempDir)
        .filter(file => file.startsWith(`instagram_${timestamp}_`))
        .sort() // Sort to maintain order
        .map(file => `${tempDir}/${file}`);
      
      mediaPath = files;
    } else if (info.ext === 'jpg' || info.ext === 'png' || info.ext === 'webp') {
      // Single image
      mediaType = 'image';
      mediaPath = `${tempDir}/instagram_${timestamp}.${info.ext}`;
      await execAsync(`"${ytDlpPath}" -o "${mediaPath}" "${url}"`, { timeout: 60000 });
    } else {
      // Video
      await execAsync(`"${ytDlpPath}" -f "best[ext=mp4]" -o "${mediaPath}" "${url}"`, { timeout: 60000 });
    }

    return {
      success: true,
      mediaPath,
      mediaType,
      mediaInfo: {
        username: info.uploader || 'instagram',
        caption: info.description || info.title || ''
      }
    };
  } catch (error) {
    console.error('yt-dlp download failed:', error.message);
    return { success: false, error: 'yt-dlp failed: ' + error.message };
  }
}

async function findYtDlp() {
  const possiblePaths = [
    'yt-dlp',
    'yt-dlp.exe',
    './yt-dlp',
    './yt-dlp.exe',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    process.cwd() + '/yt-dlp',
    process.cwd() + '/yt-dlp.exe'
  ];

  for (const path of possiblePaths) {
    try {
      await execAsync(`"${path}" --version`);
      console.log(`Found yt-dlp at: ${path}`);
      return path;
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function downloadWithNodeMethod(url, tempDir, timestamp) {
  try {
    // Try using instagram-url library as fallback
    const response = await axios.get(`https://api.trace.moe/instagram?url=${encodeURIComponent(url)}`, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data && response.data.url) {
      const mediaPath = `${tempDir}/instagram_${timestamp}.mp4`;
      await downloadFile(response.data.url, mediaPath);
      
      return {
        success: true,
        mediaPath,
        mediaType: 'video',
        mediaInfo: {
          username: 'instagram',
          caption: ''
        }
      };
    }
    
    return { success: false, error: 'All download methods failed' };
  } catch (error) {
    return { success: false, error: 'Node method failed: ' + error.message };
  }
}

async function downloadFile(url, filePath) {
  const writer = createWriteStream(filePath);
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
    timeout: 60000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.instagram.com/',
      'Origin': 'https://www.instagram.com'
    }
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// Helper function to cleanup files
function cleanupFiles(mediaPath, mediaType) {
  try {
    if (Array.isArray(mediaPath)) {
      mediaPath.forEach(path => {
        if (existsSync(path)) {
          fs.unlinkSync(path);
          console.log(`🧹 Cleaned up: ${path}`);
        }
      });
    } else {
      if (existsSync(mediaPath)) {
        fs.unlinkSync(mediaPath);
        console.log(`🧹 Cleaned up: ${mediaPath}`);
      }
    }
  } catch (cleanupError) {
    console.log('Cleanup error:', cleanupError.message);
  }
}