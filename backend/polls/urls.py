from django.urls import path

from .views import (
    # Public poll views
    ActivePollView,
    SubmitPollView,
    PublicPollListView,

    # Regular user authentication
    UserRegistrationView,
    UserLoginView,
    UserMeView,
    UserLogoutView,

    # Admin authentication
    AdminLoginView,
    AdminMeView,
    AdminLogoutView,

    # Admin poll management
    AdminPollListCreateView,
    AdminPollDetailView,

    # Admin participants
    AdminParticipantsView,
    AdminAddParticipantView,
    AdminDeleteParticipantView,

    # Admin analytics and poll control
    AnalyticsView,
    AdminPollStatusView,
    AdminTogglePollView,
)

urlpatterns = [
    # Public poll list — support both URLs
    path(
        "public/polls/",
        PublicPollListView.as_view(),
        name="public-poll-list",
    ),
    path(
        "polls/",
        PublicPollListView.as_view(),
        name="public-polls",
    ),

    # Active poll and submission
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

    # Poll-specific share links
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

    # Regular user registration and authentication
    path(
        "register/",
        UserRegistrationView.as_view(),
        name="user-register",
    ),
    path(
        "user/login/",
        UserLoginView.as_view(),
        name="user-login",
    ),
    path(
        "user/me/",
        UserMeView.as_view(),
        name="user-me",
    ),
    path(
        "user/logout/",
        UserLogoutView.as_view(),
        name="user-logout",
    ),

    # Admin authentication
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

    # Admin poll management
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

    # Admin participants
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

    # Admin analytics
    path(
        "admin/analytics/",
        AnalyticsView.as_view(),
        name="admin-analytics",
    ),

    # Admin poll control
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