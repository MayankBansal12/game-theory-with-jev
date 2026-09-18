from pydantic import BaseModel, Field, field_validator, model_validator
from .game import BY_ID, MODEL, PROMPT_VERSION, QUESTIONS


class RunConfig(BaseModel):
    rounds: int = Field(default=20, ge=2, le=200)
    repetitions: int = Field(default=5, ge=1, le=20)
    opponents: list[str] = Field(default_factory=lambda: list(BY_ID))
    seed: int = Field(default=42, ge=0, le=2**31-1)
    model: str = MODEL
    prompt_version: str = PROMPT_VERSION
    questions: dict = Field(default_factory=lambda: QUESTIONS)
    max_requests: int = Field(default=1100, ge=1, le=12000)

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
        required = self.rounds * self.repetitions * sum(2 if x == "another_jev" else 1 for x in self.opponents)
        if required > self.max_requests:
            raise ValueError("Scheduled decisions exceed request limit")
        return self
