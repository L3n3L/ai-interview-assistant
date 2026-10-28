const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const { BrowserWindow } = require('electron');
const QRCode = require('qrcode');

const execFileAsync = promisify(execFile);

const RESPONSE_PAGE_SIZE = 3;
const PHONE_PORT = 32147;
const PHONE_PAGE_PATH = path.join(__dirname, '..', '..', 'docs', 'phone-companion-sample.html');
const MARKED_PATH = path.join(__dirname, '..', 'assets', 'marked-4.3.0.min.js');
const DOMPURIFY_PATH = path.join(__dirname, '..', '..', 'node_modules', 'dompurify', 'dist', 'purify.min.js');
const MAX_CLIENTS = 4;
const WINDOWS_ADAPTER_METADATA_CACHE_MS = 5 * 60_000;

let server = null;
let sessionPort = null;
let nextEventId = 0;
let responses = [];
let currentResponseIndex = -1;
let sessionId = null;
let sessionActive = false;
let revision = 0;
let refreshTimer = null;
let lastAddressSignature = null;
let cachedAddresses = [];
let refreshTask = null;
let bridgeGeneration = 0;
let bridgeStartTask = null;
let windowsAdapterMetadata = new Map();
let windowsAdapterMetadataSignature = null;
let windowsAdapterMetadataUpdatedAt = 0;
const clients = new Set();

const VIRTUAL_INTERFACE_MARKERS = [
    'vmware',
    'vmnet',
    'virtual',
    'vethernet',
    'hyper-v',
    'virtualbox',
    'wsl',
    'docker',
    'container',
    'loopback',
    'vpn',
    'wireguard',
    'wintun',
    'tap-',
    'tap ',
    'tun ',
    'tunnel',
    'tailscale',
    'zerotier',
    'hamachi',
    'sing-box',
    'mihomo',
    'clash',
    'cloudflare warp',
    'bluetooth',
    '蓝牙',
    '虚拟',
];
const USB_TETHERING_MARKERS = ['rndis', 'remote ndis', 'internet sharing', 'usb ncm', 'usb tether', 'apple mobile device', 'iphone', 'android'];
const WIFI_INTERFACE_MARKERS = ['wi-fi', 'wifi', 'wlan', 'wireless', '无线'];
const POWERSHELL_ADAPTER_QUERY = [
    "$ErrorActionPreference = 'Stop'",
    '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)',
    "Get-NetAdapter -IncludeHidden | Where-Object { $_.Status -eq 'Up' } | Select-Object Name, InterfaceDescription | ConvertTo-Json -Compress",
].join('; ');

function getNetworkLabel(interfaceName, description = '') {
    const name = `${interfaceName} ${description}`.toLowerCase();
    if (USB_TETHERING_MARKERS.some(marker => name.includes(marker))) return 'USB 网络共享';
    if (WIFI_INTERFACE_MARKERS.some(marker => name.includes(marker))) return 'Wi-Fi';
    return '有线网络';
}

function isLocalIpv4(address) {
    if (typeof address !== 'string' || net.isIP(address) !== 4) return false;
    const octets = address.split('.').map(Number);
    return (
        octets[0] === 10 ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168) ||
        (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
        (octets[0] === 169 && octets[1] === 254)
    );
}

async function getWindowsAdapterMetadata(interfaceSignature) {
    if (process.platform !== 'win32') return new Map();
    if (interfaceSignature === windowsAdapterMetadataSignature && Date.now() - windowsAdapterMetadataUpdatedAt < WINDOWS_ADAPTER_METADATA_CACHE_MS) {
        return windowsAdapterMetadata;
    }

    windowsAdapterMetadataUpdatedAt = Date.now();
    try {
        const { stdout } = await execFileAsync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', POWERSHELL_ADAPTER_QUERY], {
            windowsHide: true,
            timeout: 3_000,
            maxBuffer: 1_000_000,
        });
        if (!stdout.trim()) {
            windowsAdapterMetadata = new Map();
            windowsAdapterMetadataSignature = interfaceSignature;
            return windowsAdapterMetadata;
        }
        const parsed = JSON.parse(stdout);
        const adapters = Array.isArray(parsed) ? parsed : [parsed];
        windowsAdapterMetadata = new Map(
            adapters
                .filter(adapter => typeof adapter.Name === 'string')
                .map(adapter => [adapter.Name.toLowerCase(), adapter.InterfaceDescription || ''])
        );
        windowsAdapterMetadataSignature = interfaceSignature;
    } catch {
        // Keep local address discovery working when PowerShell or NetAdapter is unavailable.
        windowsAdapterMetadataSignature = interfaceSignature;
    }
    return windowsAdapterMetadata;
}

