"""Pydantic request/response schemas."""

from typing import Optional

from pydantic import BaseModel


class LifeInfo(BaseModel):
    """User life information submitted from the frontend form."""

    nickname: str
    age: int
    gender: str
    city: str
    relationship: str  # single, dating, married, complicated
    hasKids: str  # yes, no
    occupation: str
    jobStability: str  # stable, moderate, freelance, unstable
    housing: str  # owned, renting, living_with_parents
    lifestyle: str  # regular, balanced, chaotic
    lifeDesc: str
    dream: Optional[str] = ""
