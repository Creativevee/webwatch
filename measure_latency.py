import subprocess
import time
from datetime import datetime, timezone

import requests

API_BASE = "http://192.168.1.17:8000"


def login():
    response = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    response.raise_for_status()
    return response.json()["access_token"]


token = login()
headers = {"Authorization": f"Bearer {token}"}

fireTime = datetime.now(timezone.utc)
print(f"Firing request at {fireTime.isoformat()}")

subprocess.run(
    ["curl", "-s", "-o", "/dev/null", "http://192.168.1.17/rest/products/search?q=test%27%20OR%201%3D1--"]
)

for second in range(1, 21):
    time.sleep(1)
    response = requests.get(
        f"{API_BASE}/api/alerts",
        headers=headers,
        params={"start_date": fireTime.isoformat(), "limit": 20},
    )
    alerts = response.json()

    if alerts:
        alertTime = datetime.fromisoformat(alerts[0]["created_at"].replace("Z", "+00:00"))
        delay = (alertTime - fireTime).total_seconds()
        print(f"Alert appeared after {second} seconds of polling. Real delay: {delay:.2f} seconds")
        print(f"Alert: {alerts[0]['severity']} - {alerts[0]['message'][:80]}")
        break
    print(f"  ...{second}s: no alert yet")
else:
    print("No alert appeared within 20 seconds.")
