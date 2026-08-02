from passlib.context import CryptContext

from database import Base, SessionLocal, engine
import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEFAULT_RULES = [
    {
        "name": "SQL Injection Attempt",
        "pattern": r"(union\s+select|or\s+1\s*=\s*1|'\s*or\s*'1'\s*=\s*'1|--)",
        "severity": "high",
        "mitre_technique": "T1190",
        "description": "Detects SQL injection markers such as UNION SELECT, OR 1=1, and comment terminators.",
    },
    {
        "name": "XSS Attempt",
        "pattern": r"(<script|<iframe|on\w+\s*=)",
        "severity": "high",
        "mitre_technique": "T1059",
        "description": "Detects cross-site scripting markers including <script>, <iframe>, and inline event handlers.",
    },
    {
        "name": "Directory Traversal Attempt",
        "pattern": r"\.\./",
        "severity": "medium",
        "mitre_technique": "T1083",
        "description": "Detects path traversal attempts using ../ sequences (encoded variants are caught after normalization).",
    },
    {
        "name": "Scanner Tool Detected",
        "pattern": r"(?i)(sqlmap|nikto|nmap|gobuster|dirbuster)",
        "severity": "medium",
        "mitre_technique": "T1595",
        "description": "Detects known scanning/exploitation tool user-agents.",
    },
    {
        "name": "Sensitive File Probe",
        "pattern": r"(\.env|\.git/config|\.ssh/id_rsa|\.aws/credentials|wp-config\.php\.bak|backup\.sql)",
        "severity": "high",
        "mitre_technique": "T1552",
        "description": "Detects probing for exposed secrets/config files.",
    },
    {
        "name": "WordPress Scanning",
        "pattern": r"(wp-admin|wp-login\.php|wp-config)",
        "severity": "medium",
        "mitre_technique": "T1595",
        "description": "Detects probing for common WordPress paths, a frequent opportunistic scanning pattern.",
    },
    {
        "name": "Admin Panel Probing",
        "pattern": r"(/admin|/administrator)",
        "severity": "medium",
        "mitre_technique": "T1595",
        "description": "Detects probing for common admin panel paths.",
    },
    {
        "name": "Command Injection Attempt",
        "pattern": r"[;|]\s*(cat|rm|ls|wget|curl|nc|bash|sh|chmod|kill|whoami|id|ping|nmap)\b",
        "severity": "high",
        "mitre_technique": "T1059",
        "description": "Detects shell metacharacters (; and |) that may indicate command injection attempts.",
    },
]


def seed_admin_user(db):
    existing = db.query(models.User).filter_by(username="admin").first()
    if existing:
        print("Admin user already exists, skipping.")
        return

    admin = models.User(
        username="admin",
        email="admin@webwatch.local",
        hashed_password=pwd_context.hash("admin123"),
        is_active=True,
    )
    db.add(admin)
    db.commit()
    print("Admin user created: admin / admin123")


def seed_rules(db):
    created_count = 0

    for rule_data in DEFAULT_RULES:
        existing = db.query(models.Rule).filter_by(name=rule_data["name"]).first()
        if existing:
            continue

        rule = models.Rule(**rule_data)
        db.add(rule)
        created_count += 1

    db.commit()
    print(f"Rules seeded: {created_count} created, {len(DEFAULT_RULES) - created_count} already existed.")


def seed():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_admin_user(db)
        seed_rules(db)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
