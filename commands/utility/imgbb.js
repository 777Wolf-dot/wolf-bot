














// import axios from "axios";
// import { downloadMediaMessage } from "@whiskeysockets/baileys";

// export default {
//   name: "imgbb",
//   description: "Convert replied image to ImgBB URL directly",

//   async execute(sock, m, args) {
//     const jid = m.key.remoteJid;

//     try {
//       // Check if message is a reply to an image
//       const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
//       if (!quoted?.imageMessage) {
//         return sock.sendMessage(
//           jid,
//           {
//             text: `📸 *ImgBB URL Generator*\n\nReply to an image with *${global.prefix}imgbb* to get a direct URL.`
//           },
//           { quoted: m }
//         );
//       }

//       // Load API key
//       const apiKey = process.env.IMGBB_API_KEY || global.IMGBB_API_KEY;
//       if (!apiKey) {
//         return sock.sendMessage(
//           jid,
//           {
//             text: `❌ *ImgBB API Key Missing*\nAdd this in your .env:\n\nIMGBB_API_KEY=YOUR_KEY_HERE`
//           },
//           { quoted: m }
//         );
//       }

//       // Acknowledgement message
//       const processingMsg = await sock.sendMessage(
//         jid,
//         { text: "⏳ *Downloading image from WhatsApp...*" },
//         { quoted: m }
//       );

//       // ⭐ FIXED: Use Baileys decryption, NOT axios
//       let imageBuffer;
//       try {
//         console.log("📥 Downloading via Baileys decryption...");

//         imageBuffer = await downloadMediaMessage(
//           { message: quoted },
//           "buffer",
//           {}
//         );

//         if (!imageBuffer || imageBuffer.length < 150) {
//           throw new Error("Image buffer is empty or corrupted");
//         }

//       } catch (err) {
//         console.log("❌ Download Error:", err.message);
//         return sock.sendMessage(
//           jid,
//           { text: "❌ *Failed to download image from WhatsApp (decryption failed)*" },
//           { quoted: m }
//         );
//       }

//       // Update status
//       await sock.sendMessage(
//         jid,
//         {
//           text: `📤 *Uploading ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB to ImgBB...*`,
//           edit: processingMsg.key
//         }
//       );

//       // Upload
//       const result = await uploadToImgBB(imageBuffer, apiKey);

//       if (!result.success) {
//         return sock.sendMessage(
//           jid,
//           {
//             text: `❌ *ImgBB Upload Failed*\n\n${result.error}`,
//             edit: processingMsg.key
//           }
//         );
//       }

//       // Success
//       return sock.sendMessage(
//         jid,
//         {
//           text:
//             `✅ *ImgBB Upload Successful!*\n\n` +
//             `🌐 *Direct URL:*\n${result.url}\n\n` +
//             `🆔 *Image ID:* ${result.id}\n` +
//             `🗑 *Delete URL:* ${result.deleteUrl}\n\n` +
//             ``,
//           edit: processingMsg.key
//         }
//       );

//     } catch (err) {
//       console.error("❌ [IMGBB ERROR]:", err.message);
//       return sock.sendMessage(
//         jid,
//         { text: `❌ Unexpected error: ${err.message}` },
//         { quoted: m }
//       );
//     }
//   }
// };

// // ⭐ FIXED ImgBB uploader (base64)
// async function uploadToImgBB(buffer, apiKey) {
//   try {
//     const base64 = buffer.toString("base64");

//     const params = new URLSearchParams();
//     params.append("key", apiKey);
//     params.append("image", base64);

//     const res = await axios.post(
//       "https://api.imgbb.com/1/upload",
//       params.toString(),
//       {
//         headers: { "Content-Type": "application/x-www-form-urlencoded" },
//         timeout: 30000
//       }
//     );

//     if (res.data.success) {
//       return {
//         success: true,
//         url: res.data.data.url,
//         id: res.data.data.id,
//         deleteUrl: res.data.data.delete_url
//       };
//     }

//     return {
//       success: false,
//       error: res.data.error?.message || "Unknown ImgBB error"
//     };

