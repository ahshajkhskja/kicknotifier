const axios = require('axios');
const http = require('http');

const CONFIG = {
    discordWebhook: process.env.DISCORD_WEBHOOK,
    streamers: ['maplesyrupy'],
    checkInterval: 60
};

http.createServer((req, res) => res.end('Bot is active')).listen(process.env.PORT || 10000);

async function sendDiscord(message) {
    if (!CONFIG.discordWebhook) return;
    try {
        await axios.post(CONFIG.discordWebhook, { content: message });
    } catch (e) {
        console.error('Discord error:', e.message);
    }
}

const seenLive = new Set();

async function checkKick(username) {
    try {
        const response = await axios.get(`https://kick.com/api/v2/channels/${username}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Referer': `https://kick.com/${username}`,
                'Origin': 'https://kick.com',
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 10000
        });
        return response.data?.livestream?.is_live || false;
    } catch (e) {
        console.error(`Error checking ${username}: ${e.response?.status || e.message}`);
        return false;
    }
}

async function monitor() {
    for (const user of CONFIG.streamers) {
        const live = await checkKick(user);
        
        if (live && !seenLive.has(user)) {
            seenLive.add(user);
            await sendDiscord(`<@&1521689981939089449> 🟢 **${user}** is LIVE! https://kick.com/${user}`);
        } else if (!live) {
            seenLive.delete(user);
        }
    }
}

console.log("Monitor started...");
monitor();
setInterval(monitor, CONFIG.checkInterval * 1000);
