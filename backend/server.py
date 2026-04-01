"""
FastAPI Proxy Server for Giggles Next.js Backend
This server proxies all /api/* requests to the Next.js backend running on port 3001
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import httpx
import os

app = FastAPI(title="Giggles API Proxy")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NEXTJS_BACKEND_URL = "http://localhost:3001"

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "giggles-proxy", "nextjs_backend": NEXTJS_BACKEND_URL}

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_to_nextjs(request: Request, path: str):
    """Proxy all API requests to Next.js backend"""
    target_url = f"{NEXTJS_BACKEND_URL}/api/{path}"
    
    # Get query params
    if request.query_params:
        target_url += f"?{request.query_params}"
    
    # Get headers (filter out host)
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ['host', 'content-length']}
    
    # Get body if present
    body = None
    if request.method in ["POST", "PUT", "PATCH"]:
        body = await request.body()
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
            )
            
            # Return the response
            response_headers = dict(response.headers)
            # Remove transfer-encoding to avoid issues
            response_headers.pop('transfer-encoding', None)
            response_headers.pop('content-encoding', None)
            
            return StreamingResponse(
                iter([response.content]),
                status_code=response.status_code,
                headers=response_headers,
                media_type=response.headers.get('content-type', 'application/json')
            )
        except httpx.ConnectError:
            return JSONResponse(
                status_code=503,
                content={"error": "Next.js backend not available", "target": target_url}
            )
        except Exception as e:
            return JSONResponse(
                status_code=500,
                content={"error": str(e), "target": target_url}
            )

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "app": "Giggles - Family Memory Sharing Platform",
        "status": "running",
        "api_docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
