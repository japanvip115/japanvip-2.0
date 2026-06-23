"""
Crawl4AI service cho Japan VIP — cào trang (hãng/kakaku/VN reference) → markdown + ảnh.
Chỉ chạy LOCAL (127.0.0.1). Next.js gọi qua HTTP.

Chạy:  ./services/crawler/.venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port 8787
       (cwd = services/crawler)
"""
import re
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode, BrowserConfig

# Token chia sẻ (tùy chọn) — đặt CRAWLER_TOKEN ở cả service và Next.js để chặn gọi lạ
TOKEN = os.environ.get("CRAWLER_TOKEN", "")

_crawler: AsyncWebCrawler | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global _crawler
    _crawler = AsyncWebCrawler(config=BrowserConfig(headless=True, verbose=False))
    await _crawler.start()
    try:
        yield
    finally:
        await _crawler.close()


app = FastAPI(title="JapanVIP Crawler", lifespan=lifespan)


class CrawlReq(BaseModel):
    url: str
    wait_for: str | None = None       # CSS selector chờ render (vd ".product-gallery")
    max_images: int = 60
    min_width: int = 300              # bỏ ảnh nhỏ (icon)


JUNK_RE = re.compile(
    r"(no[_-]?image|placeholder|sprite|favicon|/btn_|button|/icons?/|spacer|blank\.|1x1|"
    r"admin-ajax|loading|avatar|logo|thumb_overlay|banner|/ads?/|pixel)",
    re.I,
)


def is_junk(url: str) -> bool:
    if not url or not url.startswith("http"):
        return True
    if re.search(r"\.(svg|gif)(\?|$)", url, re.I):
        return True
    return bool(JUNK_RE.search(url))


def dedup_key(url: str) -> str:
    # Gộp biến thể size WordPress (…-800x720.jpg → …jpg)
    return re.sub(r"-\d{2,4}x\d{2,4}(?=\.\w+)", "", url).split("?")[0]


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/crawl")
async def crawl(req: CrawlReq, x_crawler_token: str = Header(default="")):
    if TOKEN and x_crawler_token != TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")

    cfg = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        page_timeout=35000,
        wait_for=req.wait_for or None,
        scan_full_page=True,      # cuộn hết trang để lazy-load ảnh
        word_count_threshold=5,
    )
    try:
        res = await _crawler.arun(req.url, config=cfg)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Crawl failed: {e}")

    if not res.success:
        raise HTTPException(status_code=502, detail=res.error_message or "Crawl failed")

    seen: set[str] = set()
    images = []
    for im in (res.media or {}).get("images", []):
        src = im.get("src") or ""
        if is_junk(src):
            continue
        w = im.get("width") or 0
        try:
            w = int(w)
        except (ValueError, TypeError):
            w = 0
        if w and w < req.min_width:
            continue
        key = dedup_key(src)
        if key in seen:
            continue
        seen.add(key)
        images.append({
            "url": src,
            "alt": (im.get("alt") or "")[:200],
            "width": w,
            "score": im.get("score") or 0,
        })
        if len(images) >= req.max_images:
            break

    # Ảnh điểm cao / lớn lên trước
    images.sort(key=lambda x: (x["score"], x["width"]), reverse=True)

    return {
        "success": True,
        "title": (res.metadata or {}).get("title", ""),
        "markdown": res.markdown.raw_markdown or "",
        "images": images,
        "image_count": len(images),
    }