async function getPrivateAddresses() {
    const interfaces = os.networkInterfaces();
    const interfaceSignature = Object.entries(interfaces)
        .map(
            ([name, entries]) =>
                `${name}:${(entries || [])
                    .map(entry => entry.address)
                    .sort()
                    .join(',')}`
        )
        .sort()
        .join(';');
    const adapterMetadata = await getWindowsAdapterMetadata(interfaceSignature);
    const addresses = [];
    for (const [interfaceName, entries] of Object.entries(interfaces)) {
        const description = adapterMetadata.get(interfaceName.toLowerCase()) || '';
        const adapterIdentity = `${interfaceName} ${description}`.toLowerCase();
        if (VIRTUAL_INTERFACE_MARKERS.some(marker => adapterIdentity.includes(marker))) continue;
        for (const entry of entries || []) {
            const isIpv4 = entry.family === 'IPv4' || entry.family === 4;
            if (!isIpv4 || entry.internal || !isLocalIpv4(entry.address)) continue;
            addresses.push({ name: getNetworkLabel(interfaceName, description), interfaceName, address: entry.address });
        }
    }
    return addresses
        .sort((left, right) => left.name.localeCompare(right.name) || left.interfaceName.localeCompare(right.interfaceName))
        .filter((entry, index, list) => list.findIndex(candidate => candidate.address === entry.address) === index);
}

function getPageStart() {
    if (responses.length === 0 || currentResponseIndex < 0) return 0;
    const safeIndex = Math.min(currentResponseIndex, responses.length - 1);
    return Math.floor(safeIndex / RESPONSE_PAGE_SIZE) * RESPONSE_PAGE_SIZE;
}

function getSnapshot() {
    return {
        sessionId,
        active: sessionActive,
        responses,
        currentResponseIndex,
        pageStart: getPageStart(),
        pageSize: RESPONSE_PAGE_SIZE,
        revision,
    };
}

function writeEvent(client, eventName, payload) {
    if (client.destroyed || client.writableEnded) {
        clients.delete(client);
        return;
    }

    const eventId = ++nextEventId;
    const message = `id: ${eventId}\nevent: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    if (!client.write(message)) {
        clients.delete(client);
        client.end();
    }
}

function broadcast(eventName, payload) {
    for (const client of clients) writeEvent(client, eventName, payload);
}

function nextStateRevision() {
    revision += 1;
    return { sessionId, revision };
}

function normalizeResponse(value) {
    if (typeof value !== 'string') return '';
    return value.slice(0, 500_000);
}

function publishRendererEvent(channel, data) {
    if (!sessionActive || !server || !server.listening) return;

    if (channel === 'new-response') {
        const latestPageStart = Math.floor(Math.max(0, responses.length - 1) / RESPONSE_PAGE_SIZE) * RESPONSE_PAGE_SIZE;
        const currentPageStart = currentResponseIndex < 0 ? -1 : Math.floor(currentResponseIndex / RESPONSE_PAGE_SIZE) * RESPONSE_PAGE_SIZE;
        const wasOnLatest = currentPageStart === latestPageStart;

        responses = [...responses, normalizeResponse(data)];
        if (wasOnLatest || currentResponseIndex === -1) currentResponseIndex = responses.length - 1;

        broadcast('response.new', {
            ...nextStateRevision(),
            response: responses[responses.length - 1],
            responseCount: responses.length,
            currentResponseIndex,
            pageStart: getPageStart(),
        });
        return;
    }

    if (channel === 'update-response') {
        if (responses.length === 0) return;

        const index = responses.length - 1;
        const previousResponse = responses[index];
        const nextResponse = normalizeResponse(data);
        if (nextResponse === previousResponse) return;

        responses = [...responses.slice(0, -1), nextResponse];
        if (nextResponse.startsWith(previousResponse)) {
            broadcast('response.append', { ...nextStateRevision(), index, text: nextResponse.slice(previousResponse.length) });
        } else {
            broadcast('response.update', { ...nextStateRevision(), index, response: nextResponse });
        }
        return;
    }

    if (channel === 'discard-current-response' && responses.length > 0) {
        const wasCurrentResponseLatest = currentResponseIndex === responses.length - 1;
        responses = responses.slice(0, -1);
        currentResponseIndex =
            responses.length === 0 ? -1 : wasCurrentResponseLatest ? responses.length - 1 : Math.min(currentResponseIndex, responses.length - 1);
        broadcast('response.discard', {
            ...nextStateRevision(),
            responseCount: responses.length,
            currentResponseIndex,
            pageStart: getPageStart(),
        });
    }
}

function setViewState(payload) {
    if (!sessionActive || !payload || typeof payload !== 'object') return;

    if (Number.isInteger(payload.currentResponseIndex)) {
        currentResponseIndex =
            payload.currentResponseIndex < 0 || responses.length === 0 ? -1 : Math.min(payload.currentResponseIndex, responses.length - 1);
    }

    broadcast('view.state', {
        ...nextStateRevision(),
        currentResponseIndex,
        pageStart: getPageStart(),
    });
}

function sendPhoneScrollCommand(direction) {
    if (!sessionActive || (direction !== 'up' && direction !== 'down')) return;
    broadcast('phone.scroll', { ...nextStateRevision(), direction });
}

function isAllowedClientAddress(remoteAddress) {
    if (!remoteAddress) return false;
    if (remoteAddress === '::1' || remoteAddress === '127.0.0.1') return true;
    const ipv4Address = remoteAddress.startsWith('::ffff:') ? remoteAddress.slice(7) : remoteAddress;
    return isLocalIpv4(ipv4Address);
}

function isAllowedHost(hostHeader) {
    if (typeof hostHeader !== 'string') return false;
    try {
        const hostname = new URL(`http://${hostHeader}`).hostname.replace(/^\[|\]$/g, '');
        return hostname === 'localhost' || hostname === '127.0.0.1' || isLocalIpv4(hostname);
    } catch {
        return false;
    }
}

