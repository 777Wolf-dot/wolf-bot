// // commands/ai/deepseek.js
// import fetch from "node-fetch";

// export default {
//   name: "deepseek",
//   alias: ["ds", "ai", "ask"],
//   desc: "Talk with DeepSeek AI via OpenRouter 🤖 (FREE CREDITS AVAILABLE)",
//   category: "AI",
//   usage: ".deepseek <your question>",
//   async execute(sock, m, args) {
//     try {
//       const query = args.join(" ");
//       if (!query) {
//         return sock.sendMessage(m.key.remoteJid, {
//           text: "🤖 *DeepSeek AI Assistant*\n━━━━━━━━━━━━━━━━━\nI'm ready to help! Powered by DeepSeek through OpenRouter.\n\n*Usage:* .deepseek What is quantum computing?\n*Example:* .deepseek Write a Python function"
//         }, { quoted: m });
//       }

//       // Use OpenRouter API key from .env
//       const apiKey = process.env.OPENROUTER_API_KEY;
      
//       if (!apiKey) {
//         return sock.sendMessage(m.key.remoteJid, {
//           text: "🔑 *API Key Missing*\n━━━━━━━━━━━━━━━━━\nAdd to your .env file:\n\nOPENROUTER_API_KEY=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\n\nThen restart your bot."
//         }, { quoted: m });
//       }

//       // Show typing indicator
//       await sock.sendPresenceUpdate('composing', m.key.remoteJid);

//       // Call OpenRouter API (with DeepSeek model)
//       const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Authorization": `Bearer ${apiKey}`,
//           "HTTP-Referer": "https://silent-wolf-bot.com", // Required by OpenRouter
//           "X-Title": "Silent Wolf AI Bot" // Optional but good practice
//         },
//         body: JSON.stringify({
//           model: "deepseek/deepseek-chat", // Using DeepSeek through OpenRouter
//           messages: [
//             {
//               role: "system",
//               content: `You are Silent Wolf, a helpful AI assistant with a wolf-themed personality. You're wise, mysterious, and helpful. Provide accurate answers with a touch of wolf/wilderness metaphors when appropriate.

// Guidelines:
// 1. Be concise but thorough
// 2. Format with *bold* for emphasis
// 3. Use emojis sparingly: 🐺✨🌲🌑
// 4. For code, use proper formatting
// 5. Keep answers under 1500 tokens`
//             },
//             {
//               role: "user",
//               content: query
//             }
//           ],
//           temperature: 0.7,
//           max_tokens: 1500,
//           stream: false
//         })
//       });

//       // Check response status
//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error("OpenRouter API Error:", response.status, errorText);
        
//         let errorMessage = "Unknown error";
//         try {
//           const errorData = JSON.parse(errorText);
//           errorMessage = errorData.error?.message || errorData.error || errorText;
//         } catch (e) {
//           errorMessage = errorText.substring(0, 200);
//         }
        
//         // Handle specific errors
//         if (response.status === 429) {
//           return sock.sendMessage(m.key.remoteJid, {
//             text: "⏳ *Rate Limited*\nPlease wait 30 seconds before trying again.\n\nOpenRouter has rate limits to prevent abuse."
//           }, { quoted: m });
//         }
        
//         if (response.status === 402) {
//           return sock.sendMessage(m.key.remoteJid, {
//             text: "💳 *Free Credits Used*\n━━━━━━━━━━━━━━━━━\nYou've used your 100 free credits!\n\n*Get more:*\n1. Visit https://openrouter.ai/account\n2. Click 'Add Credits' ($1 = ~500 requests)\n3. Or create new account with different email\n\n*Alternative:* Use .localai for completely free AI"
//           }, { quoted: m });
//         }
        
//         if (response.status === 401) {
//           return sock.sendMessage(m.key.remoteJid, {
//             text: "🔐 *Invalid API Key*\nCheck your OPENROUTER_API_KEY in .env\n\nGet new key: https://openrouter.ai/api-keys"
//           }, { quoted: m });
//         }
        
//         throw new Error(`API Error (${response.status}): ${errorMessage}`);
//       }

//       // Parse successful response
//       const data = await response.json();
//       let reply = data.choices?.[0]?.message?.content || "No response generated.";
      
//       // Get usage stats
//       const usage = data.usage || {};
//       const promptTokens = usage.prompt_tokens || 0;
//       const completionTokens = usage.completion_tokens || 0;
//       const totalTokens = usage.total_tokens || 0;
//       const cost = data.usage?.total_cost || 0;

//       // Format the reply
//       const formattedReply = `
// 🐺✨ *Silent Wolf AI* 
// ━━━━━━━━━━━━━━━━━
// ${reply}
// ━━━━━━━━━━━━━━━━━
// 📊 *Stats:* ${totalTokens} tokens (${promptTokens}→${completionTokens})
// 💰 *Cost:* $${cost.toFixed(6)}
// 🤖 *Model:* DeepSeek Chat
// 🔗 *Via:* OpenRouter
// `;

