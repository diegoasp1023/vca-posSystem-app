from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient, decode as jwt_decode
from jwt.exceptions import PyJWTError

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)
_jwks_client = PyJWKClient(settings.kc_jwks_uri)


class AuthenticatedUser:
    def __init__(self, subject: str, username: str, roles: list[str]):
        self.subject = subject
        self.username = username
        self.roles = roles

    def has_role(self, role: str) -> bool:
        return role in self.roles


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token"
        )

    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(credentials.credentials)
        payload = jwt_decode(
            credentials.credentials,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.kc_issuer,
            options={"verify_aud": False},
        )
    except PyJWTError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from error

    roles = payload.get("realm_access", {}).get("roles", [])
    return AuthenticatedUser(
        subject=payload["sub"],
        username=payload.get("preferred_username", ""),
        roles=roles,
    )


def require_admin(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not user.has_role("Administrador"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrador role required",
        )
    return user


def require_gerente_or_admin(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not (user.has_role("Gerente") or user.has_role("Administrador")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gerente or Administrador role required",
        )
    return user
