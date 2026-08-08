import csv
from collections import defaultdict

import matplotlib.pyplot as plt

INPUT_CSV = "evaluation_results.csv"

# Palette (validated categorical order, light surface)
COLOR_WEBWATCH = "#2a78d6"
COLOR_MODSECURITY = "#eb6834"
COLOR_FAIL2BAN = "#1baf7a"
COLOR_AIDE = "#eda100"
TEXT_PRIMARY = "#0b0b0b"
TEXT_SECONDARY = "#52514e"
TEXT_MUTED = "#898781"
GRIDLINE = "#e1e0d9"
BASELINE = "#c3c2b7"
SURFACE = "#fcfcfb"


def toBool(value):
    return value == "True"


def loadRows():
    with open(INPUT_CSV, newline="") as f:
        return list(csv.DictReader(f))


def computeMetrics(rows, caughtField):
    truePositive = falseNegative = falsePositive = trueNegative = 0

    for row in rows:
        if row[caughtField] == "":
            continue

        caught = toBool(row[caughtField])
        isAttack = row["category"] == "attack"

        if isAttack and caught:
            truePositive += 1
        elif isAttack and not caught:
            falseNegative += 1
        elif not isAttack and caught:
            falsePositive += 1
        elif not isAttack and not caught:
            trueNegative += 1

    precision = truePositive / (truePositive + falsePositive) if (truePositive + falsePositive) else 0
    recall = truePositive / (truePositive + falseNegative) if (truePositive + falseNegative) else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0
    fpr = falsePositive / (falsePositive + trueNegative) if (falsePositive + trueNegative) else 0

    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "fpr": fpr,
        "tp": truePositive,
        "fn": falseNegative,
        "fp": falsePositive,
        "tn": trueNegative,
    }


def computeDetectionRateByTool(rows):
    webwatchAttacks = [r for r in rows if r["category"] == "attack" and r["webwatch_caught"] != ""]
    webwatchRate = sum(toBool(r["webwatch_caught"]) for r in webwatchAttacks) / len(webwatchAttacks)

    modsecRows = [r for r in rows if r["modsecurity_blocked"] != "" and r["category"] == "attack"]
    modsecRate = sum(toBool(r["modsecurity_blocked"]) for r in modsecRows) / len(modsecRows)

    fail2banRows = [r for r in rows if r["fail2ban_caught"] != ""]
    fail2banRate = sum(toBool(r["fail2ban_caught"]) for r in fail2banRows) / len(fail2banRows)

    aideRows = [r for r in rows if r["aide_caught"] != ""]
    aideRate = sum(toBool(r["aide_caught"]) for r in aideRows) / len(aideRows)

    return {
        "WebWatch": webwatchRate,
        "ModSecurity": modsecRate,
        "Fail2Ban": fail2banRate,
        "AIDE": aideRate,
    }


def computeMitreBreakdown(rows):
    byTechnique = defaultdict(lambda: [0, 0])  # [caught, total]

    for row in rows:
        technique = row["mitre_technique"]
        if not technique or row["category"] != "attack" or row["webwatch_caught"] == "":
            continue

        byTechnique[technique][1] += 1
        if toBool(row["webwatch_caught"]):
            byTechnique[technique][0] += 1

    return {
        technique: caught / total
        for technique, (caught, total) in sorted(byTechnique.items())
    }


def styleAxes(ax):
    ax.set_facecolor(SURFACE)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_visible(False)
    ax.spines["bottom"].set_color(BASELINE)
    ax.tick_params(colors=TEXT_MUTED, labelsize=9)
    ax.yaxis.grid(True, color=GRIDLINE, linewidth=0.8)
    ax.set_axisbelow(True)


def addBarLabels(ax, bars, isPercent=True):
    for bar in bars:
        height = bar.get_height()
        label = f"{height * 100:.0f}%" if isPercent else f"{height:.2f}"
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            height + 0.02,
            label,
            ha="center",
            va="bottom",
            fontsize=9,
            color=TEXT_PRIMARY,
        )


