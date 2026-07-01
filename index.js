const https = require('https');
const http = require('http');

const CONFIG = {
    discordWebhook: 'https://discord.com/api/webhooks/1521688375160078418/_3L6Tb_9wzs2hZxf3gRoAGBaHyYLQrTng6fD2tyR6l8SMsSv5C2BZKuAJnmKXP47jmcR',
    streamers: ['maplesyrupy'],
    checkInterval: 60 
};

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
        }, () => resolve());
        req.on('error', () => resolve());
        req.write(data);
        req.end();
    });
}

const seenLive = new Set();

async function checkKick(username) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'kick.com',
            path: `/api/v2/channels/${username}`,
            method: 'GET',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (c) => body += c);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    resolve(data?.data?.livestream?.is_live ?? false);
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
