from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator
from .game import BY_ID, OPPONENTS, MODEL, PROMPT_VERSION, QUESTIONS


class RunConfig(BaseModel):
    rounds: int = Field(default=20, ge=2, le=200)
    repetitions: int = Field(default=20, ge=1, le=20)
    # Only the primary Jev seat is intervened on; the opponent is unchanged.
    initial_move: Literal["free", "cooperate", "defect"] = "free"
    opponents: list[str] = Field(default_factory=lambda: [opponent["id"] for opponent in OPPONENTS])
    seed: int = Field(default=42, ge=0, le=2**31-1)
    model: str = MODEL
    prompt_version: str = PROMPT_VERSION
    questions: dict = Field(default_factory=lambda: QUESTIONS)
    max_requests: int = Field(default=6400, ge=1, le=12000)

    @property
    def scheduled_decisions(self):
        primary_rounds = self.rounds - (self.initial_move != "free")
        return self.repetitions * sum(
            primary_rounds + (self.rounds if opponent == "another_jev" else 0)
            for opponent in self.opponents
        )

    @field_validator("opponents")
    @classmethod
    def valid_opponents(cls, value):
        if not value or len(value) != len(set(value)) or any(x not in BY_ID for x in value):
            raise ValueError("Select unique, known opponents")
        return value

    @model_validator(mode="after")
    def valid_contract(self):
        if self.model != MODEL or self.prompt_version != PROMPT_VERSION or self.questions != QUESTIONS:
            raise ValueError("This version uses the pinned model and fixed decision prompt")
        if self.scheduled_decisions > self.max_requests:
            raise ValueError("Scheduled decisions exceed request limit")
        return self