function sendText(response, statusCode, body, contentType = 'text/plain; charset=utf-8', extraHeaders = {}) {
    response.writeHead(statusCode, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        ...extraHeaders,
    });
    response.end(body);
}

function handleRequest(request, response) {
    if (request.method !== 'GET') {
        sendText(response, 405, 'Method Not Allowed', 'text/plain; charset=utf-8', { Allow: 'GET' });
        return;
    }

    if (!isAllowedClientAddress(request.socket.remoteAddress) || !isAllowedHost(request.headers.host)) {
        sendText(response, 403, 'Forbidden');
        return;
    }

    let requestUrl;
    try {
        requestUrl = new URL(request.url, `http://${request.headers.host}`);
    } catch {
        sendText(response, 400, 'Bad Request');
        return;
    }

    if (request.headers.origin && request.headers.origin !== requestUrl.origin) {
        sendText(response, 403, 'Forbidden');
        return;
    }

    if (requestUrl.pathname === '/assets/marked.js') {
        sendFile(response, MARKED_PATH, 'text/javascript; charset=utf-8');
        return;
    }

    if (requestUrl.pathname === '/assets/purify.js') {
        sendFile(response, DOMPURIFY_PATH, 'text/javascript; charset=utf-8');
        return;
    }

    if (requestUrl.pathname === '/events') {
        if (clients.size >= MAX_CLIENTS) {
            sendText(response, 429, 'Too Many Connections');
            return;
        }

        response.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-store',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer',
        });
        response.write('retry: 1500\n\n');
        clients.add(response);
        writeEvent(response, 'snapshot', getSnapshot());

        const heartbeat = setInterval(() => {
            if (response.destroyed || response.writableEnded) {
                clearInterval(heartbeat);
                clients.delete(response);
                return;
            }
            response.write(': keepalive\n\n');
        }, 20_000);

        response.on('close', () => {
            clearInterval(heartbeat);
            clients.delete(response);
        });
        return;
    }

    if ((requestUrl.pathname === '/' || requestUrl.pathname === '/index.html') && fs.existsSync(PHONE_PAGE_PATH)) {
        const page = fs.readFileSync(PHONE_PAGE_PATH, 'utf8');
        sendText(response, 200, page, 'text/html; charset=utf-8', {
            'Content-Security-Policy':
                "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
            'X-Frame-Options': 'DENY',
        });
        return;
    }

    sendText(response, 404, 'Not Found');
}

function sendFile(response, filePath, contentType) {
    fs.readFile(filePath, (error, content) => {
        if (error) {
            sendText(response, 404, 'Not Found');
            return;
        }
        sendText(response, 200, content, contentType);
    });
}

function notifyAddressesChanged(info) {
    for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed()) window.webContents.send('phone-companion:addresses-updated', info);
    }
}

