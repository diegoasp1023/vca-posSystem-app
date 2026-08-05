from pydantic import BaseModel

from app.models.course import Course
from app.schemas.common import LocalizedText


class CourseContentItem(BaseModel):
    module: LocalizedText
    duration: str


class CourseSummaryOut(BaseModel):
    """Shape used in the paginated course list — no need for the full detail."""

    id: int
    slug: str
    title: LocalizedText
    tagline: LocalizedText
    image_url: str

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
    image_url: str
    objectives: list[LocalizedText]
    content: list[CourseContentItem]
    duration: LocalizedText
    cost: list[LocalizedText]
    methods: list[LocalizedText]

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
            methods=[
                LocalizedText(es=m.name_es, en=m.name_en) for m in course.payment_methods
            ],
        )
