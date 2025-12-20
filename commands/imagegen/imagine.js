import fs from 'fs';
import path from 'path';
import { writeFile, unlink } from 'fs/promises';
import OpenAI from 'openai';
import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';
import { createCanvas, loadImage, registerFont } from 'canvas';
import sizeOf from 'image-size';

// Load environment variables
const openaiApiKey = process.env.OPENAI_API_KEY;

// Check if OpenAI API key is available
if (!openaiApiKey) {
    console.error('❌ OPENAI_API_KEY not found in .env file!');
    console.error('Please add: OPENAI_API_KEY=your_openai_api_key_here');
}

// Initialize OpenAI client
const openai = openaiApiKey ? new OpenAI({
    apiKey: openaiApiKey
}) : null;

// Configuration
const CONFIG = {
    MAX_PROMPT_LENGTH: 1000,
    DEFAULT_SIZE: '1024x1024',
    AVAILABLE_SIZES: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
    DEFAULT_QUALITY: 'standard', // standard or hd
    DEFAULT_STYLE: 'vivid', // vivid or natural
    MAX_IMAGES_PER_REQUEST: 4,
    DEFAULT_IMAGES: 1,
    RATE_LIMIT_PER_USER: 10, // requests per hour
    RATE_LIMIT_PER_GROUP: 30, // requests per hour
    CACHE_DIR: './imagine_cache',
    FONT_PATH: './fonts/arial.ttf' // Optional: add a font file for watermark
};

// Ensure cache directory exists
if (!fs.existsSync(CONFIG.CACHE_DIR)) {
    fs.mkdirSync(CONFIG.CACHE_DIR, { recursive: true });
}

// Load fonts if available
try {
    if (fs.existsSync(CONFIG.FONT_PATH)) {
        registerFont(CONFIG.FONT_PATH, { family: 'Arial' });
    }
} catch (error) {
    console.log('Font not available, using default');
}

// Rate limiting storage
let rateLimit = {};

// Clean old rate limit entries
function cleanRateLimit() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    for (const key in rateLimit) {
        rateLimit[key] = rateLimit[key].filter(time => time > oneHourAgo);
        if (rateLimit[key].length === 0) {
            delete rateLimit[key];
        }
    }
}

// Check rate limit
function checkRateLimit(userId, groupId = null) {
    cleanRateLimit();
    
    const userKey = `user:${userId}`;
    const groupKey = groupId ? `group:${groupId}` : null;
    
    // Check user limit
    if (!rateLimit[userKey]) rateLimit[userKey] = [];
    if (rateLimit[userKey].length >= CONFIG.RATE_LIMIT_PER_USER) {
        const oldestRequest = rateLimit[userKey][0];
        const timeLeft = Math.ceil((oldestRequest + (60 * 60 * 1000) - Date.now()) / 60000);
        return {
            allowed: false,
            message: `⏳ Rate limit exceeded! Please wait ${timeLeft} minutes. (${CONFIG.RATE_LIMIT_PER_USER} requests/hour)`
        };
    }
    
    // Check group limit
    if (groupKey) {
        if (!rateLimit[groupKey]) rateLimit[groupKey] = [];
        if (rateLimit[groupKey].length >= CONFIG.RATE_LIMIT_PER_GROUP) {
            return {
                allowed: false,
                message: `⏳ Group rate limit exceeded! Please try again later. (${CONFIG.RATE_LIMIT_PER_GROUP} requests/hour)`
            };
        }
    }
    
    return { allowed: true };
}

// Add to rate limit
function addToRateLimit(userId, groupId = null) {
    const now = Date.now();
    const userKey = `user:${userId}`;
    const groupKey = groupId ? `group:${groupId}` : null;
    
    if (!rateLimit[userKey]) rateLimit[userKey] = [];
    rateLimit[userKey].push(now);
    
    if (groupKey) {
        if (!rateLimit[groupKey]) rateLimit[groupKey] = [];
        rateLimit[groupKey].push(now);
    }
}

// Generate image with DALL-E 3
async function generateImageWithDalle(prompt, options = {}) {
    const {
        size = CONFIG.DEFAULT_SIZE,
        quality = CONFIG.DEFAULT_QUALITY,
        style = CONFIG.DEFAULT_STYLE,
        numImages = CONFIG.DEFAULT_IMAGES
    } = options;
    
    if (!openai) {
        throw new Error('OpenAI API key not configured');
    }
    
    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: Math.min(numImages, 1), // DALL-E 3 only supports n=1
            size: size,
            quality: quality,
            style: style,
            response_format: "url"
        });
        
        return response.data;
    } catch (error) {
        console.error('DALL-E API Error:', error);
        throw new Error(`OpenAI API Error: ${error.message}`);
    }
}

