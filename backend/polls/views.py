
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Poll, Question, Option, Participant
from .models import Response as PollResponse
from .serializers import PollSerializer, PollCreateSerializer
from .serializers import SubmitPollSerializer


def get_selected_poll(request, poll_id=None, active_only=False):
    """Get a specific poll or the first active poll for legacy routes."""
    polls = Poll.objects.all().order_by("id")

    if active_only:
        polls = polls.filter(is_active=True)

    if poll_id is not None:
        return polls.filter(id=poll_id).first()

    if active_only:
        return polls.first()

    return polls.first()


# ============================================================
# PUBLIC POLL LIST
# ============================================================

class PublicPollListView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        polls = Poll.objects.filter(
            is_active=True
        ).order_by("-created_at")

        data = [
            {
                "id": poll.id,
                "title": poll.title,
                "description": poll.description,
                "is_active": poll.is_active,
                "questions_count": poll.questions.count(),
            }
            for poll in polls
        ]

        return Response(data, status=status.HTTP_200_OK)


# ============================================================
# PUBLIC POLL API
# ============================================================

class ActivePollView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, poll_id=None):
        if poll_id is not None:
            poll = Poll.objects.filter(
                id=poll_id
            ).prefetch_related("questions__options").first()
        else:
            poll = Poll.objects.filter(
                is_active=True
            ).order_by("id").prefetch_related(
                "questions__options"
            ).first()

        if not poll:
            return Response(
                {"message": "Poll not found or no active poll exists."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(PollSerializer(poll).data)


class SubmitPollView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, poll_id=None):
        serializer = SubmitPollSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        name = data["name"].strip()
        responses_data = data["responses"]

        if not name:
            return Response(
                {"message": "Please enter your name."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if poll_id is not None:
            poll = Poll.objects.filter(id=poll_id).first()
        else:
            poll = Poll.objects.filter(
                is_active=True
            ).order_by("id").first()

        if not poll:
            return Response(
                {"message": "Poll not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not poll.is_active:
            return Response(
                {"message": "This poll is closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        questions = list(poll.questions.all().order_by("order"))
        question_ids = {question.id for question in questions}

        submitted_ids = [
            item["question_id"] for item in responses_data
        ]

        if len(submitted_ids) != len(set(submitted_ids)):
            return Response(
                {"message": "Each question must appear only once."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if set(submitted_ids) != question_ids:
            return Response(
                {"message": "Please answer all questions."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        validated = []

        for item in responses_data:
            question = next(
                q for q in questions
                if q.id == item["question_id"]
            )

            option_ids = item["option_ids"]

            if len(option_ids) != len(set(option_ids)):
                return Response(
                    {"message": "Duplicate options are not allowed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            valid_ids = set(
                question.options.filter(
                    id__in=option_ids
                ).values_list("id", flat=True)
            )

            if not option_ids or valid_ids != set(option_ids):
                return Response(
                    {
                        "message": (
                            f"Invalid option selected for: "
                            f"{question.text}"
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            validated.append((question, option_ids))

        with transaction.atomic():
            participant = Participant.objects.create(
                poll=poll,
                name=name,
            )

            for question, option_ids in validated:
                options = Option.objects.filter(
                    question=question,
                    id__in=option_ids,
                )

                for option in options:
                    PollResponse.objects.create(
                        participant=participant,
                        question=question,
                        selected_option=option,
                    )

        return Response(
            {
                "message": "Poll submitted successfully.",
                "participant_id": participant.id,
                "name": participant.name,
                "poll_id": poll.id,
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# REGULAR USER REGISTRATION
# ============================================================

class UserRegistrationView(APIView):
    """Create a regular account without admin permissions."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        email = str(request.data.get("email", "")).strip()
        password = request.data.get("password", "")
        confirm_password = request.data.get("confirm_password", "")

        if not username or not email or not password or not confirm_password:
            return Response(
                {
                    "message": (
                        "Username, email, password, and "
                        "confirmation are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password != confirm_password:
            return Response(
                {"message": "Passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()

        if User.objects.filter(username__iexact=username).exists():
            return Response(
                {"message": "That username is already taken."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"message": "An account with this email already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(password)
        except ValidationError as exc:
            return Response(
                {"message": " ".join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )

        return Response(
            {
                "message": "Account created successfully.",
                "username": user.username,
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# REGULAR USER LOGIN
# ============================================================

class UserLoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        password = request.data.get("password", "")

        if not username or not password:
            return Response(
                {"message": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(
            request,
            username=username,
            password=password,
        )

        if user is None:
            return Response(
                {"message": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if user.is_staff:
            return Response(
                {
                    "message": (
                        "Please use the admin login for this account."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        login(request, user)

        return Response(
            {
                "message": "Login successful.",
                "username": user.username,
                "is_admin": False,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# REGULAR USER SESSION CHECK
# ============================================================

@method_decorator(ensure_csrf_cookie, name="dispatch")
class UserMeView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"authenticated": False},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if request.user.is_staff:
            return Response(
                {"message": "Please use the admin dashboard."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                "authenticated": True,
                "username": request.user.username,
                "is_admin": False,
                "csrfToken": get_token(request),
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# REGULAR USER LOGOUT
# ============================================================

class UserLogoutView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"message": "You are not logged in."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if request.user.is_staff:
            return Response(
                {"message": "Please use admin logout."},
                status=status.HTTP_403_FORBIDDEN,
            )

        logout(request)

        return Response(
            {"message": "Logout successful."},
            status=status.HTTP_200_OK,
        )


# ============================================================
# ADMIN AUTHENTICATION
# ============================================================

class AdminLoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {"message": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(
            request,
            username=username,
            password=password,
        )

        if user is None:
            return Response(
                {"message": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_staff:
            return Response(
                {"message": "You are not authorized as an admin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        login(request, user)

        return Response(
            {
                "message": "Login successful",
                "username": user.username,
            }
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class AdminMeView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(
            {
                "authenticated": True,
                "username": request.user.username,
                "csrfToken": get_token(request),
            }
        )


class AdminLogoutView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request):
        logout(request)
        return Response({"message": "Logout successful"})


# ============================================================
# ADMIN POLL MANAGEMENT
# ============================================================

class AdminPollListCreateView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        polls = Poll.objects.all().order_by("-created_at")
        return Response(PollSerializer(polls, many=True).data)

    def post(self, request):
        serializer = PollCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        poll = serializer.save()

        return Response(
            PollSerializer(poll).data,
            status=status.HTTP_201_CREATED,
        )


class AdminPollDetailView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get_poll(self, poll_id):
        return Poll.objects.filter(id=poll_id).first()

    def get(self, request, poll_id):
        poll = self.get_poll(poll_id)

        if not poll:
            return Response(
                {"message": "Poll not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(PollSerializer(poll).data)

    def patch(self, request, poll_id):
        poll = self.get_poll(poll_id)

        if not poll:
            return Response(
                {"message": "Poll not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        allowed = {"title", "description", "is_active"}

        for field in allowed.intersection(request.data.keys()):
            setattr(poll, field, request.data[field])

        poll.save()
        return Response(PollSerializer(poll).data)

    def delete(self, request, poll_id):
        poll = self.get_poll(poll_id)

        if not poll:
            return Response(
                {"message": "Poll not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if poll.participants.exists():
            return Response(
                {
                    "message": (
                        "This poll has participants. Close it instead "
                        "to preserve its results."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        poll.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# ADMIN PARTICIPANTS
# ============================================================

class AdminParticipantsView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        participants = Participant.objects.select_related(
            "poll"
        ).order_by("-submitted_at")

        poll_id = request.query_params.get("poll_id")

        if poll_id:
            participants = participants.filter(poll_id=poll_id)

        data = []

        for participant in participants:
            answers = PollResponse.objects.filter(
                participant=participant
            ).select_related("question", "selected_option")

            data.append(
                {
                    "id": participant.id,
                    "name": participant.name,
                    "poll_id": participant.poll_id,
                    "poll_title": participant.poll.title,
                    "submitted_at": participant.submitted_at,
                    "responses": [
                        {
                            "question": answer.question.text,
                            "option": answer.selected_option.text,
                        }
                        for answer in answers
                    ],
                }
            )

        return Response(data)


class AdminDeleteParticipantView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def delete(self, request, participant_id):
        participant = Participant.objects.filter(
            id=participant_id
        ).first()

        if not participant:
            return Response(
                {"message": "Participant not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        participant.delete()

        return Response(
            {"message": "Participant deleted successfully."}
        )


class AdminAddParticipantView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request):
        name = str(request.data.get("name", "")).strip()
        responses = request.data.get("responses")

        if not name:
            return Response(
                {"message": "Participant name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(responses, dict):
            return Response(
                {"message": "Please provide all answers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        poll_id = request.data.get("poll_id")

        if poll_id:
            poll = Poll.objects.filter(id=poll_id).first()
        else:
            poll = Poll.objects.filter(
                is_active=True
            ).order_by("id").first()

        if not poll:
            return Response(
                {"message": "Poll not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not poll.is_active:
            return Response(
                {"message": "This poll is closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        questions = list(poll.questions.all().order_by("order"))

        if len(responses) != len(questions):
            return Response(
                {"message": "Please answer all questions."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        validated = []

        for question in questions:
            option_id = responses.get(str(question.id))

            option = Option.objects.filter(
                id=option_id,
                question=question,
            ).first()

            if not option:
                return Response(
                    {
                        "message": (
                            f"Invalid or missing answer for: "
                            f"{question.text}"
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            validated.append((question, option))

        with transaction.atomic():
            participant = Participant.objects.create(
                poll=poll,
                name=name,
            )

            for question, option in validated:
                PollResponse.objects.create(
                    participant=participant,
                    question=question,
                    selected_option=option,
                )

        return Response(
            {
                "message": "Participant added successfully.",
                "participant_id": participant.id,
                "name": participant.name,
                "poll_id": poll.id,
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# ADMIN ANALYTICS
# ============================================================

class AnalyticsView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        poll_id = request.query_params.get("poll_id")

        if poll_id:
            poll = Poll.objects.filter(id=poll_id).first()
        else:
            poll = Poll.objects.filter(
                is_active=True
            ).order_by("id").first()

        if not poll:
            return Response(
                {"message": "Poll not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        participants = Participant.objects.filter(poll=poll)

        responses = PollResponse.objects.filter(
            participant__poll=poll
        )

        questions_data = []

        for question in poll.questions.all().order_by("order"):
            question_responses = responses.filter(question=question)
            total = question_responses.count()
            options_data = []

            for option in question.options.all():
                count = question_responses.filter(
                    selected_option=option
                ).count()

                percentage = round(
                    count * 100 / total, 1
                ) if total else 0

                options_data.append(
                    {
                        "id": option.id,
                        "text": option.text,
                        "count": count,
                        "percentage": percentage,
                    }
                )

            questions_data.append(
                {
                    "id": question.id,
                    "text": question.text,
                    "order": question.order,
                    "total_responses": total,
                    "options": options_data,
                }
            )

        return Response(
            {
                "poll": {
                    "id": poll.id,
                    "title": poll.title,
                    "description": poll.description,
                    "is_active": poll.is_active,
                },
                "total_participants": participants.count(),
                "total_responses": responses.count(),
                "total_questions": poll.questions.count(),
                "questions": questions_data,
            }
        )


# ============================================================
# LEGACY POLL STATUS ROUTES
# ============================================================

class AdminPollStatusView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        poll_id = request.query_params.get("poll_id")
        poll = get_selected_poll(request, poll_id=poll_id)

        if not poll:
            return Response(
                {"message": "Poll not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "id": poll.id,
                "title": poll.title,
                "is_active": poll.is_active,
            }
        )


class AdminTogglePollView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request):
        poll_id = request.data.get("poll_id")
        poll = get_selected_poll(request, poll_id=poll_id)

        if not poll:
            return Response(
                {"message": "Poll not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        poll.is_active = not poll.is_active
        poll.save(update_fields=["is_active"])

        return Response(
            {
                "message": (
                    "Poll opened successfully."
                    if poll.is_active
                    else "Poll closed successfully."
                ),
                "id": poll.id,
                "is_active": poll.is_active,
            }
        )
