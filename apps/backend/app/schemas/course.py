from pydantic import BaseModel, Field

from app.models.course import Course
from app.schemas.common import LocalizedText


class CourseContentItem(BaseModel):
    module: LocalizedText
    duration: str


class LocalizedTextWrite(BaseModel):
    es: str = Field(min_length=1)
    en: str = Field(min_length=1)


class CourseContentItemWrite(BaseModel):
    module_es: str = Field(min_length=1, max_length=200)
    module_en: str = Field(min_length=1, max_length=200)
    duration_label: str = Field(min_length=1, max_length=50)


class CourseWrite(BaseModel):
    slug: str = Field(min_length=1, max_length=150, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")
    title_es: str = Field(min_length=1, max_length=150)
    title_en: str = Field(min_length=1, max_length=150)
    tagline_es: str = Field(min_length=1, max_length=300)
    tagline_en: str = Field(min_length=1, max_length=300)
    duration_text_es: str = Field(min_length=1, max_length=500)
    duration_text_en: str = Field(min_length=1, max_length=500)
    image_url: str | None = Field(default=None, max_length=500)
    is_active: bool = True
    objectives: list[LocalizedTextWrite] = []
    content: list[CourseContentItemWrite] = []
    cost: list[LocalizedTextWrite] = []


class CourseSummaryOut(BaseModel):
    """Shape used in the paginated course list — no need for the full detail."""

    id: int
    slug: str
    title: LocalizedText
    tagline: LocalizedText
    image_url: str | None

    @classmethod
    def from_model(cls, course: Course) -> "CourseSummaryOut":
        return cls(
            id=course.id,
            slug=course.slug,
            title=LocalizedText(es=course.title_es, en=course.title_en),
            tagline=LocalizedText(es=course.tagline_es, en=course.tagline_en),
            image_url=course.image_url,
        )


class CourseDetailOut(BaseModel):
    id: int
    slug: str
    title: LocalizedText
    tagline: LocalizedText
    image_url: str | None
    objectives: list[LocalizedText]
    content: list[CourseContentItem]
    duration: LocalizedText
    cost: list[LocalizedText]

    @classmethod
    def from_model(cls, course: Course) -> "CourseDetailOut":
        return cls(
            id=course.id,
            slug=course.slug,
            title=LocalizedText(es=course.title_es, en=course.title_en),
            tagline=LocalizedText(es=course.tagline_es, en=course.tagline_en),
            image_url=course.image_url,
            objectives=[
                LocalizedText(es=o.text_es, en=o.text_en) for o in course.objectives
            ],
            content=[
                CourseContentItem(
                    module=LocalizedText(es=m.module_es, en=m.module_en),
                    duration=m.duration_label,
                )
                for m in course.content_modules
            ],
            duration=LocalizedText(es=course.duration_text_es, en=course.duration_text_en),
            cost=[LocalizedText(es=c.text_es, en=c.text_en) for c in course.costs],
        )