//       // Send the response
//       await sock.sendMessage(m.key.remoteJid, { text: formattedReply }, { quoted: m });

//     } catch (err) {
//       console.error("DeepSeek Error:", err);
      
//       // User-friendly error message
//       let errorMessage = err.message;
//       if (err.message.includes("fetch failed") || err.message.includes("network")) {
//         errorMessage = "Network error. Check your internet connection.";
//       }
      
//       await sock.sendMessage(m.key.remoteJid, {
//         text: `❌ *AI Service Error*\n━━━━━━━━━━━━━━━━━\n${errorMessage}\n\n*Troubleshooting:*\n1. Check if API key is valid\n2. Visit https://openrouter.ai/activity to see credits\n3. Try .ai command for other options`
//       }, { quoted: m });
//     }
//   }
// };











































// commands/ai/deepseek.js
import fetch from "node-fetch";

export default {
  name: "deepseek",
  alias: ["ds", "ai", "ask"],
  desc: "Talk with DeepSeek AI via OpenRouter 🤖 (FREE CREDITS AVAILABLE)",
  category: "AI",
  usage: ".deepseek <your question>",
  async execute(sock, m, args) {
    try {
      const query = args.join(" ");
      if (!query) {
        return sock.sendMessage(m.key.remoteJid, {
          text: "🤖 *DeepSeek AI Assistant*\n━━━━━━━━━━━━━━━━━\nI'm ready to help! Powered by DeepSeek through OpenRouter.\n\n*Usage:* .deepseek What is quantum computing?\n*Example:* .deepseek Write a Python function"
        }, { quoted: m });
      }

      // === IMPROVED: Config validation with detailed error reporting ===
      const apiKey = process.env.OPENROUTER_API_KEY;
      
      if (!apiKey) {
        console.error("❌ OPENROUTER_API_KEY is undefined or empty");
        return sock.sendMessage(m.key.remoteJid, {
          text: "🔑 *Configuration Error - API Key Missing*\n━━━━━━━━━━━━━━━━━\nThe API key is not configured on this server.\n\n*For Panel Deployment:*\n1. Go to your panel's Environment Variables section\n2. Add: `OPENROUTER_API_KEY=your_actual_key_here`\n3. Restart the application\n\n*Get your key:* https://openrouter.ai/api-keys\n\n*Note:* Never commit actual keys to code!"
        }, { quoted: m });
      }

      // Check if it's the example key
      if (apiKey.includes('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')) {
        return sock.sendMessage(m.key.remoteJid, {
          text: "⚠️ *Invalid Example Key Detected*\n━━━━━━━━━━━━━━━━━\nYou're using the example key from the code.\n\n*Fix:*\n1. Get your real key from https://openrouter.ai/api-keys\n2. Update environment variable in your panel\n3. Restart the bot"
        }, { quoted: m });
      }

      // === IMPROVED: Validate key format ===
      if (apiKey.length < 30 || !apiKey.startsWith('sk-or-')) {
        console.error(`Invalid API key format (length: ${apiKey.length})`);
        return sock.sendMessage(m.key.remoteJid, {
          text: "⚠️ *Invalid API Key Format*\n━━━━━━━━━━━━━━━━━\nYour API key appears to be malformed.\n\n*Expected format:* `sk-or-v1-...`\n*Your key length:* " + apiKey.length + " chars\n\n*Fix:* Get a new key from OpenRouter dashboard."
        }, { quoted: m });
      }

      // Show typing indicator
      await sock.sendPresenceUpdate('composing', m.key.remoteJid);

      // === IMPROVED: Enhanced fetch with timeout and better error handling ===
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://silent-wolf-bot.com",
            "X-Title": "Silent Wolf AI Bot",
            "User-Agent": "SilentWolfBot/1.0 (WhatsApp AI Assistant)"
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-chat",
            messages: [
              {
                role: "system",
                content: `You are Silent Wolf, a helpful AI assistant with a wolf-themed personality. You're wise, mysterious, and helpful. Provide accurate answers with a touch of wolf/wilderness metaphors when appropriate.`
              },
              {
                role: "user",
                content: query
              }
            ],
            temperature: 0.7,
            max_tokens: 1500,
            stream: false
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // === IMPROVED: Detailed response status handling ===
        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          let errorDetails = "";
          
          try {
            const errorData = await response.json();
            errorDetails = errorData.error?.message || JSON.stringify(errorData);
            console.error("OpenRouter API Error Details:", errorData);
          } catch (parseError) {
            errorDetails = await response.text().catch(() => "Could not read error body");
          }

          console.error(`API Error ${response.status}:`, errorDetails);

          // Specific error handling
          switch(response.status) {
            case 401:
              return sock.sendMessage(m.key.remoteJid, {
                text: `🔐 *Authentication Failed*\n━━━━━━━━━━━━━━━━━\nYour API key is invalid or expired.\n\n*Details:* ${errorDetails}\n\n*Fix:*\n1. Check key at https://openrouter.ai/api-keys\n2. Generate new key if needed\n3. Update panel environment`
              }, { quoted: m });
              
            case 402:
              return sock.sendMessage(m.key.remoteJid, {
                text: "💳 *Out of Credits*\n━━━━━━━━━━━━━━━━━\nYour OpenRouter credits have been used.\n\n*Solutions:*\n1. Add credits: https://openrouter.ai/account\n2. Create new account for free credits\n3. Use .localai for free alternative\n\n*Note:* 100 free credits ≈ 50-100 requests"
              }, { quoted: m });
              
            case 429:
              return sock.sendMessage(m.key.remoteJid, {
                text: "⏳ *Rate Limited*\n━━━━━━━━━━━━━━━━━\nToo many requests. Please wait 60 seconds.\n\nOpenRouter limits: ~10 requests/minute on free tier"
              }, { quoted: m });
              
            case 404:
              return sock.sendMessage(m.key.remoteJid, {
                text: "🔗 *Endpoint Not Found*\n━━━━━━━━━━━━━━━━━\nThe API endpoint may have changed.\n\n*Check:* https://openrouter.ai/docs for updates"
              }, { quoted: m });
              
            default:
              return sock.sendMessage(m.key.remoteJid, {
                text: `❌ *API Error ${response.status}*\n━━━━━━━━━━━━━━━━━\n${errorMessage}\n\n*Details:* ${errorDetails.substring(0, 100)}...\n\n*Troubleshooting:*\n1. Check https://status.openrouter.ai for service status\n2. Verify network connectivity from your server\n3. Try again in a few minutes`
              }, { quoted: m });
          }
        }

        // === IMPROVED: Parse successful response ===
        const data = await response.json();
        let reply = data.choices?.[0]?.message?.content || "No response generated.";
        
        // Get usage stats
        const usage = data.usage || {};
        const promptTokens = usage.prompt_tokens || 0;
        const completionTokens = usage.completion_tokens || 0;
        const totalTokens = usage.total_tokens || 0;
        const cost = usage.total_cost || usage.cost || 0;

        // Format the reply (trim if too long for WhatsApp)
        const maxLength = 4000; // WhatsApp limit
        if (reply.length > maxLength) {
          reply = reply.substring(0, maxLength - 100) + "...\n\n[Response truncated due to length limits]";
        }

        const formattedReply = `
🐺✨ *Silent Wolf AI* 
━━━━━━━━━━━━━━━━━
${reply}
━━━━━━━━━━━━━━━━━
📊 *Stats:* ${totalTokens} tokens (${promptTokens}→${completionTokens})
💰 *Cost:* $${cost.toFixed(6)}
🤖 *Model:* DeepSeek Chat
🔗 *Via:* OpenRouter
`;

        await sock.sendMessage(m.key.remoteJid, { text: formattedReply }, { quoted: m });

      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // === IMPROVED: Network error handling ===
        if (fetchError.name === 'AbortError') {
          console.error("Request timeout after 30 seconds");
          return sock.sendMessage(m.key.remoteJid, {
            text: "⏱️ *Request Timeout*\n━━━━━━━━━━━━━━━━━\nThe AI service took too long to respond.\n\n*Possible causes:*\n1. Server network is slow\n2. OpenRouter is experiencing high load\n3. Your query is too complex\n\n*Try:*\n• Shorter questions\n• Try again later\n• Check server network connectivity"
          }, { quoted: m });
        }

        console.error("Fetch error:", fetchError);
        
        if (fetchError.message.includes('network') || fetchError.message.includes('fetch failed')) {
          return sock.sendMessage(m.key.remoteJid, {
            text: "🌐 *Network Connection Failed*\n━━━━━━━━━━━━━━━━━\nCannot connect to OpenRouter API from this server.\n\n*Panel Deployment Issues:*\n1. Server may block external API calls\n2. Firewall restriction on outgoing HTTPS\n3. DNS resolution problem\n\n*Solutions:*\n1. Contact hosting support about outgoing HTTPS\n2. Check server can ping api.openrouter.ai\n3. Try from different server location"
          }, { quoted: m });
        }
        
        throw fetchError; // Re-throw for outer catch
      }

    } catch (err) {
      console.error("DeepSeek Command Error:", err);
      
      // Final fallback error
      await sock.sendMessage(m.key.remoteJid, {
        text: `❌ *Unexpected Error*\n━━━━━━━━━━━━━━━━━\n${err.message}\n\n*Debug Info:*\n• Time: ${new Date().toISOString()}\n• Panel: Check server logs\n\n*Quick Fixes:*\n1. Verify environment variables in panel\n2. Check server has internet access\n3. Restart the bot application\n\n*Need help?* Check the panel's error logs for more details.`
      }, { quoted: m });
    }
  }
};