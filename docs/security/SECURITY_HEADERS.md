# Security Headers — Japan VIP (japanvip.vn)

> Nguồn chuẩn: `apps/web/next.config.ts` → hàm `headers()`. Áp dụng cho mọi route (`source: '/(.*)'`).
> Tài liệu này liệt kê **đúng** các header đang set + lý do + cách kiểm tra. Trạng thái: **Đã vá** (security headers đầy đủ).

---

## 1. Bảng header đang set

| Header | Giá trị (đúng như config) | Lý do |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Ép trình duyệt luôn dùng HTTPS trong 2 năm (63072000s), gồm cả subdomain; `preload` để được nhúng vào HSTS preload list. Chống downgrade/SSL-strip. |
| `X-Content-Type-Options` | `nosniff` | Cấm trình duyệt "đoán" MIME type. Chống tấn công kiểu upload file giả MIME rồi ép thực thi. |
| `X-Frame-Options` | `DENY` | Cấm nhúng site vào `<iframe>`. Chống clickjacking (legacy; trùng vai trò với CSP `frame-ancestors`). |
| `X-XSS-Protection` | `1; mode=block` | Bật bộ lọc XSS của trình duyệt cũ. Header legacy (Chrome/Edge mới đã bỏ) — giữ để bảo vệ trình duyệt cũ. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Khi sang domain khác chỉ gửi origin (không gửi full URL có query/token). Chống rò rỉ tham số nhạy cảm qua Referer. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Tắt hoàn toàn camera/mic/định vị cho site + mọi iframe con. Site không cần các quyền này → giảm bề mặt tấn công. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Cô lập browsing context khỏi cross-origin window. Chống XS-Leaks / tab-nabbing. |
| `Cross-Origin-Resource-Policy` | `same-site` | Chỉ cho tài nguyên của site được nạp bởi cùng site. Chống nạrộm tài nguyên từ origin khác. |
| `Content-Security-Policy` | (xem mục 2) | Whitelist nguồn script/style/ảnh… → tuyến phòng thủ chính chống XSS & data injection. |
| `X-Powered-By` | (đã **gỡ** — `poweredByHeader: false`) | Không lộ "Next.js" → giảm thông tin cho kẻ tấn công dò stack. |

> Lưu ý: header bảo mật cấp request khác (CSRF token, rate-limit, ký webhook VNPay, RBAC) **không** nằm ở đây mà ở tầng app/middleware — xem các tài liệu tương ứng.

---

## 2. Content-Security-Policy — giải thích từng directive

