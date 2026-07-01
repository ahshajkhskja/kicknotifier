const https = require('https');
const http = require('http');

const CONFIG = {
    discordWebhook: process.env.DISCORD_WEBHOOK,
    streamers: (process.env.STREAMERS || 'maplesyrupy').split(','),
    checkInterval: parseInt(process.env.CHECK_INTERVAL || '30', 10)
};

if (!CONFIG.discordWebhook) {
    console.error('Missing DISCORD_WEBHOOK environment variable');
    process.exit(1);
}

let liveStreamers = new Set();

http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot is running');
}).listen(process.env.PORT || 10000);

async function sendDiscord(message) {
    return new Promise((resolve) => {
        const url = new URL(CONFIG.discordWebhook);
        const data = JSON.stringify({ content: message });
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => resolve());
        req.on('error', (err) => {
            console.error('Discord send error:', err.message);
            resolve();
        });
        req.write(data);
        req.end();
    });
}

async function checkKick(username) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'kick.com',
            path: `/api/v2/channels/${username}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': `https://kick.com/${username}`
            }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (c) => body += c);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.error(`[${username}] Kick API returned status ${res.statusCode}`);
                    resolve(false);
                    return;
                }
                try {
                    const data = JSON.parse(body);
                    const isLive = !!data.livestream?.is_live;
                    console.log(`[${username}] live=${isLive}`);
                    resolve(isLive);
                } catch (err) {
                    console.error(`[${username}] Failed to parse response:`, body.slice(0, 200));
                    resolve(false);
                }
            });
        });
        req.on('error', (err) => {
            console.error(`[${username}] Request error:`, err.message);
            resolve(false);
        });
        req.end();
    });
}

async function monitor() {
    for (const user of CONFIG.streamers) {
        const live = await checkKick(user);
        if (live) {
            if (!liveStreamers.has(user)) {
                await sendDiscord(`🟢 **${user}** is LIVE! https://kick.com/${user}`);
                liveStreamers.add(user);
            }
        } else {
            liveStreamers.delete(user);
        }
        await new Promise(r => setTimeout(r, 1500));
    }
}

sendDiscord("✅ **Kick notifier started**");
monitor();
setInterval(monitor, CONFIG.checkInterval * 1000);
