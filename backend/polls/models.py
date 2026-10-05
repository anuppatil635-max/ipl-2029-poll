from django.db import models


class Poll(models.Model):
    title = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title









# QUESTIONS:

class Question(models.Model):
    poll = models.ForeignKey(
        Poll,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    text = models.CharField(max_length=500)
    order = models.PositiveIntegerField(default=1)

    def __str__(self):
        return self.text










# OPTIONS:

class Option(models.Model):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='options'
    )
    text = models.CharField(max_length=200)

    def __str__(self):
        return self.text







# PARTICIPANT:

class Participant(models.Model):
    name = models.CharField(max_length=100)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name









# RESPONSE:

class Response(models.Model):
    participant = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name='responses'
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='responses'
    )
    selected_option = models.ForeignKey(
        Option,
        on_delete=models.CASCADE,
        related_name='responses'
    )

    def __str__(self):
        return f"{self.participant.name} - {self.question.text}"