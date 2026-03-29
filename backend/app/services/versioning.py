from fastapi import HTTPException, status


def check_version(entity, expected_version: int) -> None:
    """Sprawdza wersje rekordu i rzuca 409 jezeli sie nie zgadza.

    Uzywaj przed kazdym UPDATE/PATCH:
        check_version(user, data.version)
        # ... wykonaj zmiany ...
        entity.version += 1
    """
    if entity.version != expected_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Rekord zostal zmodyfikowany przez innego uzytkownika. "
                f"Oczekiwana wersja: {expected_version}, aktualna: {entity.version}. "
                f"Odswiez dane i sprobuj ponownie."
            ),
        )