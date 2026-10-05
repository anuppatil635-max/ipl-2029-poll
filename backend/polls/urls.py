from django.urls import path

from .views import (
    ActivePollView,
    SubmitPollView,
    AdminLoginView,
    AdminMeView,
    AdminLogoutView,
    AdminParticipantsView,
    AnalyticsView,
    AdminPollStatusView,
    AdminTogglePollView,
    AdminDeleteParticipantView,
    AdminAddParticipantView,
)


urlpatterns = [

    # PUBLIC POLL
    path(
        "poll/",
        ActivePollView.as_view(),
        name="active-poll"
    ),

    path(
        "submit/",
        SubmitPollView.as_view(),
        name="submit-poll"
    ),


    # ADMIN AUTH
    path(
        "admin/login/",
        AdminLoginView.as_view(),
        name="admin-login"
    ),

    path(
        "admin/me/",
        AdminMeView.as_view(),
        name="admin-me"
    ),

    path(
        "admin/logout/",
        AdminLogoutView.as_view(),
        name="admin-logout"
    ),


    # ADMIN PARTICIPANTS
    path(
        "admin/participants/",
        AdminParticipantsView.as_view(),
        name="admin-participants"
    ),

    path(
        "admin/participants/add/",
        AdminAddParticipantView.as_view(),
        name="admin-add-participant"
    ),

    path(
        "admin/participants/<int:participant_id>/",
        AdminDeleteParticipantView.as_view(),
        name="admin-delete-participant"
    ),


    # ADMIN ANALYTICS
    path(
        "admin/analytics/",
        AnalyticsView.as_view(),
        name="admin-analytics"
    ),


    # ADMIN POLL CONTROL
    path(
        "admin/poll/status/",
        AdminPollStatusView.as_view(),
        name="admin-poll-status"
    ),

    path(
        "admin/poll/toggle/",
        AdminTogglePollView.as_view(),
        name="admin-poll-toggle"
    ),
]