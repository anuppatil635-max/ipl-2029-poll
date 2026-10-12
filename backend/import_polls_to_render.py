"""Safely import local poll/question/option data into the database configured for Django.

Run only after setting DATABASE_URL to the Render database's *external* connection URL.
This script never deletes records and does not import participants or responses.
"""
import json
import os
from pathlib import Path

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.db import connection, transaction
from polls.models import Poll, Question, Option

BACKUP_FILE = Path(__file__).resolve().parent / "polls_backup.json"


def load_backup():
    with BACKUP_FILE.open("r", encoding="utf-8") as file:
        records = json.load(file)
    return (
        [r for r in records if r.get("model") == "polls.poll"],
        [r for r in records if r.get("model") == "polls.question"],
        [r for r in records if r.get("model") == "polls.option"],
    )


def question_signature(local_poll_id, question_records, option_records):
    """Use question/option content to distinguish polls with identical titles."""
    questions = [r for r in question_records if r["fields"].get("poll") == local_poll_id]
    signature = []
    for q in sorted(questions, key=lambda r: (r["fields"].get("order", 1), r["fields"].get("text", ""))):
        qid = q["pk"]
        options = sorted(
            o["fields"].get("text", "")
            for o in option_records
            if o["fields"].get("question") == qid
        )
        signature.append((q["fields"].get("order", 1), q["fields"].get("text", ""), tuple(options)))
    return tuple(signature)


@transaction.atomic
def import_polls():
    if not os.getenv("DATABASE_URL"):
        raise RuntimeError(
            "DATABASE_URL is not set in this terminal. Stop: this would otherwise use your local database."
        )

    db_name = connection.settings_dict.get("NAME", "")
    db_host = connection.settings_dict.get("HOST", "")
    print(f"Target database host: {db_host}")
    print(f"Target database name: {db_name}")
    if not db_host or db_host in {"localhost", "localhost", "::1"}:
        raise RuntimeError(
            "The configured database host looks local. Import cancelled to protect your local database."
        )

    poll_records, question_records, option_records = load_backup()
    if not poll_records:
        raise RuntimeError("No polls found in polls_backup.json")

    # Identify each source poll by its content, not title alone, so the active and
    # inactive College Election 2026 polls remain separate.
    source_signatures = {
        r["pk"]: question_signature(r["pk"], question_records, option_records)
        for r in poll_records
    }

    poll_map = {}
    used_target_ids = set()

    for record in poll_records:
        fields = record["fields"]
        local_id = record["pk"]
        candidates = Poll.objects.filter(
            title=fields["title"],
            description=fields.get("description", ""),
            is_active=fields.get("is_active", True),
        ).order_by("id")

        matched = None
        wanted_signature = source_signatures[local_id]
        for candidate in candidates:
            if candidate.id in used_target_ids:
                continue
            existing_signature = tuple(
                (q.order, q.text, tuple(sorted(q.options.values_list("text", flat=True))))
                for q in candidate.questions.prefetch_related("options").order_by("order", "id")
            )
            if existing_signature == wanted_signature:
                matched = candidate
                break

        if matched is None:
            matched = Poll.objects.create(
                title=fields["title"],
                description=fields.get("description", ""),
                is_active=fields.get("is_active", True),
            )
            print(f"Created poll: {matched.title} (Render ID {matched.id})")
        else:
            print(f"Matched existing poll: {matched.title} (Render ID {matched.id})")

        poll_map[local_id] = matched
        used_target_ids.add(matched.id)

    question_map = {}
    for record in question_records:
        fields = record["fields"]
        local_question_id = record["pk"]
        poll = poll_map.get(fields.get("poll"))
        if poll is None:
            continue

        question = Question.objects.filter(
            poll=poll,
            text=fields["text"],
            order=fields.get("order", 1),
        ).first()
        if question is None:
            question = Question.objects.create(
                poll=poll,
                text=fields["text"],
                order=fields.get("order", 1),
            )
            print(f"  Added question to {poll.title}: {question.text}")
        question_map[local_question_id] = question

    for record in option_records:
        fields = record["fields"]
        question = question_map.get(fields.get("question"))
        if question is None:
            continue
        Option.objects.get_or_create(question=question, text=fields["text"])

    print("\nImport finished. No existing records were deleted.")
    print(f"Polls: {Poll.objects.count()}")
    print(f"Questions: {Question.objects.count()}")
    print(f"Options: {Option.objects.count()}")
    print("Note: participants and responses were not transferred by this script.")


if __name__ == "__main__":
    if not BACKUP_FILE.exists():
        raise FileNotFoundError(f"Backup not found: {BACKUP_FILE}")
    import_polls()