//   } catch (e) {
//     console.log("❌ ImgBB Error:", e.response?.data || e.message);

//     const code = e.response?.data?.error?.code;
//     let msg = "Upload failed";

//     if (code === 310) msg = "Invalid image source / corrupted data";
//     if (code === 100) msg = "No image data received";
//     if (code === 110) msg = "Invalid image format";
//     if (code === 120) msg = "Image too large";
//     if (code === 130) msg = "Upload timeout";

//     return { success: false, error: msg };
//   }
// }
























import axios from "axios";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize environment variables
function initEnvironment() {
    console.log('🌍 Initializing environment...');
    
    // List of possible .env file locations
    const envPaths = [
        '.env',
        path.join(__dirname, '.env'),
        path.join(__dirname, '../.env'),
        path.join(__dirname, '../../.env'),
        path.join(__dirname, '../../../.env'),
        path.join(process.cwd(), '.env'),
        '/etc/secrets/.env',  // For some hosting platforms
        '/run/secrets/.env'   // For Docker secrets
    ];
    
    // Try each location
    for (const envPath of envPaths) {
        try {
            if (fs.existsSync(envPath)) {
                console.log(`📁 Loading .env from: ${envPath}`);
                dotenv.config({ path: envPath, override: true });
                break;
            }
        } catch (err) {
            // Continue to next path
        }
    }
    
    // Also load from default .env location
    try {
        dotenv.config();
    } catch (err) {
        // Ignore if no .env file
    }
    
    // Debug: Show what environment variables we have
    console.log('🔍 Environment check:');
    console.log('- Current directory:', process.cwd());
    console.log('- File directory:', __dirname);
    console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
    
    // Check for IMGBB API key in various formats
    const possibleKeys = [
        'IMGBB_API_KEY',
        'IMGBB_KEY',
        'IMG_BB_API_KEY',
        'IMG_BB_KEY',
        'IMAGE_API_KEY',
        'IMG_API_KEY',
        'IMG_UPLOAD_KEY'
    ];
    
    for (const key of possibleKeys) {
        if (process.env[key]) {
            console.log(`✅ Found API key as ${key}: ${process.env[key].substring(0, 5)}...`);
            break;
        }
    }
    
    // Check global variable
    if (global.IMGBB_API_KEY) {
        console.log('✅ Found API key in global.IMGBB_API_KEY');
    }
}

// Initialize environment on module load
initEnvironment();

// Load ImgBB config from file (non-async version)
function loadImgbbConfig() {
    try {
        // Try multiple config file locations
        const configPaths = [
            './config.json',
            './imgbb_config.json',
            path.join(__dirname, 'config.json'),
            path.join(__dirname, 'imgbb_config.json'),
            path.join(process.cwd(), 'config.json'),
            path.join(process.cwd(), 'imgbb_config.json'),
        ];
        
        for (const configPath of configPaths) {
            try {
                if (fs.existsSync(configPath)) {
                    const data = fs.readFileSync(configPath, 'utf8');
                    const configData = JSON.parse(data);
                    console.log(`📁 Loaded config from: ${configPath}`);
                    
                    // Check various key names in config
                    const possibleConfigKeys = ['imgbb_api_key', 'IMGBB_API_KEY', 'imgbbKey', 'api_key'];
                    for (const key of possibleConfigKeys) {
                        if (configData[key]) {
                            return configData[key];
                        }
                    }
                }
            } catch (err) {
                // Continue to next path
            }
        }
    } catch (error) {
        console.error('Error loading config file:', error.message);
    }
    return null;
}

