from django.core.management.base import BaseCommand
from django.db import transaction

from polls.models import Poll, Question, Option


class Command(BaseCommand):
    help = "Create or update the default polls, questions, and options safely."

    POLLS_DATA = [
        {
            "title": "OFFICE",
            "description": "Office description",
            "questions": [
                {
                    "text": "How satisfied are you with your office environment?",
                    "options": [
                        "Very satisfied", "Satisfied", "Neutral",
                        "Dissatisfied", "Very dissatisfied",
                    ],
                },
                {
                    "text": "What would improve your workplace?",
                    "options": [
                        "Better communication", "Better facilities",
                        "Flexible working hours", "Teamwork", "Other",
                    ],
                },
            ],
        },
        {
            "title": "Government Election Survey",
            "description": (
                "This survey collects public opinions about election issues, "
                "government priorities, and voter awareness. Participation is voluntary."
            ),
            "questions": [
                {
                    "text": "Which issue should be the government's top priority?",
                    "options": [
                        "Employment", "Education", "Healthcare",
                        "Infrastructure", "Other",
                    ],
                },
                {
                    "text": "How satisfied are you with public services?",
                    "options": [
                        "Very satisfied", "Satisfied", "Neutral",
                        "Dissatisfied", "Very dissatisfied",
                    ],
                },
                {
                    "text": "How important is voter awareness?",
                    "options": [
                        "Very important", "Important",
                        "Moderately important", "Not important",
                    ],
                },
                {
                    "text": "How do you usually learn about elections?",
                    "options": [
                        "Television", "Newspapers", "Social media",
                        "Official websites", "Friends and family",
                    ],
                },
            ],
        },
        {
            "title": "Technology Preference Poll",
            "description": (
                "Understand which programming languages, frameworks, "
                "and technologies people prefer."
            ),
            "questions": [
                {
                    "text": "Which programming language do you prefer?",
                    "options": [
                        "Python", "JavaScript", "Java", "C++", "Other",
                    ],
                },
                {
                    "text": "Which frontend framework do you prefer?",
                    "options": ["React", "Angular", "Vue", "Other"],
                },
                {
                    "text": "Which database do you prefer?",
                    "options": [
                        "PostgreSQL", "MySQL", "MongoDB", "SQLite", "Other",
                    ],
                },
                {
                    "text": "Which development area interests you most?",
                    "options": [
                        "Web development", "Artificial intelligence",
                        "Data science", "Mobile development", "Cybersecurity",
                    ],
                },
            ],
        },
        {
            "title": "Employee Satisfaction Poll",
            "description": (
                "Collect employee feedback about the work environment, "
                "teamwork, management, and overall job satisfaction."
            ),
            "questions": [
                {
                    "text": "How satisfied are you with your job?",
                    "options": [
                        "Very satisfied", "Satisfied", "Neutral",
                        "Dissatisfied", "Very dissatisfied",
                    ],
                },
                {
                    "text": "How would you rate teamwork in your workplace?",
                    "options": ["Excellent", "Good", "Average", "Poor"],
                },
                {
                    "text": "How supportive is your management?",
                    "options": [
                        "Very supportive", "Supportive", "Neutral",
                        "Unsupportive",
                    ],
                },
                {
                    "text": "Would you recommend your workplace to others?",
                    "options": [
                        "Definitely", "Probably", "Not sure",
                        "Probably not", "Definitely not",
                    ],
                },
            ],
        },
        {
            "title": "Student Feedback Survey",
            "description": "Collect feedback to improve college facilities.",
            "questions": [
                {
                    "text": "How would you rate your college facilities?",
                    "options": ["Excellent", "Good", "Average", "Poor"],
                },
                {
                    "text": "What should the college improve first?",
                    "options": [
                        "Classrooms", "Library", "Laboratories",
                        "Sports facilities", "Other",
                    ],
                },
            ],
        },
        {
            "title": "College Election 2026",
            "description": "Share your opinion about the college election.",
            "questions": [
                {
                    "text": "Which quality matters most in a college representative?",
                    "options": [
                        "Leadership", "Communication", "Responsibility",
                        "Fairness", "Other",
                    ],
                },
            ],
        },
        {
            "title": "IPL 2029 Prediction Poll",
            "description": "Share your opinion by participating in this poll.",
            "questions": [
                {
                    "text": "Which IPL team will win IPL 2029?",
                    "options": [
                        "RCB", "CSK", "RR", "KKR", "SRH",
                        "PBKS", "DC", "MI", "GT", "LSG",
                    ],
                },
                {
                    "text": "Why can this team win IPL 2029?",
                    "options": [
                        "Strong batting", "Strong bowling", "Good captaincy",
                        "Strong all-rounders", "Previous performance",
                        "Team consistency", "Good team combination",
                        "Experienced players", "Young talented players", "Other",
                    ],
                },
                {
                    "text": "What is the biggest challenge for this team in IPL 2029?",
                    "options": [
                        "Injuries", "Poor batting", "Poor bowling", "Pressure",
                        "Team combination", "Captaincy", "Lack of experience",
                        "Inconsistent performance", "Player form", "Other",
                    ],
                },
                {
                    "text": "What is the most important factor for winning IPL 2029?",
                    "options": [
                        "Strong batting", "Strong bowling", "Quality all-rounders",
                        "Good captaincy", "Team combination", "Player experience",
                        "Young talented players", "Consistency", "Player fitness",
                        "Match strategy", "Pressure handling", "Strong fielding",
                        "Bench strength", "Home advantage", "Other",
                    ],
                },
                {
                    "text": "How confident are you about your prediction?",
                    "options": [
                        "Very confident", "Confident", "Neutral",
                        "Not very confident", "Not confident",
                    ],
                },
            ],
        },
    ]

    @transaction.atomic
    def handle(self, *args, **options):
        created_polls = 0
        existing_polls = 0
        created_questions = 0
        created_options = 0

        for poll_data in self.POLLS_DATA:
            # Handle duplicate poll titles without raising an exception.
            poll = Poll.objects.filter(
                title=poll_data["title"]
            ).order_by("id").first()

            if poll is None:
                poll = Poll.objects.create(
                    title=poll_data["title"],
                    description=poll_data["description"],
                    is_active=True,
                )
                created_polls += 1
            else:
                existing_polls += 1
                changed = False

                if poll.description != poll_data["description"]:
                    poll.description = poll_data["description"]
                    changed = True

                if not poll.is_active:
                    poll.is_active = True
                    changed = True

                if changed:
                    poll.save()

            for order, question_data in enumerate(
                poll_data["questions"], start=1
            ):
                # Select the first matching question to handle duplicates.
                question = Question.objects.filter(
                    poll=poll,
                    order=order,
                ).order_by("id").first()

                if question is None:
                    question = Question.objects.create(
                        poll=poll,
                        order=order,
                        text=question_data["text"],
                    )
                    created_questions += 1
                elif question.text != question_data["text"]:
                    question.text = question_data["text"]
                    question.save(update_fields=["text"])

                for option_text in question_data["options"]:
                    # Do not use get_or_create: duplicate rows may already exist.
                    option_exists = Option.objects.filter(
                        question=question,
                        text=option_text,
                    ).exists()

                    if not option_exists:
                        Option.objects.create(
                            question=question,
                            text=option_text,
                        )
                        created_options += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Seed completed successfully. "
                f"New polls: {created_polls}; "
                f"existing polls: {existing_polls}; "
                f"new questions: {created_questions}; "
                f"new options: {created_options}."
            )
        )
