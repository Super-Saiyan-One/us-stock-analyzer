import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import stock, options, screener

app = FastAPI(title="US Stock Analyzer API")

origins = ["http://localhost:3000"]
if os.environ.get("FRONTEND_URL"):
    origins.append(os.environ["FRONTEND_URL"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(stock.router, prefix="/stock", tags=["stock"])
app.include_router(options.router, prefix="/stock", tags=["options"])
app.include_router(screener.router, prefix="/screener", tags=["screener"])


@app.get("/health")
def health():
    return {"status": "ok"}
