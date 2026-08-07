import math
import re

import joblib

REQUEST_LINE_PATTERN = re.compile(r'"[A-Z]+\s+(\S+)\s+HTTP/[\d.]+"\s+(\d+)')
SPECIAL_CHARACTERS = "'\"<>;|%=.@"
MODEL_PATH = "trained_models/anomaly_model.joblib"

try:
    anomalyModel = joblib.load(MODEL_PATH)
except FileNotFoundError:
    anomalyModel = None


def extractRequestPath(logLine):
    match = REQUEST_LINE_PATTERN.search(logLine)
    if not match:
        return None, None

    path = match.group(1)
    statusCode = int(match.group(2))
    return path, statusCode


def calculateEntropy(text):
    if not text:
        return 0.0

    characterCounts = {}
    for character in text:
        characterCounts[character] = characterCounts.get(character, 0) + 1

    entropy = 0.0
    textLength = len(text)
    for count in characterCounts.values():
        probability = count / textLength
        entropy -= probability * math.log2(probability)

    return entropy


def countSpecialCharacters(text):
    count = 0
    for character in text:
        if character in SPECIAL_CHARACTERS:
            count += 1
    return count


def extractFeatures(logLine):
    path, statusCode = extractRequestPath(logLine)
    if path is None:
        return None

    features = [
        len(path),
        countSpecialCharacters(path),
        calculateEntropy(path),
        statusCode,
    ]
    return features


def checkAnomaly(logLine):
    if anomalyModel is None:
        return False

    features = extractFeatures(logLine)
    if features is None:
        return False

    prediction = anomalyModel.predict([features])[0]
    return prediction == -1