// Generate image with DALL-E 2 (for multiple images)
async function generateImageWithDalle2(prompt, options = {}) {
    const {
        size = '1024x1024',
        numImages = 1
    } = options;
    
    if (!openai) {
        throw new Error('OpenAI API key not configured');
    }
    
    try {
        const response = await openai.images.generate({
            model: "dall-e-2",
            prompt: prompt,
            n: Math.min(numImages, CONFIG.MAX_IMAGES_PER_REQUEST),
            size: size,
            response_format: "url"
        });
        
        return response.data;
    } catch (error) {
        console.error('DALL-E 2 API Error:', error);
        throw new Error(`OpenAI API Error: ${error.message}`);
    }
}

// Download image from URL
async function downloadImage(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000
        });
        
        const buffer = Buffer.from(response.data);
        const fileInfo = await fileTypeFromBuffer(buffer);
        
        return {
            buffer,
            mimetype: fileInfo ? fileInfo.mime : 'image/png',
            extension: fileInfo ? fileInfo.ext : 'png'
        };
    } catch (error) {
        console.error('Download error:', error);
        throw new Error('Failed to download generated image');
    }
}

// Add watermark to image
async function addWatermark(imageBuffer, prompt, userId) {
    try {
        // Load the image
        const image = await loadImage(imageBuffer);
        
        // Create canvas with same dimensions
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        
        // Draw original image
        ctx.drawImage(image, 0, 0);
        
        // Watermark settings
        const watermarkText = `Generated by AI • @${userId}`;
        const fontSize = Math.max(12, image.width / 50);
        
        // Set font
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        // Add text shadow for better readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Draw watermark
        const padding = 10;
        ctx.fillText(watermarkText, image.width - padding, image.height - padding);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Convert to buffer
        return canvas.toBuffer('image/png');
    } catch (error) {
        console.error('Watermark error:', error);
        // Return original if watermark fails
        return imageBuffer;
    }
}

// Cache generated image
async function cacheImage(imageBuffer, prompt, options) {
    const cacheKey = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cacheFile = path.join(CONFIG.CACHE_DIR, `${cacheKey}.png`);
    
    await writeFile(cacheFile, imageBuffer);
    
    // Store metadata
    const metadata = {
        prompt,
        options,
        timestamp: Date.now(),
        cacheKey
    };
    
    const metadataFile = path.join(CONFIG.CACHE_DIR, `${cacheKey}.json`);
    await writeFile(metadataFile, JSON.stringify(metadata, null, 2));
    
    return cacheKey;
}

// Get cached image
async function getCachedImage(cacheKey) {
    const cacheFile = path.join(CONFIG.CACHE_DIR, `${cacheKey}.png`);
    
    if (fs.existsSync(cacheFile)) {
        return fs.readFileSync(cacheFile);
    }
    
    return null;
}

// Clean old cache files (older than 24 hours)
async function cleanOldCache() {
    try {
        const files = fs.readdirSync(CONFIG.CACHE_DIR);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const metadataFile = path.join(CONFIG.CACHE_DIR, file);
                const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
                
                if (now - metadata.timestamp > maxAge) {
                    // Delete both image and metadata
                    const cacheKey = file.replace('.json', '');
                    const imageFile = path.join(CONFIG.CACHE_DIR, `${cacheKey}.png`);
                    
                    if (fs.existsSync(imageFile)) {
                        await unlink(imageFile);
                    }
                    await unlink(metadataFile);
                }
            }
        }
    } catch (error) {
        console.error('Cache cleanup error:', error);
    }
}

// Generate progress message
function getProgressMessage(step, totalSteps, prompt = '') {
    const progressBarLength = 10;
    const progress = Math.floor((step / totalSteps) * progressBarLength);
    const bar = '█'.repeat(progress) + '░'.repeat(progressBarLength - progress);
    const percentage = Math.floor((step / totalSteps) * 100);
    
    const messages = [
        `🤖 *AI Image Generation*\n\n📝 **Prompt:** ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}\n\n${bar} ${percentage}%`,
        `🎨 Generating your image...\n\n${bar} ${percentage}%`,
        `📥 Downloading image...\n\n${bar} ${percentage}%`,
        `✨ Almost done...\n\n${bar} ${percentage}%`
    ];
    
    return messages[step - 1] || messages[messages.length - 1];
}

