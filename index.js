const https = require('https');
const http = require('http');

const CONFIG = {
    discordWebhook: 'https://discord.com/api/webhooks/1521688375160078418/_3L6Tb_9wzs2hZxf3gRoAGBaHyYLQrTng6fD2tyR6l8SMsSv5C2BZKuAJnmKXP47jmcR',
    streamers: ['maplesyrupy'],
    checkInterval: 30
};

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
        req.on('error', () => resolve());
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
            headers: { 'User-Agent': 'Mozilla/5.0' }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (c) => body += c);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const isLive = !!data.livestream?.is_live;
                    resolve(isLive);
                } catch {
                    resolve(false);
                }
            });
        });
        req.on('error', () => resolve(false));
        req.end();
    });
}

async function monitor() {
    for (const user of CONFIG.streamers) {
        const live = await checkKick(user);
        if (live) {
            if (!liveStreamers.has(user)) {
                await sendDiscord(`<@&1521689981939089449> 🟢 **${user}** is LIVE! https://kick.com/${user}`);
                liveStreamers.add(user);
            }
        } else {
            liveStreamers.delete(user);
        }
        await new Promise(r => setTimeout(r, 1500));
    }
}

// Send test message immediately + start monitoring
sendDiscord("✅ **Kick notifier started and running**");
monitor();
setInterval(monitor, CONFIG.checkInterval * 1000);