// Get API key from multiple sources
function getApiKey() {
    let apiKey = null;
    const sources = [];
    
    // Source 1: Check environment variables (various names)
    const envKeyNames = [
        'IMGBB_API_KEY',
        'IMGBB_KEY',
        'IMG_BB_API_KEY',
        'IMG_BB_KEY',
        'IMAGE_API_KEY',
        'IMG_API_KEY'
    ];
    
    for (const keyName of envKeyNames) {
        if (process.env[keyName]) {
            apiKey = process.env[keyName];
            sources.push(`process.env.${keyName}`);
            break;
        }
    }
    
    // Source 2: Check global variable
    if (!apiKey && global.IMGBB_API_KEY) {
        apiKey = global.IMGBB_API_KEY;
        sources.push('global.IMGBB_API_KEY');
    }
    
    // Source 3: Load from config file
    if (!apiKey) {
        const configKey = loadImgbbConfig();
        if (configKey) {
            apiKey = configKey;
            sources.push('config file');
        }
    }
    
    // Source 4: Check for .env file in parent directories (emergency)
    if (!apiKey) {
        try {
            // Look for .env files manually
            const searchPaths = [
                '.env',
                '../.env',
                '../../.env',
                '../../../.env'
            ];
            
            for (const envPath of searchPaths) {
                const fullPath = path.join(process.cwd(), envPath);
                if (fs.existsSync(fullPath)) {
                    const envContent = fs.readFileSync(fullPath, 'utf8');
                    const lines = envContent.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('IMGBB_API_KEY=')) {
                            apiKey = line.split('=')[1].trim();
                            sources.push(`file: ${fullPath}`);
                            break;
                        }
                    }
                    if (apiKey) break;
                }
            }
        } catch (error) {
            // Ignore errors
        }
    }
    
    if (apiKey) {
        console.log(`🔑 API Key loaded from: ${sources.join(', ')}`);
    } else {
        console.log('⚠️ No API key found from any source');
    }
    
    return apiKey;
}

export default {
    name: "imgbb",
    description: "Convert replied image to ImgBB URL directly",
    alias: ["upload", "imageurl", "imgurl", "img"],

    async execute(sock, m, args) {
        const jid = m.key.remoteJid;
        const chatId = jid;
        const prefix = global.prefix || '.';
        
        try {
            // Check if message is a reply to an image
            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted?.imageMessage) {
                const helpMsg = `📸 *ImgBB URL Generator*\n\n` +
                               `*Usage:*\n` +
                               `Reply to an image with:\n` +
                               `${prefix}imgbb\n\n` +
                               `*Examples:*\n` +
                               `1. Reply to image → ${prefix}imgbb\n` +
                               `2. ${prefix}upload (alternative command)\n\n` +
                               `*Note:* Works with images only.`;
                
                return sock.sendMessage(
                    jid,
                    { text: helpMsg },
                    { quoted: m }
                );
            }

            // Get API key
            const apiKey = getApiKey();
            
            // If no API key found, provide detailed help
            if (!apiKey) {
                const helpMessage = `❌ *ImgBB API Key Required*\n\n` +
                                   `To use this command, you need an ImgBB API key.\n\n` +
                                   `*Setup Instructions:*\n\n` +
                                   `1. *Get API Key:*\n` +
                                   `   • Visit: https://api.imgbb.com/\n` +
                                   `   • Sign up (free)\n` +
                                   `   • Get your API key\n\n` +
                                   `2. *Add API Key (Choose one):*\n\n` +
                                   `   *Option A: .env file*\n` +
                                   `   Create \`.env\` file:\n` +
                                   `   \`\`\`\nIMGBB_API_KEY=your_key_here\n\`\`\`\n\n` +
                                   `   *Option B: Environment Variable*\n` +
                                   `   Set in your hosting panel:\n` +
                                   `   \`IMGBB_API_KEY=your_key_here\`\n\n` +
                                   `   *Option C: Config File*\n` +
                                   `   Create \`imgbb_config.json\`:\n` +
                                   `   \`\`\`json\n{"imgbb_api_key": "your_key_here"}\n\`\`\`\n\n` +
                                   `   *Option D: Test Mode*\n` +
                                   `   Pass key as argument:\n` +
                                   `   ${prefix}imgbb your_key_here`;
                
                // Check if user provided API key as argument
                if (args.length > 0 && args[0].length > 20) {
                    // Use provided key (for testing)
                    const testKey = args[0];
                    console.log(`⚠️ Using API key from command argument: ${testKey.substring(0, 10)}...`);
                    
                    return await processImageUpload(sock, m, jid, quoted, testKey, true);
                }
                
                return sock.sendMessage(
                    jid,
                    { text: helpMessage },
                    { quoted: m }
                );
            }

            // Process image upload
            return await processImageUpload(sock, m, jid, quoted, apiKey, false);
            
        } catch (err) {
            console.error("❌ [IMGBB MAIN ERROR]:", err.message);
            
            const errorMessage = `❌ *Unexpected Error*\n\n` +
                               `Error: ${err.message}\n\n` +
                               `*Please try:*\n` +
                               `1. Send a different image\n` +
                               `2. Check internet connection\n` +
                               `3. Try again in a moment`;
            
            return sock.sendMessage(
                jid,
                { text: errorMessage },
                { quoted: m }
            );
        }
    }
};

