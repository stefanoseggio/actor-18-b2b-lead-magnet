// Node.js example using the official apify-client package (CommonJS).
// Install:  npm install apify-client
// Usage:    APIFY_TOKEN=your_token node run-actor.js

const { ApifyClient } = require('apify-client');

const client = new ApifyClient({
    token: process.env.APIFY_TOKEN,
});

async function main() {
    const input = {
        discoveryMode: 'seedList',
        seedList: ['acme.com', 'Beta Consulting LLC', 'https://gamma-industries.example'],
        maxLeads: 25,
        includeIntentScore: true,
        skipKnownLeads: true,
    };

    console.log('Starting actor-18-b2b-lead-magnet run...');
    const run = await client.actor('5QufcYxRkFNHM4h8K').call(input);

    console.log(`Run finished with status: ${run.status}`);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`Fetched ${items.length} leads:`);
    for (const item of items) {
        console.log(`- ${item.recipient_or_defendant_name} (${item.website}) intent=${item.intentScore ?? 'n/a'}`);
    }
}

main().catch((err) => {
    console.error('Actor run failed:', err);
    process.exit(1);
});
