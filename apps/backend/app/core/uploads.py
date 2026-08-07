import os

from app.core.config import settings

COURSE_IMAGES_SUBDIR = "courses"
UPLOAD_URL_PREFIX = "/uploads/"


def _resolve_upload_path(url: str) -> str | None:
    """Map a `/uploads/...` URL to its file path under UPLOAD_DIR.

    Returns None for URLs we don't own, or that would resolve outside
    UPLOAD_DIR (image_url is a free-text field on CourseWrite, so this
    guards against a crafted value like "/uploads/../../etc/passwd").
    """
    if not url.startswith(UPLOAD_URL_PREFIX):
        return None

    upload_root = os.path.realpath(settings.upload_dir)
    candidate = os.path.realpath(
        os.path.join(upload_root, url.removeprefix(UPLOAD_URL_PREFIX))
    )
    if os.path.commonpath([upload_root, candidate]) != upload_root:
        return None
    return candidate


def delete_uploaded_file(url: str | None) -> None:
    """Best-effort delete of a previously uploaded image; ignores missing/foreign files."""
    if url is None:
        return
    path = _resolve_upload_path(url)
    if path is None:
        return
    try:
        os.remove(path)
    except FileNotFoundError:
        pass


def sweep_orphaned_images(subdir: str, active_urls: set[str]) -> int:
    """Delete images under an uploads subdirectory that nothing references anymore.

    Meant to run once at backend startup: catches uploads that were sent to
    the server (see app/api/uploads.py) but never ended up attached to a
    saved record (e.g. the admin picked a file then cancelled the form).
    Returns the number of files removed.
    """
    images_dir = os.path.join(settings.upload_dir, subdir)
    if not os.path.isdir(images_dir):
        return 0

    removed = 0
    for filename in os.listdir(images_dir):
        url = f"{UPLOAD_URL_PREFIX}{subdir}/{filename}"
        if url not in active_urls:
            os.remove(os.path.join(images_dir, filename))
            removed += 1
    return removed