// Main image upload processing function
async function processImageUpload(sock, m, jid, quoted, apiKey, isTestMode = false) {
    try {
        // Send initial processing message
        const processingMsg = await sock.sendMessage(
            jid,
            { 
                text: `⏳ *Processing Image...*\n\n` +
                     `• Downloading from WhatsApp\n` +
                     `• Preparing upload\n` +
                     `${isTestMode ? '• ⚠️ Test mode (using provided key)\n' : ''}` +
                     `• Please wait...`
            },
            { quoted: m }
        );

        // Download image
        let imageBuffer;
        try {
            console.log("📥 Downloading image from WhatsApp...");
            
            // Create message object for download
            const messageForDownload = {
                message: quoted,
                key: m.key
            };
            
            imageBuffer = await downloadMediaMessage(
                messageForDownload,
                "buffer",
                {},
                {
                    reuploadRequest: sock.updateMediaMessage
                }
            );

            if (!imageBuffer || imageBuffer.length < 100) {
                throw new Error("Invalid image data received");
            }

            const fileSizeKB = (imageBuffer.length / 1024).toFixed(2);
            console.log(`✅ Downloaded image: ${fileSizeKB}KB`);

            // Update status
            await sock.sendMessage(
                jid,
                {
                    text: `📤 *Uploading to ImgBB...*\n\n` +
                         `• Size: ${fileSizeKB}KB\n` +
                         `• Connecting to ImgBB...\n` +
                         `• This may take a few seconds`,
                    edit: processingMsg.key
                }
            );

        } catch (downloadError) {
            console.log("❌ Download Error:", downloadError.message);
            
            return sock.sendMessage(
                jid,
                { 
                    text: `❌ *Failed to download image*\n\n` +
                         `Error: ${downloadError.message}\n\n` +
                         `*Possible reasons:*\n` +
                         `• Image is corrupted\n` +
                         `• Network issue\n` +
                         `• Try a different image`,
                    edit: processingMsg.key
                }
            );
        }

        // Upload to ImgBB
        const uploadResult = await uploadToImgBB(imageBuffer, apiKey);

        if (!uploadResult.success) {
            console.log('❌ ImgBB Upload Failed:', uploadResult.error);
            
            let errorMsg = `❌ *Upload Failed*\n\n`;
            
            if (uploadResult.error.includes('invalid') || uploadResult.error.includes('key')) {
                errorMsg += `*Invalid API Key*\n\n`;
                errorMsg += `The API key appears to be invalid.\n`;
                errorMsg += `Please check and update your API key.`;
            } else if (uploadResult.error.includes('large')) {
                errorMsg += `*File Too Large*\n\n`;
                errorMsg += `ImgBB has size limits (max 32MB).\n`;
                errorMsg += `Try a smaller image.`;
            } else if (uploadResult.error.includes('timeout')) {
                errorMsg += `*Connection Timeout*\n\n`;
                errorMsg += `ImgBB servers are slow to respond.\n`;
                errorMsg += `Please try again.`;
            } else {
                errorMsg += `Error: ${uploadResult.error}\n\n`;
                errorMsg += `Please try again with a different image.`;
            }
            
            return sock.sendMessage(
                jid,
                {
                    text: errorMsg,
                    edit: processingMsg.key
                }
            );
        }

        // SUCCESS - Send results
        console.log('✅ ImgBB Upload Successful:', uploadResult.url);
        
        const successMessage = `✅ *Image Uploaded Successfully!*\n\n` +
                             `🌐 *Direct URL:*\n${uploadResult.url}\n\n` +
                             `📏 *Size:* ${uploadResult.size || 'N/A'}\n` +
                             `📐 *Dimensions:* ${uploadResult.width || '?'}×${uploadResult.height || '?'}\n` +
                             `🆔 *Image ID:* ${uploadResult.id}\n` +
                             `⚡ *Upload Time:* ${uploadResult.time || 0}ms\n\n` +
                             `${isTestMode ? '⚠️ *Note:* Using test API key from command\n\n' : ''}` +
                             `📋 *Quick Actions:*\n` +
                             `• Copy URL: Long press\n` +
                             `• Share: Forward this message\n` +
                             `• Open: Tap the link`;
        
        await sock.sendMessage(
            jid,
            {
                text: successMessage,
                edit: processingMsg.key
            }
        );

        // Optional: Send image preview
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await sock.sendMessage(
                jid,
                {
                    image: imageBuffer,
                    caption: `📸 Preview of uploaded image\n\nURL: ${uploadResult.url}`
                }
            );
        } catch (previewError) {
            console.log('⚠️ Could not send preview:', previewError.message);
        }

    } catch (error) {
        console.error("❌ [UPLOAD PROCESS ERROR]:", error.message);
        
        return sock.sendMessage(
            jid,
            { 
                text: `❌ *Upload Process Error*\n\n` +
                     `Error: ${error.message}\n\n` +
                     `Please try again later.`
            }
        );
    }
}