export default {
    name: 'imagine',
    description: 'Generate AI images using DALL-E',
    category: 'ai',
    async execute(sock, msg, args, metadata) {
        const chatId = msg.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        
        // Get user ID
        let userId = msg.key.participant || (msg.key.fromMe ? sock.user.id : msg.key.remoteJid);
        userId = userId.split('@')[0];
        
        // Check OpenAI API key
        if (!openaiApiKey) {
            return sock.sendMessage(chatId, { 
                text: '❌ *OpenAI API Key Missing!*\n\nPlease add your OpenAI API key to the .env file:\n\n`OPENAI_API_KEY=your_key_here`\n\nGet your API key from: https://platform.openai.com/api-keys' 
            }, { quoted: msg });
        }
        
        // Check if prompt is provided
        const prompt = args.join(' ').trim();
        
        if (!prompt && args[0] !== 'styles' && args[0] !== 'sizes' && args[0] !== 'help') {
            return sock.sendMessage(chatId, { 
                text: '🎨 *AI Image Generator*\n\nUsage: `.imagine [prompt] [options]`\n\n*Examples:*\n• `.imagine a cute cat wearing sunglasses`\n• `.imagine sunset over mountains --size 1792x1024`\n• `.imagine fantasy castle --quality hd --style natural`\n• `.imagine abstract art --num 2 --model dalle2`\n\n*Options:*\n• `--size [256x256|512x512|1024x1024|1792x1024|1024x1792]`\n• `--quality [standard|hd]` (DALL-E 3 only)\n• `--style [vivid|natural]` (DALL-E 3 only)\n• `--num [1-4]` (number of images, DALL-E 2 only)\n• `--model [dalle3|dalle2]` (default: dalle3)\n• `--nowatermark` (disable watermark)\n\n*Commands:*\n• `.imagine styles` - Show available styles\n• `.imagine sizes` - Show available sizes\n• `.imagine help` - Show this help' 
            }, { quoted: msg });
        }
        
        // Handle help commands
        if (args[0] === 'help') {
            return sock.sendMessage(chatId, { 
                text: `🖼️ *AI Image Generation Help*\n\n*Basic Usage:*\n\`.imagine [your prompt here]\`\n\n*Advanced Options:*\n• \`--size SIZE\` - Image dimensions\n• \`--quality QUALITY\` - Image quality (standard/hd)\n• \`--style STYLE\` - Art style (vivid/natural)\n• \`--num NUMBER\` - Number of images (1-4, DALL-E 2 only)\n• \`--model MODEL\` - AI model (dalle3/dalle2)\n• \`--nowatermark\` - Disable watermark\n\n*Examples:*\n• \`.imagine cyberpunk city at night --size 1792x1024\`\n• \`.imagine portrait of a warrior --quality hd --style natural\`\n• \`.imagine cute animals --num 4 --model dalle2\`\n\n*Note:* DALL-E 3 produces higher quality images but only one at a time. DALL-E 2 can generate multiple images.` 
            }, { quoted: msg });
        }
        
        if (args[0] === 'styles') {
            return sock.sendMessage(chatId, { 
                text: `🎨 *Available Styles*\n\n1. *Vivid* (Default)\n   - Hyper-realistic, dramatic\n   - Bold colors, high contrast\n   - Great for fantasy, sci-fi\n\n2. *Natural*\n   - More realistic, subtle\n   - Natural lighting, softer colors\n   - Good for portraits, landscapes\n\n*Usage:*\n\`.imagine [prompt] --style vivid\`\n\`.imagine [prompt] --style natural\`` 
            }, { quoted: msg });
        }
        
        if (args[0] === 'sizes') {
            return sock.sendMessage(chatId, { 
                text: `📏 *Available Sizes*\n\n*Square:*\n• 256x256 (Small)\n• 512x512 (Medium)\n• 1024x1024 (Large - Default)\n\n*Landscape:*\n• 1792x1024 (Widescreen)\n\n*Portrait:*\n• 1024x1792 (Vertical)\n\n*Usage:*\n\`.imagine [prompt] --size 1792x1024\`\n\`.imagine [prompt] --size 1024x1792\`\n\n*Note:* Larger sizes may take longer to generate.` 
            }, { quoted: msg });
        }
        
        // Check rate limit
        const rateLimitCheck = checkRateLimit(userId, isGroup ? chatId : null);
        if (!rateLimitCheck.allowed) {
            return sock.sendMessage(chatId, { 
                text: rateLimitCheck.message 
            }, { quoted: msg });
        }
        
        // Parse options from prompt
        let cleanPrompt = prompt;
        const options = {
            size: CONFIG.DEFAULT_SIZE,
            quality: CONFIG.DEFAULT_QUALITY,
            style: CONFIG.DEFAULT_STYLE,
            numImages: CONFIG.DEFAULT_IMAGES,
            model: 'dalle3',
            watermark: true
        };
        
        // Parse flags
        const flagRegex = /--(\w+)(?:\s+([^\s-]+(?:\\s+[^\s-]+)*))?/g;
        let match;
        const flags = [];
        
        while ((match = flagRegex.exec(prompt)) !== null) {
            flags.push({ flag: match[1], value: match[2] || true });
        }
        
        // Remove flags from prompt
        cleanPrompt = prompt.replace(/--\w+(?:\s+[^\s-]+(?:\\s+[^\s-]+)*)?/g, '').trim();
        
        // Process flags
        for (const { flag, value } of flags) {
            switch (flag.toLowerCase()) {
                case 'size':
                    if (CONFIG.AVAILABLE_SIZES.includes(value)) {
                        options.size = value;
                    }
                    break;
                case 'quality':
                    if (['standard', 'hd'].includes(value.toLowerCase())) {
                        options.quality = value.toLowerCase();
                    }
                    break;
                case 'style':
                    if (['vivid', 'natural'].includes(value.toLowerCase())) {
                        options.style = value.toLowerCase();
                    }
                    break;
                case 'num':
                case 'number':
                case 'n':
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 1 && num <= CONFIG.MAX_IMAGES_PER_REQUEST) {
                        options.numImages = num;
                    }
                    break;
                case 'model':
                    if (['dalle3', 'dalle2'].includes(value.toLowerCase())) {
                        options.model = value.toLowerCase();
                    }
                    break;
                case 'nowatermark':
                    options.watermark = false;
                    break;
            }
        }
        
        // Validate prompt length
        if (cleanPrompt.length > CONFIG.MAX_PROMPT_LENGTH) {
            return sock.sendMessage(chatId, { 
                text: `❌ *Prompt too long!*\n\nMaximum ${CONFIG.MAX_PROMPT_LENGTH} characters.\n\nYour prompt: ${cleanPrompt.length} characters.\n\nPlease shorten your prompt.` 
            }, { quoted: msg });
        }
        
        // Send initial processing message
        const processingMsg = await sock.sendMessage(chatId, { 
            text: getProgressMessage(1, 4, cleanPrompt)
        }, { quoted: msg });
        
        try {
            // Update progress
            await sock.sendMessage(chatId, {
                text: getProgressMessage(2, 4, cleanPrompt)
            }, { quoted: msg });
            
            // Generate image
            let generatedImages;
            
            if (options.model === 'dalle2') {
                generatedImages = await generateImageWithDalle2(cleanPrompt, {
                    size: options.size,
                    numImages: options.numImages
                });
            } else {
                generatedImages = await generateImageWithDalle(cleanPrompt, {
                    size: options.size,
                    quality: options.quality,
                    style: options.style,
                    numImages: 1 // DALL-E 3 only supports 1 image
                });
            }
            
            // Update progress
            await sock.sendMessage(chatId, {
                text: getProgressMessage(3, 4, cleanPrompt)
            }, { quoted: msg });
            
            // Download and process images
            const imageBuffers = [];
            
            for (const imageData of generatedImages) {
                if (imageData.url) {
                    const downloaded = await downloadImage(imageData.url);
                    
                    // Add watermark if enabled
                    let finalBuffer = downloaded.buffer;
                    if (options.watermark) {
                        finalBuffer = await addWatermark(downloaded.buffer, cleanPrompt, userId);
                    }
                    
                    // Cache the image
                    const cacheKey = await cacheImage(finalBuffer, cleanPrompt, options);
                    
                    imageBuffers.push({
                        buffer: finalBuffer,
                        cacheKey,
                        prompt: cleanPrompt
                    });
                }
            }
            
            // Update progress
            await sock.sendMessage(chatId, {
                text: getProgressMessage(4, 4, cleanPrompt)
            }, { quoted: msg });
            
            // Delete progress messages
            try {
                await sock.sendMessage(chatId, {
                    delete: processingMsg.key
                });
            } catch (e) {}
            
            // Send generated images
            for (const [index, imageData] of imageBuffers.entries()) {
                const caption = options.numImages > 1 ? 
                    `🖼️ *Image ${index + 1}/${imageBuffers.length}*\n\n📝 **Prompt:** ${cleanPrompt}\n📏 **Size:** ${options.size}\n🎨 **Style:** ${options.style}\n✨ **Quality:** ${options.quality}\n🤖 **Model:** DALL-E ${options.model === 'dalle3' ? '3' : '2'}` :
                    `🎨 *AI Generated Image*\n\n📝 **Prompt:** ${cleanPrompt}\n📏 **Size:** ${options.size}\n🎨 **Style:** ${options.style}\n✨ **Quality:** ${options.quality}\n🤖 **Model:** DALL-E ${options.model === 'dalle3' ? '3' : '2'}\n\n💡 **Tip:** Use \`.imagine help\` for more options`;
                
                await sock.sendMessage(chatId, {
                    image: imageData.buffer,
                    caption: caption,
                    quoted: msg
                });
                
                // Small delay between sending multiple images
                if (index < imageBuffers.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // Add to rate limit
            addToRateLimit(userId, isGroup ? chatId : null);
            
            // Clean old cache periodically
            if (Math.random() < 0.1) { // 10% chance to clean cache
                await cleanOldCache();
            }
            
        } catch (error) {
            console.error('Image generation error:', error);
            
            // Delete progress message
            try {
                await sock.sendMessage(chatId, {
                    delete: processingMsg.key
                });
            } catch (e) {}
            
            // Send error message
            let errorMessage = '❌ *Image generation failed!*\n\n';
            
            if (error.message.includes('billing')) {
                errorMessage += 'OpenAI API billing issue. Please check your account balance.';
            } else if (error.message.includes('content policy')) {
                errorMessage += '⚠️ *Content Policy Violation*\n\nYour prompt may contain content that violates OpenAI\'s content policy. Please try a different prompt.';
            } else if (error.message.includes('rate limit')) {
                errorMessage += '⏳ *Rate limit exceeded!*\n\nPlease wait a few minutes before trying again.';
            } else if (error.message.includes('timeout')) {
                errorMessage += '⏰ *Request timeout!*\n\nThe request took too long. Please try again with a simpler prompt.';
            } else {
                errorMessage += `Error: ${error.message}\n\nPlease try again with a different prompt.`;
            }
            
            await sock.sendMessage(chatId, { 
                text: errorMessage 
            }, { quoted: msg });
        }
    }
};

// Additional utility commands
export const imagineUtils = {
    name: 'imagine',
    description: 'AI image generation utilities',
    category: 'ai',
    async execute(sock, msg, args, metadata) {
        const chatId = msg.key.remoteJid;
        const subCommand = args[0]?.toLowerCase();
        
        if (subCommand === 'stats') {
            // Show generation statistics
            const cacheFiles = fs.readdirSync(CONFIG.CACHE_DIR).filter(f => f.endsWith('.json'));
            const totalGenerated = cacheFiles.length;
            
            let totalSize = 0;
            for (const file of cacheFiles) {
                const cacheKey = file.replace('.json', '');
                const imageFile = path.join(CONFIG.CACHE_DIR, `${cacheKey}.png`);
                if (fs.existsSync(imageFile)) {
                    totalSize += fs.statSync(imageFile).size;
                }
            }
            
            const statsText = `📊 *AI Image Generation Stats*\n\n` +
                             `🖼️ **Total Generated:** ${totalGenerated} images\n` +
                             `💾 **Cache Size:** ${(totalSize / 1024 / 1024).toFixed(2)} MB\n` +
                             `⏰ **Cache Duration:** 24 hours\n` +
                             `👤 **User Limit:** ${CONFIG.RATE_LIMIT_PER_USER}/hour\n` +
                             `👥 **Group Limit:** ${CONFIG.RATE_LIMIT_PER_GROUP}/hour\n\n` +
                             `Cache directory: \`${CONFIG.CACHE_DIR}\``;
            
            return sock.sendMessage(chatId, { text: statsText }, { quoted: msg });
        }
        
        if (subCommand === 'clearcache') {
            // Clear cache (admin only)
            const sender = msg.key.participant || msg.key.remoteJid;
            const isAdmin = false; // Add your admin check logic
            
            if (!isAdmin) {
                return sock.sendMessage(chatId, { 
                    text: '❌ Admin only command!' 
                }, { quoted: msg });
            }
            
            try {
                const files = fs.readdirSync(CONFIG.CACHE_DIR);
                let deleted = 0;
                
                for (const file of files) {
                    const filePath = path.join(CONFIG.CACHE_DIR, file);
                    await unlink(filePath);
                    deleted++;
                }
                
                await sock.sendMessage(chatId, { 
                    text: `✅ Cache cleared!\n\nDeleted ${deleted} files.` 
                }, { quoted: msg });
            } catch (error) {
                await sock.sendMessage(chatId, { 
                    text: `❌ Error clearing cache: ${error.message}` 
                }, { quoted: msg });
            }
        }
    }
};