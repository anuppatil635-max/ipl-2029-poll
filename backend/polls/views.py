from django.db import transaction

from django.contrib.auth import authenticate, login, logout

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.authentication import SessionAuthentication

from .models import (
    Poll,
    Question,
    Option,
    Participant,
    Response as PollResponse,
)

from .serializers import (
    PollSerializer,
    SubmitPollSerializer,
)


# ============================================================
# PUBLIC - GET ACTIVE POLL
# ============================================================

class ActivePollView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        poll = Poll.objects.filter(
            is_active=True
        ).prefetch_related(
            "questions__options"
        ).first()

        if not poll:
            return Response(
                {
                    "message": "No active poll found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PollSerializer(poll)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


# ============================================================
# PUBLIC - SUBMIT POLL
# ============================================================

class SubmitPollView(APIView):

    # IMPORTANT:
    # Public users should NOT need admin login.
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):

        serializer = SubmitPollSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data

        name = data["name"].strip()
        responses_data = data["responses"]

        if not name:
            return Response(
                {
                    "message": "Please enter your name."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get active poll
        poll = Poll.objects.filter(
            is_active=True
        ).first()

        if not poll:
            return Response(
                {
                    "message": "No active poll found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Get all questions
        questions = list(
            poll.questions.all().order_by("order")
        )

        question_ids = set(
            question.id
            for question in questions
        )

        submitted_question_ids = set(
            item["question_id"]
            for item in responses_data
        )

        # Check all questions answered
        missing_questions = (
            question_ids -
            submitted_question_ids
        )

        if missing_questions:
            return Response(
                {
                    "message":
                    "Please answer all questions."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        validated_responses = []

        # Validate every question and option
        for response_data in responses_data:

            question_id = response_data[
                "question_id"
            ]

            option_ids = response_data[
                "option_ids"
            ]

            # Check question belongs to poll
            if question_id not in question_ids:
                return Response(
                    {
                        "message":
                        "Invalid question selected."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # At least one option required
            if not option_ids:
                return Response(
                    {
                        "message":
                        "Please select at least one option."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                question = Question.objects.get(
                    id=question_id,
                    poll=poll
                )
            except Question.DoesNotExist:
                return Response(
                    {
                        "message":
                        "Invalid question."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get valid options for this question
            valid_option_ids = set(
                question.options.filter(
                    id__in=option_ids
                ).values_list(
                    "id",
                    flat=True
                )
            )

            # Check options belong to question
            if set(option_ids) != valid_option_ids:
                return Response(
                    {
                        "message":
                        f"Invalid option selected for: "
                        f"{question.text}"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            validated_responses.append(
                {
                    "question": question,
                    "option_ids": option_ids
                }
            )

        # ====================================================
        # SAVE PARTICIPANT + RESPONSES
        # ====================================================

        with transaction.atomic():

            participant = Participant.objects.create(
                name=name
            )

            for item in validated_responses:

                question = item["question"]
                option_ids = item["option_ids"]

                for option_id in option_ids:

                    option = Option.objects.get(
                        id=option_id
                    )

                    PollResponse.objects.create(
                        participant=participant,
                        question=question,
                        selected_option=option
                    )

        return Response(
            {
                "message":
                "Poll submitted successfully.",

                "participant_id":
                participant.id,

                "name":
                participant.name
            },
            status=status.HTTP_201_CREATED
        )


# ============================================================
# ADMIN LOGIN
# ============================================================

class AdminLoginView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):

        username = request.data.get(
            "username"
        )

        password = request.data.get(
            "password"
        )

        if not username or not password:
            return Response(
                {
                    "message":
                    "Username and password are required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(
            username=username,
            password=password
        )

        if user is None:
            return Response(
                {
                    "message":
                    "Invalid username or password."
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_staff:
            return Response(
                {
                    "message":
                    "You are not authorized as an admin."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        login(
            request,
            user
        )

        return Response(
            {
                "message":
                "Login successful",

                "username":
                user.username
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# ADMIN - CHECK SESSION
# ============================================================

class AdminMeView(APIView):

    authentication_classes = [
        SessionAuthentication
    ]

    permission_classes = [
        IsAdminUser
    ]

    def get(self, request):

        return Response(
            {
                "authenticated":
                True,

                "username":
                request.user.username
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# ADMIN - LOGOUT
# ============================================================

class AdminLogoutView(APIView):

    authentication_classes = [
        SessionAuthentication
    ]

    permission_classes = [
        IsAdminUser
    ]

    def post(self, request):

        logout(request)

        return Response(
            {
                "message":
                "Logout successful"
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# ADMIN - GET PARTICIPANTS
# ============================================================

class AdminParticipantsView(APIView):

    authentication_classes = [
        SessionAuthentication
    ]

    permission_classes = [
        IsAdminUser
    ]

    def get(self, request):

        participants = (
            Participant.objects
            .all()
            .order_by("-submitted_at")
        )

        data = []

        for participant in participants:

            responses = (
                PollResponse.objects
                .filter(
                    participant=participant
                )
                .select_related(
                    "question",
                    "selected_option"
                )
            )

            participant_data = {

                "id":
                participant.id,

                "name":
                participant.name,

                "submitted_at":
                participant.submitted_at,

                "responses":
                []
            }

            for response in responses:

                participant_data[
                    "responses"
                ].append(
                    {
                        "question":
                        response.question.text,

                        "option":
                        response.selected_option.text
                    }
                )

            data.append(
                participant_data
            )

        return Response(
            data,
            status=status.HTTP_200_OK
        )


# ============================================================
# ADMIN - DELETE PARTICIPANT
# ============================================================

class AdminDeleteParticipantView(APIView):

    authentication_classes = [
        SessionAuthentication
    ]

    permission_classes = [
        IsAdminUser
    ]

    def delete(
        self,
        request,
        participant_id
    ):

        try:

            participant = (
                Participant.objects.get(
                    id=participant_id
                )
            )

        except Participant.DoesNotExist:

            return Response(
                {
                    "message":
                    "Participant not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        participant_name = (
            participant.name
        )

        participant.delete()

        return Response(
            {
                "message":
                f"Participant '{participant_name}' "
                "deleted successfully."
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# ADMIN - ANALYTICS
# ============================================================

class AnalyticsView(APIView):

    authentication_classes = [
        SessionAuthentication
    ]

    permission_classes = [
        IsAdminUser
    ]

    def get(self, request):

        poll = Poll.objects.filter(
            is_active=True
        ).prefetch_related(
            "questions__options"
        ).first()

        if not poll:

            return Response(
                {
                    "message":
                    "No active poll found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        total_participants = (
            Participant.objects.count()
        )

        total_responses = (
            PollResponse.objects.count()
        )

        questions_data = []

        questions = (
            poll.questions
            .all()
            .order_by("order")
        )

        for question in questions:

            options_data = []

            total_question_responses = (
                PollResponse.objects.filter(
                    question=question
                ).count()
            )

            for option in question.options.all():

                option_count = (
                    PollResponse.objects.filter(
                        question=question,
                        selected_option=option
                    ).count()
                )

                if total_question_responses > 0:

                    percentage = round(
                        (
                            option_count /
                            total_question_responses
                        ) * 100,
                        1
                    )

                else:

                    percentage = 0

                options_data.append(
                    {
                        "id":
                        option.id,

                        "text":
                        option.text,

                        "count":
                        option_count,

                        "percentage":
                        percentage
                    }
                )

            questions_data.append(
                {
                    "id":
                    question.id,

                    "text":
                    question.text,

                    "order":
                    question.order,

                    "total_responses":
                    total_question_responses,

                    "options":
                    options_data
                }
            )

        return Response(
            {
                "poll": {
                    "id":
                    poll.id,

                    "title":
                    poll.title,

                    "is_active":
                    poll.is_active
                },

                "total_participants":
                total_participants,

                "total_responses":
                total_responses,

                "total_questions":
                questions.count(),

                "questions":
                questions_data
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# ADMIN - POLL STATUS
# ============================================================

class AdminPollStatusView(APIView):

    authentication_classes = [
        SessionAuthentication
    ]

    permission_classes = [
        IsAdminUser
    ]

    def get(self, request):

        poll = Poll.objects.first()

        if not poll:

            return Response(
                {
                    "message":
                    "Poll not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {
                "id":
                poll.id,

                "title":
                poll.title,

                "is_active":
                poll.is_active
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# ADMIN - TOGGLE POLL
# ============================================================

class AdminTogglePollView(APIView):

    authentication_classes = [
        SessionAuthentication
    ]

    permission_classes = [
        IsAdminUser
    ]

    def post(self, request):

        poll = Poll.objects.first()

        if not poll:

            return Response(
                {
                    "message":
                    "Poll not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        poll.is_active = not poll.is_active

        poll.save(
            update_fields=[
                "is_active"
            ]
        )

        return Response(
            {
                "message":
                (
                    "Poll opened successfully."
                    if poll.is_active
                    else
                    "Poll closed successfully."
                ),

                "is_active":
                poll.is_active
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# ADMIN - ADD PARTICIPANT MANUALLY
# ============================================================

class AdminAddParticipantView(APIView):

    authentication_classes = [
        SessionAuthentication
    ]

    permission_classes = [
        IsAdminUser
    ]

    def post(self, request):

        name = request.data.get(
            "name"
        )

        responses = request.data.get(
            "responses"
        )

        if not name:

            return Response(
                {
                    "message":
                    "Participant name is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(
            responses,
            dict
        ):

            return Response(
                {
                    "message":
                    "Please provide all answers."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        poll = Poll.objects.filter(
            is_active=True
        ).first()

        if not poll:

            return Response(
                {
                    "message":
                    "No active poll found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        questions = list(
            poll.questions
            .all()
            .order_by("order")
        )

        if len(responses) != len(
            questions
        ):

            return Response(
                {
                    "message":
                    "Please answer all questions."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        validated_responses = []

        for question in questions:

            option_id = responses.get(
                str(question.id)
            )

            if not option_id:

                return Response(
                    {
                        "message":
                        f"Please answer: "
                        f"{question.text}"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:

                option = Option.objects.get(
                    id=option_id,
                    question=question
                )

            except Option.DoesNotExist:

                return Response(
                    {
                        "message":
                        f"Invalid answer for: "
                        f"{question.text}"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            validated_responses.append(
                {
                    "question":
                    question,

                    "option":
                    option
                }
            )

        with transaction.atomic():

            participant = (
                Participant.objects.create(
                    name=name.strip()
                )
            )

            for item in validated_responses:

                PollResponse.objects.create(
                    participant=participant,

                    question=item[
                        "question"
                    ],

                    selected_option=item[
                        "option"
                    ]
                )

        return Response(
            {
                "message":
                "Participant added successfully.",

                "participant_id":
                participant.id,

                "name":
                participant.name
            },
            status=status.HTTP_201_CREATED
        )