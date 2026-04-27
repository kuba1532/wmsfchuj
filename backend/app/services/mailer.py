import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def send_account_setup_email(*, to_email: str, login_code: str, setup_url: str) -> None:
    subject = "WMS - ustawienie hasla konta"
    body = (
        "Twoje konto w systemie WMS zostalo utworzone.\n\n"
        f"Login: {login_code}\n"
        f"Link do ustawienia hasla (wazny 24h): {setup_url}\n\n"
        "Jesli nie oczekiwales tej wiadomosci, skontaktuj sie z administratorem."
    )

    if not settings.SMTP_ENABLED:
        logger.info("SMTP disabled; setup link for %s: %s", to_email, setup_url)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email
    message.set_content(body)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USERNAME:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(message)

