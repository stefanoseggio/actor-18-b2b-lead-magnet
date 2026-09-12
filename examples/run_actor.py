"""
Python example using the official apify-client package.
Install: pip install apify-client
Usage:   APIFY_TOKEN=your_token python run_actor.py
"""

import os

from apify_client import ApifyClient

client = ApifyClient(os.environ["APIFY_TOKEN"])

run_input = {
    "discoveryMode": "seedList",
    "seedList": ["acme.com", "Beta Consulting LLC", "https://gamma-industries.example"],
    "maxLeads": 25,
    "includeIntentScore": True,
    "skipKnownLeads": True,
}

print("Starting actor-18-b2b-lead-magnet run...")
run = client.actor("5QufcYxRkFNHM4h8K").call(run_input=run_input)

print(f"Run finished with status: {run['status']}")

dataset_items = client.dataset(run["defaultDatasetId"]).list_items().items

print(f"Fetched {len(dataset_items)} leads:")
for item in dataset_items:
    intent = item.get("intentScore", "n/a")
    print(f"- {item.get('recipient_or_defendant_name')} ({item.get('website')}) intent={intent}")
