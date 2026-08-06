from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

PeriodState = Literal["abierto", "cerrado"]


class PayrollPeriodOut(BaseModel):
    year: int
    month: int
    estado: PeriodState
    cerrado_en: datetime | None


class NominaItemOut(BaseModel):
    employee_id: int
    nombre: str
    apellido: str
    tipo_contrato: Literal["indefinido", "por_horas"]
    monto_cop: int


class BonusWrite(BaseModel):
    employee_id: int
    year: int
    month: int
    monto_cop: int = Field(gt=0)
    concepto: str = Field(min_length=1, max_length=200)


class BonusOut(BaseModel):
    id: int
    employee_id: int
    year: int
    month: int
    monto_cop: int
    concepto: str
    created_at: datetime


class TipPoolWrite(BaseModel):
    monto_total_cop: int = Field(ge=0)
    employee_ids: list[int]


class TipPoolOut(BaseModel):
    year: int
    month: int
    monto_total_cop: int
    participant_ids: list[int]
    monto_por_persona: int


class SummaryItemOut(BaseModel):
    employee_id: int
    nombre: str
    apellido: str
    pago_base_cop: int
    bonos_cop: int
    propina_cop: int
    total_cop: int


class PayrollSummaryOut(BaseModel):
    year: int
    month: int
    items: list[SummaryItemOut]
    total_general_cop: int
