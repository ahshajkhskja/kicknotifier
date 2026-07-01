const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const http = require('http');

const client = wrapper(axios.create({ jar: new CookieJar() }));

const CONFIG = {
    discordWebhook: process.env.DISCORD_WEBHOOK || 'YOUR_WEBHOOK_URL_HERE',
    streamers: ['maplesyrupy'],
    checkInterval: 60
};

http.createServer((req, res) => res.end('OK')).listen(process.env.PORT || 10000);

async function sendDiscord(message) {
    try {
        await axios.post(CONFIG.discordWebhook, { content: message });
    } catch (e) {
        console.error('Discord error:', e.message);
    }
}

const seenLive = new Set();

async function checkKick(username) {
    try {
        const response = await client.get(`https://kick.com/api/v2/channels/${username}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });
        return response.data?.livestream?.is_live || false;
    } catch (e) {
        console.log(`Error checking ${username}: ${e.message}`);
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

monitor();
setInterval(monitor, CONFIG.checkInterval * 1000);
