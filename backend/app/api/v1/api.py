from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    auth,
    businesses,
    products,
    inventory,
    invoices,
    purchases,
    expenses,
    customers,
    suppliers,
    analytics,
    forecasts,
    documents,
    recommendations,
    ai,
    imports
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(businesses.router)
api_router.include_router(products.router)
api_router.include_router(inventory.router)
api_router.include_router(invoices.router)
api_router.include_router(purchases.router)
api_router.include_router(expenses.router)
api_router.include_router(customers.router)
api_router.include_router(suppliers.router)
api_router.include_router(analytics.router)
api_router.include_router(forecasts.router)
api_router.include_router(documents.router)
api_router.include_router(recommendations.router)
api_router.include_router(ai.router)
api_router.include_router(imports.router)
