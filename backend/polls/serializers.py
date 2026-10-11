
from rest_framework import serializers
from .models import Poll, Question, Option, Participant, Response


class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ["id", "text"]


class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ["id", "text", "order", "options"]


class PollSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Poll
        fields = [
            "id",
            "title",
            "description",
            "is_active",
            "created_at",
            "questions",
        ]


class OptionCreateSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=200)


class QuestionCreateSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=500)
    order = serializers.IntegerField(min_value=1, required=False, default=1)
    options = OptionCreateSerializer(many=True, allow_empty=False)


class PollCreateSerializer(serializers.ModelSerializer):
    questions = QuestionCreateSerializer(many=True, allow_empty=False)

    class Meta:
        model = Poll
        fields = ["id", "title", "description", "is_active", "questions"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        questions_data = validated_data.pop("questions")
        poll = Poll.objects.create(**validated_data)

        for question_data in questions_data:
            options_data = question_data.pop("options")
            question = Question.objects.create(
                poll=poll,
                **question_data,
            )

            for option_data in options_data:
                Option.objects.create(
                    question=question,
                    **option_data,
                )

        return poll


class ResponseInputSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    option_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )


class SubmitPollSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    responses = ResponseInputSerializer(many=True)


class ParticipantSerializer(serializers.ModelSerializer):
    poll_title = serializers.CharField(
        source="poll.title",
        read_only=True,
    )

    class Meta:
        model = Participant
        fields = [
            "id",
            "name",
            "poll",
            "poll_title",
            "submitted_at",
        ]
