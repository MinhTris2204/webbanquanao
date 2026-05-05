"""
Email validation utility module.
Uses email-validator and dnspython for format/domain checks.
Optionally calls Abstract API for deeper validation.
"""
import re
import os
import socket

# Disposable email domains list (common ones)
DISPOSABLE_DOMAINS = {
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
    'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
    'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de',
    'guerrillamail.net', 'guerrillamail.org', 'spam4.me', 'trashmail.com',
    'trashmail.me', 'trashmail.net', 'dispostable.com', 'mailnull.com',
    'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org', 'maildrop.cc',
    'fakeinbox.com', 'tempinbox.com', 'getairmail.com', 'filzmail.com',
    'throwam.com', 'discard.email', 'spamhereplease.com', 'mailnesia.com',
    'mailnull.com', 'spamspot.com', 'spamthisplease.com', 'tempr.email',
    'dispostable.com', 'nwldx.com', 'spamgob.com',
}


def is_disposable_email(email: str) -> bool:
    """Check if email uses a known disposable/temporary domain."""
    try:
        domain = email.strip().lower().split('@')[1]
        return domain in DISPOSABLE_DOMAINS
    except (IndexError, AttributeError):
        return False


def validate_email_format(email: str):
    """
    Validate email format using email-validator library.
    Returns (is_valid: bool, error_msg: str | None)
    """
    try:
        from email_validator import validate_email, EmailNotValidError
        validate_email(email, check_deliverability=False)
        return True, None
    except Exception:
        pass

    # Fallback: basic regex check
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email.strip()):
        return False, 'Định dạng email không hợp lệ'
    return True, None


def check_domain_mx(email: str):
    """
    Check if the email domain has valid MX records.
    Returns (has_mx: bool, error_msg: str | None)
    """
    try:
        import dns.resolver
        domain = email.strip().lower().split('@')[1]
        dns.resolver.resolve(domain, 'MX')
        return True, None
    except Exception:
        try:
            # Fallback: check A record
            domain = email.strip().lower().split('@')[1]
            socket.gethostbyname(domain)
            return True, None
        except Exception:
            return False, 'Tên miền email không tồn tại hoặc không nhận email'


def validate_email_via_api(email: str):
    """
    Validate email using Abstract API (optional).
    Returns (is_valid, warning, error_msg)
        - (True, warning_or_None, None)  -> valid
        - (False, None, error_msg)       -> invalid
        - (None, None, None)             -> API not configured or failed (skip)
    """
    api_key = os.getenv('ABSTRACT_API_KEY', '')
    if not api_key or api_key == 'your_abstract_api_key_here':
        return None, None, None  # API not configured, skip

    try:
        import requests
        url = f'https://emailvalidation.abstractapi.com/v1/?api_key={api_key}&email={email}'
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            deliverability = data.get('deliverability', '')
            is_valid_format = data.get('is_valid_format', {}).get('value', False)
            is_disposable = data.get('is_disposable_email', {}).get('value', False)

            if not is_valid_format:
                return False, None, 'Định dạng email không hợp lệ'
            if is_disposable:
                return False, None, 'Email tạm thời không được chấp nhận'
            if deliverability == 'UNDELIVERABLE':
                return False, None, 'Email không tồn tại hoặc không thể nhận thư'
            if deliverability == 'RISKY':
                return True, 'Email có thể không nhận được thư, hãy kiểm tra lại', None
            return True, None, None
    except Exception as e:
        print(f'[AbstractAPI] call failed: {e}')

    return None, None, None  # API call failed, skip


def validate_email_full(email: str, check_smtp: bool = False, use_api: bool = True):
    """
    Full email validation pipeline:
    1. Format check
    2. MX/domain check
    3. Optional Abstract API check

    Returns:
        (True, warning_or_None)  -> valid
        (False, error_msg)       -> invalid
    """
    email = email.strip().lower()

    # Step 1: Format validation
    is_valid, error = validate_email_format(email)
    if not is_valid:
        return False, error or 'Định dạng email không hợp lệ'

    # Step 2: Domain/MX check
    has_mx, error = check_domain_mx(email)
    if not has_mx:
        return False, error or 'Tên miền email không hợp lệ'

    # Step 3: Optional API validation
    if use_api:
        api_valid, warning, api_error = validate_email_via_api(email)
        if api_valid is False:
            return False, api_error
        if api_valid is True:
            return True, warning

    return True, None
