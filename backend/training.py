import joblib
from sklearn.ensemble import IsolationForest

from engines.anomaly import extractFeatures

INPUT_LOG_PATH = "training-data/normal_lines.log"
MODEL_OUTPUT_PATH = "trained_models/anomaly_model.joblib"


def buildTrainingData():
    featureRows = []

    with open(INPUT_LOG_PATH, "r") as inputFile:
        for line in inputFile:
            features = extractFeatures(line)
            if features is not None:
                featureRows.append(features)

    return featureRows


def main():
    featureRows = buildTrainingData()
    print(f"Training on {len(featureRows)} normal requests")

    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(featureRows)

    joblib.dump(model, MODEL_OUTPUT_PATH)
    print(f"Model saved to {MODEL_OUTPUT_PATH}")


if __name__ == "__main__":
    main()