def chartDetectionRateByTool(rates):
    fig, ax = plt.subplots(figsize=(6, 4.5), facecolor=SURFACE)
    styleAxes(ax)

    tools = list(rates.keys())
    values = list(rates.values())
    colors = [COLOR_WEBWATCH, COLOR_MODSECURITY, COLOR_FAIL2BAN, COLOR_AIDE]

    bars = ax.bar(tools, values, color=colors, width=0.55)
    addBarLabels(ax, bars)

    ax.set_ylim(0, 1.1)
    ax.set_yticks([0, 0.25, 0.5, 0.75, 1.0])
    ax.set_yticklabels(["0%", "25%", "50%", "75%", "100%"])
    ax.set_title("Detection rate by tool", fontsize=12, color=TEXT_PRIMARY, loc="left", pad=12)

    fig.tight_layout()
    fig.savefig("chart_detection_rate_by_tool.png", dpi=150)
    print("Saved chart_detection_rate_by_tool.png")


def chartPrecisionRecallF1Fpr(webwatchMetrics, modsecMetrics):
    fig, ax = plt.subplots(figsize=(7, 4.5), facecolor=SURFACE)
    styleAxes(ax)

    metrics = ["precision", "recall", "f1", "fpr"]
    labels = ["Precision", "Recall", "F1", "FPR"]
    x = range(len(metrics))
    width = 0.35

    webwatchValues = [webwatchMetrics[m] for m in metrics]
    modsecValues = [modsecMetrics[m] for m in metrics]

    bars1 = ax.bar([i - width / 2 for i in x], webwatchValues, width, color=COLOR_WEBWATCH, label="WebWatch")
    bars2 = ax.bar([i + width / 2 for i in x], modsecValues, width, color=COLOR_MODSECURITY, label="ModSecurity")
    addBarLabels(ax, bars1)
    addBarLabels(ax, bars2)

    ax.set_xticks(list(x))
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 1.1)
    ax.set_yticks([0, 0.25, 0.5, 0.75, 1.0])
    ax.set_yticklabels(["0%", "25%", "50%", "75%", "100%"])
    ax.set_title("Precision, recall, F1, false-positive rate", fontsize=12, color=TEXT_PRIMARY, loc="left", pad=12)
    ax.legend(frameon=False, labelcolor=TEXT_SECONDARY, loc="upper right")

    fig.tight_layout()
    fig.savefig("chart_precision_recall_f1_fpr.png", dpi=150)
    print("Saved chart_precision_recall_f1_fpr.png")


def chartMitreBreakdown(mitreRates):
    fig, ax = plt.subplots(figsize=(7, 4.5), facecolor=SURFACE)
    styleAxes(ax)

    techniques = list(mitreRates.keys())
    values = list(mitreRates.values())

    bars = ax.bar(techniques, values, color=COLOR_WEBWATCH, width=0.55)
    addBarLabels(ax, bars)

    ax.set_ylim(0, 1.1)
    ax.set_yticks([0, 0.25, 0.5, 0.75, 1.0])
    ax.set_yticklabels(["0%", "25%", "50%", "75%", "100%"])
    ax.set_title("WebWatch detection rate by MITRE technique", fontsize=12, color=TEXT_PRIMARY, loc="left", pad=12)
    ax.tick_params(axis="x", rotation=45)

    fig.tight_layout()
    fig.savefig("chart_mitre_breakdown.png", dpi=150)
    print("Saved chart_mitre_breakdown.png")


def printSummary(rates, webwatchMetrics, modsecMetrics, mitreRates):
    print("\n=== Detection rate by tool ===")
    for tool, rate in rates.items():
        print(f"  {tool}: {rate * 100:.1f}%")

    print("\n=== WebWatch metrics ===")
    for key, value in webwatchMetrics.items():
        print(f"  {key}: {value:.3f}" if isinstance(value, float) else f"  {key}: {value}")

    print("\n=== ModSecurity metrics ===")
    for key, value in modsecMetrics.items():
        print(f"  {key}: {value:.3f}" if isinstance(value, float) else f"  {key}: {value}")

    print("\n=== WebWatch detection rate by MITRE technique ===")
    for technique, rate in mitreRates.items():
        print(f"  {technique}: {rate * 100:.1f}%")


def main():
    rows = loadRows()

    rates = computeDetectionRateByTool(rows)
    webwatchMetrics = computeMetrics(rows, "webwatch_caught")
    modsecMetrics = computeMetrics(rows, "modsecurity_blocked")
    mitreRates = computeMitreBreakdown(rows)

    printSummary(rates, webwatchMetrics, modsecMetrics, mitreRates)

    chartDetectionRateByTool(rates)
    chartPrecisionRecallF1Fpr(webwatchMetrics, modsecMetrics)
    chartMitreBreakdown(mitreRates)


if __name__ == "__main__":
    main()
