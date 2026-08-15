from datetime import date

from pydantic import BaseModel

from app.schemas.common import LocalizedText


class DailySalesPoint(BaseModel):
    date: date
    revenue_cop: int
    tabs_count: int


class SalesSummary(BaseModel):
    total_revenue_cop: int
    closed_tabs_count: int
    average_ticket_cop: int
    daily_series: list[DailySalesPoint]


class TopProductOut(BaseModel):
    name: LocalizedText
    quantity: int
    revenue_cop: int


class PaymentMethodBreakdown(BaseModel):
    name: str
    revenue_cop: int
    tips_cop: int
    tabs_count: int


class TipsSummary(BaseModel):
    calculated_total_cop: int
    declared_total_cop: int | None
    average_tip_per_tab_cop: int


class BusyHourPoint(BaseModel):
    hour: int
    tabs_opened_count: int


class LaborCostSummary(BaseModel):
    total_hours: float
    total_cost_cop: int


class DashboardMetricsOut(BaseModel):
    sales: SalesSummary
    top_products: list[TopProductOut]
    payment_methods: list[PaymentMethodBreakdown]
    tips: TipsSummary
    busy_hours: list[BusyHourPoint]
    average_tab_duration_minutes: float
    labor_cost: LaborCostSummary