Giá trị thực tế (các directive nối bằng `; `):

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
font-src 'self' data:;
connect-src 'self' https:;
media-src 'self' https:;
frame-ancestors 'none'
```

| Directive | Ý nghĩa | Ghi chú |
|---|---|---|
| `default-src 'self'` | Mặc định mọi loại tài nguyên chỉ được tải từ chính domain. Các directive bên dưới là ngoại lệ ghi đè. | Nền an toàn — directive nào không khai báo riêng sẽ rơi về đây. |
| `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net` | JS chỉ chạy từ: chính site, inline script, GTM/GA4, Meta Pixel. | ⚠️ Có `'unsafe-inline'` — xem mục 3. Các domain ngoài đúng bằng các script tracking cần thiết. |
| `style-src 'self' 'unsafe-inline'` | CSS từ chính site + style inline. | `'unsafe-inline'` cần cho styled-jsx/inline style của Next + GA/Pixel. |
| `img-src 'self' data: https: blob:` | Ảnh từ: site, data-URI, **mọi** HTTPS, blob. | `https:` rộng vì ảnh sản phẩm/blog mirror từ nhiều nguồn (R2, Amazon, Rakuten…) + ảnh tối ưu. Rủi ro thấp (ảnh không thực thi). |
| `font-src 'self' data:` | Font từ site + data-URI nhúng. | Đủ cho font self-host; không cho CDN font ngoài. |
| `connect-src 'self' https:` | `fetch`/XHR/WebSocket tới site + **mọi** HTTPS endpoint. | Rộng để gọi GA4/Pixel/analytics. Có thể siết về danh sách domain cụ thể sau. |
| `media-src 'self' https:` | Audio/video từ site + mọi HTTPS. | Phục vụ video sản phẩm mirror từ nguồn ngoài. |
| `frame-ancestors 'none'` | Cấm tuyệt đối mọi trang nhúng site vào frame/iframe. | Chống clickjacking (bản CSP, mạnh hơn & thay thế `X-Frame-Options`). |

---

## 3. `'unsafe-inline'` — đang dùng & lộ trình bỏ

**Trạng thái: Pending** (chấp nhận tạm thời).

- `'unsafe-inline'` đang bật ở **`script-src`** và **`style-src`**.
- **Lý do:** GA4/GTM và Meta Pixel khởi tạo bằng inline `<script>` (snippet dán thẳng trong trang); một số style inline của Next/styled-jsx cũng cần. Bỏ ngay sẽ làm hỏng tracking + vỡ giao diện.
- **Rủi ro:** `'unsafe-inline'` ở `script-src` làm giảm hiệu lực CSP chống XSS (vì inline script độc vẫn chạy được). Đây là điểm yếu CSP còn lại đã ghi nhận.

**Lộ trình chuyển sang nonce (khuyến nghị, làm khi rảnh):**

| Bước | Việc | Done khi |
|---|---|---|
| 1 | Sinh `nonce` ngẫu nhiên mỗi request trong `middleware.ts` (vd `crypto.randomUUID()` / `randomBytes`). | Mỗi response có 1 nonce riêng. |
| 2 | Gắn `nonce={nonce}` vào mọi `<Script>`/`<script>` inline (GA4, Pixel) qua `next/script` + đọc nonce từ header. | Inline script đều mang nonce. |
| 3 | Đổi CSP: bỏ `'unsafe-inline'` ở `script-src`, thêm `'nonce-<value>'` + `'strict-dynamic'`. | CSP không còn `'unsafe-inline'` cho script. |
| 4 | `style-src`: cân nhắc giữ `'unsafe-inline'` (khó bỏ với styled-jsx) hoặc hash các style cố định. | Quyết định ghi lại. |
| 5 | Verify GA4 + Pixel vẫn bắn event, không lỗi CSP trong Console. | Không có lỗi `Refused to execute inline script`. |

> Vì CSP đang khai báo **tĩnh** trong `next.config.ts`, nonce phải chuyển sang set **động trong middleware** (config tĩnh không sinh nonce theo request được).

---

## 4. Cách verify (kiểm tra thực tế)

### 4.1 Bằng curl

```bash
curl -sI https://japanvip.vn | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy|cross-origin|x-xss|x-powered'
```

Kỳ vọng thấy (giá trị đúng như mục 1). Nếu **không** thấy `Content-Security-Policy` hoặc thấy `X-Powered-By: Next.js` → config chưa deploy hoặc bị tầng khác đè.

> `curl -I` (chỉ HEAD) đôi khi không trả đủ header như `GET`. Nếu thiếu, thử:
> ```bash
> curl -sD - -o /dev/null https://japanvip.vn
> ```

### 4.2 Bằng trình duyệt
- DevTools → tab **Network** → chọn document request → mục **Response Headers**.
- DevTools → **Console**: nếu CSP chặn nhầm sẽ có log `Refused to load/execute …`.

### 4.3 Công cụ online (kiểm điểm tổng thể)
- `https://securityheaders.com` → nhập `japanvip.vn` → nhắm hạng A trở lên.
- `https://hstspreload.org` → kiểm tra đủ điều kiện vào HSTS preload list (do có `preload`).

---

## 5. Ghi chú Cloudflare (quan trọng — tránh trùng/đè header)

Cloudflare đứng **trước** Vercel, nên header thực khách nhận = kết quả sau khi Cloudflare xử lý. Cần lưu ý:

- **Có thể bị chồng (duplicate) header.** Nếu bật "Security Headers" / Transform Rules trên Cloudflare *đồng thời* với `next.config.ts`, một số header (vd HSTS, X-Frame-Options) có thể xuất hiện **2 lần** hoặc bị Cloudflare ghi đè giá trị. → Chọn **một** nơi quản lý header (khuyến nghị: giữ ở `next.config.ts` để versioned theo code; tắt phần header trùng trên Cloudflare).
- **HSTS:** nếu Cloudflare bật HSTS riêng, kiểm tra `max-age`/`includeSubDomains`/`preload` khớp nhau, tránh 2 dòng mâu thuẫn.
- **CSP:** Cloudflare (Rocket Loader, một số app/feature) có thể chèn script → vướng CSP. Nếu bật Rocket Loader mà script vỡ, hoặc tắt Rocket Loader, hoặc thêm nguồn vào `script-src`.
- **Cách kiểm khi nghi ngờ trùng:** xem có header xuất hiện nhiều dòng không:
  ```bash
  curl -sD - -o /dev/null https://japanvip.vn | grep -ci 'strict-transport-security'
  ```
  Kết quả `> 1` nghĩa là đang set trùng (Cloudflare + app).

---

## 6. Liên quan / Pending khác (tham chiếu)

| Hạng mục | Trạng thái |
|---|---|
| Bộ security headers (mục 1) | **Đã vá** |
| `frame-ancestors 'none'` chống clickjacking | **Đã vá** |
| Gỡ `X-Powered-By` | **Đã vá** |
| Bỏ `'unsafe-inline'` → nonce (CSP) | **Pending** (mục 3) |
| Cloudflare WAF / Turnstile / bảo vệ origin-IP | **Pending** (bật phía Cloudflare) |
| Siết `connect-src`/`img-src` từ `https:` → danh sách domain cụ thể | **Pending** (tùy chọn, hạ rủi ro nhẹ) |

> Khi sửa CSP/headers: chỉ sửa trong `apps/web/next.config.ts`, rồi verify lại bằng mục 4 + kiểm trùng Cloudflare ở mục 5 trước khi báo xong.
