"""Contact mail validation and SMTP delivery shared by the production app."""
import os
import re
import smtplib
import ssl
from email.message import EmailMessage

FIELDS = {'company': ('회사명', 100), 'name': ('담당자명', 100), 'phone': ('연락처', 40), 'email': ('이메일', 254), 'message': ('요청사항', 5000)}

def send_contact(data):
    for key, (label, limit) in FIELDS.items():
        value = data.get(key)
        if not isinstance(value, str) or not value.strip() or len(value) > limit:
            return {'error': f'{label} 항목을 확인해주세요.'}, 400
        data[key] = value.strip()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', data['email']) or any('\r' in data[k] or '\n' in data[k] for k in ('company', 'name', 'email')):
        return {'error': '입력 형식을 확인해주세요.'}, 400
    host, sender = os.getenv('SMTP_HOST'), os.getenv('SMTP_FROM')
    if not host or not sender:
        return {'error': '현재 문의 발송을 준비 중입니다. ouog22@gmail.com으로 직접 연락해주세요. 입력 내용은 유지됩니다.'}, 503
    try:
        message = EmailMessage()
        message['Subject'] = f"[STUDIO OKK 문의] {data['company']} / {data['name']}"
        message['From'], message['To'], message['Reply-To'] = sender, 'ouog22@gmail.com', data['email']
        message.set_content('\n\n'.join(f'{label}: {data[key]}' for key, (label, _) in FIELDS.items()))
        port = int(os.getenv('SMTP_PORT', '465'))
        context = ssl.create_default_context()
        if port == 465:
            client = smtplib.SMTP_SSL(host, port, timeout=15, context=context)
        else:
            client = smtplib.SMTP(host, port, timeout=15)
            client.starttls(context=context)
        with client:
            if os.getenv('SMTP_USER'):
                client.login(os.environ['SMTP_USER'], os.environ.get('SMTP_PASSWORD', ''))
            if client.send_message(message):
                raise smtplib.SMTPException('Recipient refused')
    except Exception:
        return {'error': '메일을 전송하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해주세요.'}, 502
    return {'ok': True}, 200
