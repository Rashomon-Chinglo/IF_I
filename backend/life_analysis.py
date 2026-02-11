"""Life type analysis logic."""

from .models import LifeInfo

RELATIONSHIP_SCORES = {
    "married": 25,
    "dating": 15,
    "single": 5,
    "complicated": 0,
}

JOB_SCORES = {
    "stable": 25,
    "moderate": 15,
    "freelance": 5,
    "unstable": 0,
}

HOUSING_SCORES = {
    "owned": 20,
    "living_with_parents": 10,
    "renting": 5,
}

LIFESTYLE_SCORES = {
    "regular": 15,
    "balanced": 10,
    "chaotic": 0,
}


def analyze_life_type(info: LifeInfo) -> tuple[str, int]:
    """
    Analyze user life type and return (type_name, stability_score).
    Higher score means more stable, lower score means more turbulent.
    """

    score = 0
    score += RELATIONSHIP_SCORES.get(info.relationship, 10)

    if info.hasKids == "yes":
        score += 15

    score += JOB_SCORES.get(info.jobStability, 10)
    score += HOUSING_SCORES.get(info.housing, 10)
    score += LIFESTYLE_SCORES.get(info.lifestyle, 5)

    if score >= 60:
        return ("稳定型", score)
    if score >= 35:
        return ("中间型", score)
    return ("漂泊型", score)