// ImgBB upload function
async function uploadToImgBB(buffer, apiKey) {
    const startTime = Date.now();
    
    try {
        console.log(`📤 Uploading ${buffer.length} bytes to ImgBB...`);
        
        // Convert to base64
        const base64 = buffer.toString("base64");
        console.log(`📊 Base64 size: ${(base64.length / 1024).toFixed(2)}KB`);
        
        // Prepare form data
        const formData = new FormData();
        formData.append("key", apiKey);
        formData.append("image", base64);
        
        // Upload with axios
        const response = await axios.post(
            "https://api.imgbb.com/1/upload",
            `key=${apiKey}&image=${encodeURIComponent(base64)}`,
            {
                headers: { 
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                timeout: 60000 // 60 second timeout
            }
        );

        const uploadTime = Date.now() - startTime;
        console.log(`✅ ImgBB response in ${uploadTime}ms`);
        
        if (response.data.success) {
            const data = response.data.data;
            return {
                success: true,
                url: data.url,
                display_url: data.display_url,
                id: data.id,
                deleteUrl: data.delete_url,
                size: data.size,
                width: data.width,
                height: data.height,
                time: uploadTime
            };
        } else {
            return {
                success: false,
                error: response.data.error?.message || "Unknown API error"
            };
        }

    } catch (error) {
        const uploadTime = Date.now() - startTime;
        console.log(`❌ Upload error after ${uploadTime}ms:`, error.message);
        
        let errorMessage = "Network error";
        
        if (error.response) {
            // Server responded with error
            const status = error.response.status;
            const data = error.response.data;
            
            if (status === 400) errorMessage = "Bad request - Invalid parameters";
            else if (status === 401) errorMessage = "Invalid API key";
            else if (status === 403) errorMessage = "Forbidden - Check API key";
            else if (status === 413) errorMessage = "File too large (max 32MB)";
            else if (status === 429) errorMessage = "Rate limited - Try again later";
            else if (status === 500) errorMessage = "ImgBB server error";
            else if (data?.error?.message) errorMessage = data.error.message;
            else errorMessage = `HTTP ${status}`;
            
        } else if (error.request) {
            errorMessage = "No response from ImgBB";
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = "Connection timeout";
        } else {
            errorMessage = error.message;
        }
        
        return {
            success: false,
            error: errorMessage,
            time: uploadTime
        };
    }
}