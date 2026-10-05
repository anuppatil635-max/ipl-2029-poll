from django.contrib import admin
from .models import Poll, Question, Option, Participant, Response


admin.site.register(Poll)
admin.site.register(Question)
admin.site.register(Option)
admin.site.register(Participant)
admin.site.register(Response)