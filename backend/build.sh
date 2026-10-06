#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input

python manage.py migrate

python manage.py shell -c "
from django.contrib.auth.models import User
import os

username = os.environ.get('ADMIN_USERNAME')
password = os.environ.get('ADMIN_PASSWORD')

if username and password:
    user, created = User.objects.get_or_create(username=username)

    user.set_password(password)
    user.is_active = True
    user.is_staff = True
    user.is_superuser = True
    user.save()

    print('ADMIN USER CREATED/UPDATED:', username)
else:
    print('ADMIN_USERNAME or ADMIN_PASSWORD not configured')
"