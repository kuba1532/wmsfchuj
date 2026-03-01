from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    products,
    locations,
    stock,
    documents,
    tasks,
    inventory,
    reports,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(products.router)
api_router.include_router(locations.router)
api_router.include_router(stock.router)
api_router.include_router(documents.router)
api_router.include_router(tasks.router)
api_router.include_router(inventory.router)
api_router.include_router(reports.router)