function refreshConnectionInfo(force = false) {
    if (refreshTask) return refreshTask;

    const refreshGeneration = bridgeGeneration;
    const task = (async () => {
        const networkAddresses = await getPrivateAddresses();
        if (refreshGeneration !== bridgeGeneration || !server?.listening) return [];
        const signature = networkAddresses.map(entry => `${entry.name}|${entry.interfaceName}|${entry.address}`).join(';');
        if (!force && signature === lastAddressSignature) return cachedAddresses;

        const refreshedAddresses = await Promise.all(
            networkAddresses.map(async ({ name, interfaceName, address }) => {
                const url = `http://${address}:${sessionPort}/`;
                const qrDataUrl = await QRCode.toDataURL(url, {
                    errorCorrectionLevel: 'M',
                    margin: 1,
                    width: 220,
                    color: { dark: '#20242b', light: '#ffffff' },
                });
                return { name, interfaceName, address, url, qrDataUrl };
            })
        );
        if (refreshGeneration !== bridgeGeneration || !server?.listening) return [];
        lastAddressSignature = signature;
        cachedAddresses = refreshedAddresses;

        const info = {
            success: true,
            active: Boolean(server && server.listening),
            addresses: cachedAddresses,
            error: cachedAddresses.length === 0 ? '未发现可供手机访问的局域网 IPv4 地址' : '',
        };
        notifyAddressesChanged(info);
        return cachedAddresses;
    })().finally(() => {
        if (refreshTask === task) refreshTask = null;
    });

    refreshTask = task;
    return task;
}

async function startBridge() {
    if (server && server.listening) return getConnectionInfo();
    if (bridgeStartTask) return bridgeStartTask;

    const task = (async () => {
        bridgeGeneration += 1;
        nextEventId = 0;
        revision = 0;
        sessionId = null;
        sessionActive = false;
        responses = [];
        currentResponseIndex = -1;

        const nextServer = http.createServer(handleRequest);
        nextServer.on('clientError', (_error, socket) => {
            if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });

        try {
            await new Promise((resolve, reject) => {
                nextServer.once('error', reject);
                nextServer.listen(PHONE_PORT, '0.0.0.0', () => {
                    nextServer.removeListener('error', reject);
                    resolve();
                });
            });
        } catch (error) {
            nextServer.close();
            return { success: false, error: error.message };
        }

        server = nextServer;
        sessionPort = server.address()?.port || null;
        lastAddressSignature = null;
        refreshTimer = setInterval(() => {
            refreshConnectionInfo().catch(error => console.error('Error refreshing phone companion addresses:', error));
        }, 5_000);
        refreshConnectionInfo().catch(error => console.error('Error discovering phone companion addresses:', error));
        return { success: true, active: true, addresses: [], error: '正在获取局域网连接地址' };
    })();

    bridgeStartTask = task;
    try {
        return await task;
    } finally {
        if (bridgeStartTask === task) bridgeStartTask = null;
    }
}

async function startSession() {
    if (!server || !server.listening) {
        const bridge = await startBridge();
        if (!bridge.success) return bridge;
    }

    sessionId = crypto.randomUUID();
    sessionActive = true;
    responses = [];
    currentResponseIndex = -1;
    revision += 1;
    broadcast('snapshot', getSnapshot());

    const info = await getConnectionInfo();
    return { ...info, sessionId };
}

async function getConnectionInfo() {
    if (!server || !server.listening || !sessionPort) {
        return { success: false, active: false, error: '手机同步服务未启动' };
    }

    const addresses = await refreshConnectionInfo();
    return {
        success: true,
        active: true,
        addresses,
        error: addresses.length === 0 ? '未发现可供手机访问的局域网 IPv4 地址' : '',
    };
}

function endSession() {
    if (!sessionActive) return Promise.resolve({ success: true });

    sessionActive = false;
    sessionId = null;
    responses = [];
    currentResponseIndex = -1;
    revision += 1;
    broadcast('snapshot', getSnapshot());
    return Promise.resolve({ success: true });
}

async function shutdownBridge() {
    if (bridgeStartTask) await bridgeStartTask;
    endSession();
    bridgeGeneration += 1;
    sessionPort = null;
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
    lastAddressSignature = null;
    cachedAddresses = [];
    refreshTask = null;
    for (const client of clients) client.end();
    clients.clear();

    if (!server) return Promise.resolve({ success: true });

    const oldServer = server;
    server = null;
    return new Promise(resolve => {
        oldServer.close(() => resolve({ success: true }));
    });
}

module.exports = {
    getConnectionInfo,
    publishRendererEvent,
    sendPhoneScrollCommand,
    shutdownBridge,
    setViewState,
    startBridge,
    startSession,
    endSession,
};
