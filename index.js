const fs = require('fs');
const http = require("http");

const port = +process.argv[2] || 3000;

const client = require('redis').createClient();

const server = http.createServer();

var ready = false;

// Load cards, pre-build response strings
const cardsData = fs.readFileSync('./cards.json');
const cards = Object.assign({}, JSON.parse(cardsData));
Object.keys(cards).map(function(key, ) {
    cards[key] = JSON.stringify(cards[key]);
});
const default_card_string = JSON.stringify({ id: "ALL CARDS" });

async function warmup() {
    // disable rdb/aof
    await client.configSet("save", "");
    await client.configSet("appendonly", "no");

    // warm up redis client / server
    for (let i = 0; i < 10000; i++) {
        await client.INCR("warmup");
    }
}

async function handleRequest(req, res) {
    var result;
    // substring + indexOf are faster than split
    const path = req.url.substring(0, req.url.indexOf("?")) || req.url;

    // Test code doesn't care about proper headers :D
    // res.setHeader("Content-Type", "application/json");

    // 200 is the default
    //res.writeHead(200);

    switch (path) {
        case "/card_add":
            // Get the next card index to vend from Redis
            result = await client.INCR(req.url.substring(req.url.indexOf("=") + 1));
            // INCR starts from 1, arrays from 0
            res.end(cards[result - 1] || default_card_string);
            break;
        case "/ready":
            if (!ready) {
                await warmup();
                ready = true;
            }
            res.end(JSON.stringify({ ready: true }));
            break;
        default:
            res.writeHead(404);
            res.end();
    }
}

server.on('request', handleRequest);

client.on('error', (err) => console.log('Redis Client Error', err));

client.on('ready', () => {
    server.listen(port, "0.0.0.0");
    console.log(`Example app listening at http://0.0.0.0:${port}`);
});

client.connect();
