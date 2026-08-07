import re

from seed import DEFAULT_RULES
from engines.log_analyzer import normalizeLine

INPUT_LOG_PATH = "training-data/juiceshop_access.log"
OUTPUT_LOG_PATH = "training-data/normal_lines.log"

RULE_PATTERNS = [rule["pattern"] for rule in DEFAULT_RULES]


def matchesAnyRule(line):
    normalizedLine = normalizeLine(line)
    for pattern in RULE_PATTERNS:
        if re.search(pattern, normalizedLine, re.IGNORECASE):
            return True
    return False


def main():
    normalLines = []
    totalLines = 0

    with open(INPUT_LOG_PATH, "r") as inputFile:
        for line in inputFile:
            totalLines += 1
            if not matchesAnyRule(line):
                normalLines.append(line)

    with open(OUTPUT_LOG_PATH, "w") as outputFile:
        outputFile.writelines(normalLines)

    print(f"Total lines: {totalLines}")
    print(f"Normal lines kept: {len(normalLines)}")
    print(f"Filtered out (matched a rule): {totalLines - len(normalLines)}")


if __name__ == "__main__":
    main()
