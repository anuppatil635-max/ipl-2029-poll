from rest_framework import serializers
from .models import Poll, Question, Option, Participant, Response




class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ['id', 'text']







class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'order', 'options']






class PollSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Poll
        fields = ['id', 'title', 'is_active', 'created_at', 'questions']





# RESPOCE TO THE API

class ResponseInputSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    option_ids = serializers.ListField(
        child=serializers.IntegerField()
    )


class SubmitPollSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    responses = ResponseInputSerializer(many=True)