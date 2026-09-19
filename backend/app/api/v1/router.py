from fastapi import APIRouter
from app.api.v1 import auth, contacts, conversations, ai, settings, analytics, whatsapp, admin

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(contacts.router)
api_router.include_router(conversations.router)
api_router.include_router(ai.router)
api_router.include_router(settings.router)
api_router.include_router(analytics.router)
api_router.include_router(whatsapp.router)
api_router.include_router(admin.router)
