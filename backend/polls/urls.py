from django.urls import path

from .views import (
    ActivePollView,
    SubmitPollView,
    PublicPollListView,
    AdminLoginView,
    AdminMeView,
    AdminLogoutView,
    AdminPollListCreateView,
    AdminPollDetailView,
    AdminParticipantsView,
    AdminAddParticipantView,
    AdminDeleteParticipantView,
    AnalyticsView,
    AdminPollStatusView,
    AdminTogglePollView,
)

urlpatterns = [
    # PUBLIC POLL LIST — participants can browse active polls
    path(
        "public/polls/",
        PublicPollListView.as_view(),
        name="public-poll-list",
    ),

    # PUBLIC POLL — existing IPL routes
    path(
        "poll/",
        ActivePollView.as_view(),
        name="active-poll",
    ),
    path(
        "submit/",
        SubmitPollView.as_view(),
        name="submit-poll",
    ),

    # PUBLIC POLL — poll-specific share links
    path(
        "poll/<int:poll_id>/",
        ActivePollView.as_view(),
        name="poll-detail-public",
    ),
    path(
        "submit/<int:poll_id>/",
        SubmitPollView.as_view(),
        name="submit-specific-poll",
    ),

    # ADMIN AUTHENTICATION
    path(
        "admin/login/",
        AdminLoginView.as_view(),
        name="admin-login",
    ),
    path(
        "admin/me/",
        AdminMeView.as_view(),
        name="admin-me",
    ),
    path(
        "admin/logout/",
        AdminLogoutView.as_view(),
        name="admin-logout",
    ),

    # ADMIN POLL MANAGEMENT
    path(
        "admin/polls/",
        AdminPollListCreateView.as_view(),
        name="admin-polls",
    ),
    path(
        "admin/polls/<int:poll_id>/",
        AdminPollDetailView.as_view(),
        name="admin-poll-detail",
    ),

    # ADMIN PARTICIPANTS
    path(
        "admin/participants/",
        AdminParticipantsView.as_view(),
        name="admin-participants",
    ),
    path(
        "admin/participants/add/",
        AdminAddParticipantView.as_view(),
        name="admin-add-participant",
    ),
    path(
        "admin/participants/<int:participant_id>/",
        AdminDeleteParticipantView.as_view(),
        name="admin-delete-participant",
    ),

    # ADMIN ANALYTICS
    path(
        "admin/analytics/",
        AnalyticsView.as_view(),
        name="admin-analytics",
    ),

    # ADMIN POLL CONTROL
    path(
        "admin/poll/status/",
        AdminPollStatusView.as_view(),
        name="admin-poll-status",
    ),
    path(
        "admin/poll/toggle/",
        AdminTogglePollView.as_view(),
        name="admin-poll-toggle",
    ),
]