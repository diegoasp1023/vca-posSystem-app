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


async def _save_image_upload(subdir: str, file: UploadFile) -> UploadOut:
    extension = ALLOWED_CONTENT_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=422,
            detail="Unsupported image type. Use JPEG, PNG or WebP.",
        )

    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds the 5 MB limit.")

    images_dir = os.path.join(settings.upload_dir, subdir)
    os.makedirs(images_dir, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{extension}"
    with open(os.path.join(images_dir, filename), "wb") as image_file:
        image_file.write(contents)

    return UploadOut(url=f"/uploads/{subdir}/{filename}")


@router.post(
    "/course-images",
    response_model=UploadOut,
    dependencies=[Depends(require_admin)],
)
async def upload_course_image(file: UploadFile = File(...)) -> UploadOut:
    return await _save_image_upload("courses", file)
