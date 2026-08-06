from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.employee import Employee

TipoDocumento = Literal["CC", "TI", "RC", "CE", "PA"]
TipoContrato = Literal["indefinido", "por_horas"]
TipoCuenta = Literal["ahorros", "corriente"]


class EmployeeWrite(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(min_length=1, max_length=100)
    tipo_documento: TipoDocumento
    numero_documento: str = Field(min_length=1, max_length=30)
    fecha_nacimiento: date
    correo_electronico: EmailStr
    direccion: str = Field(min_length=1, max_length=255)
    cargo: str = Field(min_length=1, max_length=100)
    eps: str = Field(min_length=1, max_length=100)

    tipo_contrato: TipoContrato
    salario_mensual: int | None = Field(default=None, gt=0)
    salario_por_hora: int | None = Field(default=None, gt=0)
    arl: str | None = Field(default=None, max_length=100)
    fondo_pension: str | None = Field(default=None, max_length=100)

    banco: str = Field(min_length=1, max_length=100)
    tipo_cuenta: TipoCuenta
    numero_cuenta: str = Field(min_length=1, max_length=30)

    fecha_ingreso: date

    @model_validator(mode="after")
    def validate_contrato_fields(self) -> "EmployeeWrite":
        if self.tipo_contrato == "indefinido":
            if self.salario_mensual is None:
                raise ValueError("salario_mensual is required for tipo_contrato=indefinido")
            if not self.arl:
                raise ValueError("arl is required for tipo_contrato=indefinido")
            if not self.fondo_pension:
                raise ValueError("fondo_pension is required for tipo_contrato=indefinido")
            self.salario_por_hora = None
        else:
            if self.salario_por_hora is None:
                raise ValueError("salario_por_hora is required for tipo_contrato=por_horas")
            self.salario_mensual = None
            self.arl = None
            self.fondo_pension = None
        return self


class EmployeeOut(BaseModel):
    id: int
    nombre: str
    apellido: str
    tipo_documento: TipoDocumento
    numero_documento: str
    fecha_nacimiento: date
    correo_electronico: str
    direccion: str
    cargo: str
    eps: str
    tipo_contrato: TipoContrato
    salario_mensual: int | None
    salario_por_hora: int | None
    arl: str | None
    fondo_pension: str | None
    banco: str
    tipo_cuenta: TipoCuenta
    numero_cuenta: str
    fecha_ingreso: date
    fecha_registro: datetime
    is_active: bool
    fecha_baja: date | None

    @classmethod
    def from_model(cls, employee: Employee) -> "EmployeeOut":
        return cls(
            id=employee.id,
            nombre=employee.nombre,
            apellido=employee.apellido,
            tipo_documento=employee.tipo_documento,  # type: ignore[arg-type]
            numero_documento=employee.numero_documento,
            fecha_nacimiento=employee.fecha_nacimiento,
            correo_electronico=employee.correo_electronico,
            direccion=employee.direccion,
            cargo=employee.cargo,
            eps=employee.eps,
            tipo_contrato=employee.tipo_contrato,  # type: ignore[arg-type]
            salario_mensual=employee.salario_mensual,
            salario_por_hora=employee.salario_por_hora,
            arl=employee.arl,
            fondo_pension=employee.fondo_pension,
            banco=employee.banco,
            tipo_cuenta=employee.tipo_cuenta,  # type: ignore[arg-type]
            numero_cuenta=employee.numero_cuenta,
            fecha_ingreso=employee.fecha_ingreso,
            fecha_registro=employee.created_at,
            is_active=employee.is_active,
            fecha_baja=employee.fecha_baja,
        )
