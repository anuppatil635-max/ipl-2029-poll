from django.core.management.base import BaseCommand
from polls.models import Poll, Question, Option


class Command(BaseCommand):
    help = "Create the IPL 2029 poll if it does not already exist."

    def handle(self, *args, **options):

        poll, created = Poll.objects.get_or_create(
            title="IPL 2029 Prediction Poll",
            defaults={"is_active": True},
        )

        if not created:
            poll.is_active = True
            poll.save()

        questions = [
            (
                "Which IPL team will win IPL 2029?",
                [
                    "RCB", "CSK", "RR", "KKR", "SRH",
                    "PBKS", "DC", "MI", "GT", "LSG"
                ],
            ),
            (
                "Why can this team win IPL 2029?",
                [
                    "Strong batting",
                    "Strong bowling",
                    "Good captaincy",
                    "Strong all-rounders",
                    "Previous performance",
                    "Team consistency",
                    "Good team combination",
                    "Experienced players",
                    "Young talented players",
                    "Other",
                ],
            ),
            (
                "What is the biggest challenge for this team in IPL 2029?",
                [
                    "Injuries",
                    "Poor batting",
                    "Poor bowling",
                    "Pressure",
                    "Team combination",
                    "Captaincy",
                    "Lack of experience",
                    "Inconsistent performance",
                    "Player form",
                    "Other",
                ],
            ),
            (
                "What is the most important factor for winning IPL 2029?",
                [
                    "Strong batting",
                    "Strong bowling",
                    "Quality all-rounders",
                    "Good captaincy",
                    "Team combination",
                    "Player experience",
                    "Young talented players",
                    "Consistency",
                    "Player fitness",
                    "Match strategy",
                    "Pressure handling",
                    "Strong fielding",
                    "Bench strength",
                    "Home advantage",
                    "Other",
                    "Other",
                ],
            ),
            (
                "How confident are you about your prediction?",
                [
                    "Very confident",
                    "Confident",
                    "Neutral",
                    "Not very confident",
                    "Not confident",
                ],
            ),
        ]

        for order, (question_text, option_list) in enumerate(
            questions, start=1
        ):
            question, _ = Question.objects.get_or_create(
                poll=poll,
                order=order,
                defaults={"text": question_text},
            )

            if question.text != question_text:
                question.text = question_text
                question.save()





            for option_text in option_list:
                option = Option.objects.filter(
                    question=question,
                    text=option_text
                ).first()

                if not option:
                    Option.objects.create(
                        question=question,
                        text=option_text
                    )

        self.stdout.write(
            self.style.SUCCESS(
                "IPL 2029 poll created/verified successfully."
            )
        )