// Simple HTTP server to receive iCUE API Probe results
// Usage: node probe-server.js
// Listens on http://localhost:9876
// Results are printed to console and saved to api-probe-results.txt

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9876;
const OUTPUT_FILE = path.join(__dirname, 'api-probe-results.txt');

const server = http.createServer(function(req, res) {
    // CORS headers so the widget can POST from iCUE's webview
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/probe-results') {
        var body = '';
        req.on('data', function(chunk) { body += chunk; });
        req.on('end', function() {
            console.log('\n' + '='.repeat(60));
            console.log('Probe results received at ' + new Date().toISOString());
            console.log('='.repeat(60));
            console.log(body);
            console.log('='.repeat(60) + '\n');

            fs.writeFileSync(OUTPUT_FILE, body, 'utf8');
            console.log('Saved to ' + OUTPUT_FILE);

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
        });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, function() {
    console.log('Probe server listening on http://localhost:' + PORT);
    console.log('Waiting for API Probe widget to POST results...');
    console.log('Results will be saved to ' + OUTPUT_FILE);
});
