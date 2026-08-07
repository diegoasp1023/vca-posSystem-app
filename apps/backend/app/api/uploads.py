import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.auth import require_admin
from app.core.config import settings
from app.schemas.upload import UploadOut

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post(
    "/course-images",
    response_model=UploadOut,
    dependencies=[Depends(require_admin)],
)
async def upload_course_image(file: UploadFile = File(...)) -> UploadOut:
    extension = ALLOWED_CONTENT_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=422,
            detail="Unsupported image type. Use JPEG, PNG or WebP.",
        )

    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds the 5 MB limit.")

    course_images_dir = os.path.join(settings.upload_dir, "courses")
    os.makedirs(course_images_dir, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{extension}"
    with open(os.path.join(course_images_dir, filename), "wb") as image_file:
        image_file.write(contents)

    return UploadOut(url=f"/uploads/courses/{filename}")
