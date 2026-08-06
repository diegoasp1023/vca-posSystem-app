from datetime import date, time

from pydantic import BaseModel, model_validator

from app.models.shift import Shift


class ShiftWrite(BaseModel):
    employee_id: int
    fecha: date
    hora_inicio: time
    hora_fin: time

    @model_validator(mode="after")
    def validate_times(self) -> "ShiftWrite":
        if self.hora_fin <= self.hora_inicio:
            raise ValueError("hora_fin must be after hora_inicio")
        for label, value in (("hora_inicio", self.hora_inicio), ("hora_fin", self.hora_fin)):
            if value.minute not in (0, 30) or value.second != 0:
                raise ValueError(f"{label} must be on a 30-minute mark (e.g. 11:00 or 11:30)")
        return self


class ShiftOut(BaseModel):
    id: int
    employee_id: int
    fecha: date
    hora_inicio: time
    hora_fin: time
    tarifa_hora_cop: int
    horas: float
    monto_cop: int

    @classmethod
    def from_model(cls, shift: Shift) -> "ShiftOut":
        horas = _horas_trabajadas(shift.hora_inicio, shift.hora_fin)
        return cls(
            id=shift.id,
            employee_id=shift.employee_id,
            fecha=shift.fecha,
            hora_inicio=shift.hora_inicio,
            hora_fin=shift.hora_fin,
            tarifa_hora_cop=shift.tarifa_hora_cop,
            horas=horas,
            monto_cop=round(horas * shift.tarifa_hora_cop),
        )


class MonthlyShiftSummary(BaseModel):
    employee_id: int
    year: int
    month: int
    shifts: list[ShiftOut]
    total_horas: float
    total_cop: int


def _horas_trabajadas(hora_inicio: time, hora_fin: time) -> float:
    inicio_minutos = hora_inicio.hour * 60 + hora_inicio.minute
    fin_minutos = hora_fin.hour * 60 + hora_fin.minute
    return round((fin_minutos - inicio_minutos) / 60, 2)
