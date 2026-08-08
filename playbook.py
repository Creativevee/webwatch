import subprocess
import time

TARGETS = {
    "webwatch": "http://192.168.1.17",
    "modsecurity": "http://192.168.1.17:8080",
}

HTTP_SCENARIOS = [
    {
        "name": "SQL Injection",
        "category": "attack",
        "mitre_technique": "T1190",
        "path": "/rest/products/search?q=test%27%20OR%201%3D1--",
    },
    {
        "name": "XSS",
        "category": "attack",
        "mitre_technique": "T1059",
        "path": "/rest/products/search?q=%3Ciframe%20src%3D%22javascript:alert(1)%22%3E",
    },
    {
        "name": "Scanner Tool Detected",
        "category": "attack",
        "mitre_technique": "T1595",
        "path": "/rest/products/search?q=test",
        "extra_args": ["-A", "sqlmap/1.6"],
    },
    {
        "name": "Admin Panel Probing",
        "category": "attack",
        "mitre_technique": "T1595",
        "path": "/admin",
    },
    {
        "name": "WordPress Scanning",
        "category": "attack",
        "mitre_technique": "T1595",
        "path": "/wp-admin",
    },
    {
        "name": "Directory Traversal",
        "category": "attack",
        "mitre_technique": "T1083",
        "path": "/rest/../../../../etc/passwd",
        "extra_args": ["--path-as-is"],
    },
    {
        "name": "Command Injection (semicolon)",
        "category": "attack",
        "mitre_technique": "T1059",
        "path": "/rest/products/search?q=test;cat",
    },
    {
        "name": "Command Injection (backtick)",
        "category": "attack",
        "mitre_technique": "T1059",
        "path": "/rest/products/search?q=`whoami`",
    },
    {
        "name": "Sensitive File Probe",
        "category": "attack",
        "mitre_technique": "T1552",
        "path": "/.env",
    },
    {
        "name": "Web Shell Probe",
        "category": "attack",
        "mitre_technique": "T1505",
        "path": "/uploads/shell.php",
    },
    {
        "name": "SSTI",
        "category": "attack",
        "mitre_technique": "T1190",
        "path": "/rest/products/search?q={{7*7}}{{config}}",
    },
    {
        "name": "LDAP Injection",
        "category": "attack",
        "mitre_technique": "T1190",
        "path": "/rest/user/login?user=*)(uid=*))(|(uid=*",
    },
    {
        "name": "SSRF Probe",
        "category": "attack",
        "mitre_technique": "T1190",
        "path": "/rest/products/search?q=http://169.254.169.254/latest/meta-data/",
    },
    {
        "name": "NoSQL Injection",
        "category": "attack",
        "mitre_technique": "T1190",
        "path": "/rest/user/login?email[$gt]=&password[$gt]=",
    },
    {
        "name": "Normal: Browse Products",
        "category": "normal",
        "mitre_technique": None,
        "path": "/rest/products/search?q=",
    },
    {
        "name": "Normal: View Basket",
        "category": "normal",
        "mitre_technique": None,
        "path": "/rest/basket/1",
    },
    {
        "name": "Normal: Score Board",
        "category": "normal",
        "mitre_technique": None,
        "path": "/api/Challenges/?name=Score%20Board",
    },
    {
        "name": "Normal: Legitimate Search",
        "category": "normal",
        "mitre_technique": None,
        "path": "/rest/products/search?q=apple",
    },
    {
        "name": "Normal: App Config",
        "category": "normal",
        "mitre_technique": None,
        "path": "/rest/admin/application-configuration",
    },
]

# Not HTTP-based, so not sent through either reverse proxy - run once, not per-target
SPECIAL_SCENARIOS = [
    {
        "name": "SSH Brute Force",
        "category": "attack",
        "mitre_technique": "T1110",
        "command": ["hydra", "-l", "webwatch", "-P", "/home/webwatch/wrong-passwords.txt", "ssh://192.168.1.17"],
    },
    {
        "name": "File Tamper",
        "category": "attack",
        "mitre_technique": "T1565",
        "command": ["sudo", "touch", "/etc/nginx/playbook-test-file.conf"],
    },
]


def runHttpScenario(scenario, targetName, targetUrl):
    extraArgs = scenario.get("extra_args", [])
    url = f"{targetUrl}{scenario['path']}"
    command = ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}"] + extraArgs + [url]

    result = subprocess.run(command, capture_output=True, text=True)
    statusCode = result.stdout.strip()
    blocked = statusCode == "403"

    label = " - BLOCKED" if blocked else ""
    print(f"[{targetName}] {scenario['name']} ({scenario['category']}): HTTP {statusCode}{label}")


def runFuzzingScenario(targetName, targetUrl):
    shellCommand = (
        f"curl -s -o /dev/null -w '%{{http_code}}' "
        f"\"{targetUrl}/rest/products/search?q=$(head -c 200 /dev/urandom | base64 | tr -d '\\n')\""
    )
    result = subprocess.run(["bash", "-c", shellCommand], capture_output=True, text=True)
    statusCode = result.stdout.strip()
    blocked = statusCode == "403"

    label = " - BLOCKED" if blocked else ""
    print(f"[{targetName}] Fuzzing Payload (attack): HTTP {statusCode}{label}")


def runSpecialScenario(scenario):
    print(f"Running: {scenario['name']} ({scenario['category']})")
    subprocess.run(scenario["command"], capture_output=True)


def runPlaybook():
    for targetName, targetUrl in TARGETS.items():
        print(f"\n=== Target: {targetName} ({targetUrl}) ===")
        for scenario in HTTP_SCENARIOS:
            runHttpScenario(scenario, targetName, targetUrl)
            time.sleep(1)
        runFuzzingScenario(targetName, targetUrl)
        time.sleep(1)

    print("\n=== Special (non-HTTP) scenarios, run once ===")
    for scenario in SPECIAL_SCENARIOS:
        runSpecialScenario(scenario)
        time.sleep(1)

    totalHttpRuns = (len(HTTP_SCENARIOS) + 1) * len(TARGETS)
    print(f"\nPlaybook complete. {totalHttpRuns} HTTP requests + {len(SPECIAL_SCENARIOS)} special scenarios run.")


if __name__ == "__main__":
    runPlaybook()
