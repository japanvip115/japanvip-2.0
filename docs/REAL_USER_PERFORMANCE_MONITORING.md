# Theo dõi hiệu năng người dùng thật (RUM — Core Web Vitals)

Hệ thống đo **Core Web Vitals của khách thật** truy cập japanvip.vn, để quyết định tối ưu dựa trên dữ liệu thực thay vì điểm lab PageSpeed (vốn dao động mạnh theo điều kiện server test).

## Đo gì

| Chỉ số | Ý nghĩa | Tốt (≤) | Cần cải thiện (≤) | Kém (>) |
|---|---|---|---|---|
| **LCP** | Thời điểm nội dung lớn nhất hiện ra | 2.5 s | 4.0 s | 4.0 s |
| **INP** | Độ trễ phản hồi khi khách tương tác | 200 ms | 500 ms | 500 ms |
| **CLS** | Độ xê dịch bố cục | 0.10 | 0.25 | 0.25 |
| **FCP** | Thời điểm vẽ nội dung đầu tiên | 1.8 s | 3.0 s | 3.0 s |
| **TTFB** | Thời gian tới byte đầu tiên (server) | 0.8 s | 1.8 s | 1.8 s |

Chỉ số chuẩn là **p75** (phân vị 75) — đúng cái Google dùng để xếp loại trang trong CrUX. Nghĩa là 75% lượt truy cập nhanh hơn hoặc bằng giá trị này.

## Cách hoạt động (không làm chậm trang)

1. Thư viện `web-vitals` (~1.5KB) nạp **động sau khi trang mount** → không chặn render, không đụng LCP/TBT.
2. Mỗi chỉ số gửi về server qua `navigator.sendBeacon('/api/v1/vitals')` — chạy nền lúc rời/ẩn trang, **không chặn UI**, bắt được cả khách thoát nhanh.
3. Server ([api/v1/vitals/route.ts](../apps/web/src/app/api/v1/vitals/route.ts)) validate chặt, gắn thêm **quốc gia** (header Cloudflare `cf-ipcountry`) + **thiết bị/trình duyệt** (User-Agent), lưu vào Redis (danh sách giới hạn 10.000 mẫu mới nhất).
4. Trình thu thập: [web-vitals-reporter.tsx](../apps/web/src/components/perf/web-vitals-reporter.tsx). **Bỏ qua localhost** để dev không làm bẩn dữ liệu thật.

Không thu thập dữ liệu cá nhân — chỉ: chỉ số, route, thiết bị, trình duyệt, quốc gia (cấp ISO-2), loại kết nối (4g/3g…).

## Xem ở đâu

**Admin → Cài Đặt → Hiệu Năng (CWV)** (`/admin/performance`). Trang hiển thị:

- **Tổng quan p75 theo thiết bị** — 5 chỉ số × (mobile / desktop / tất cả), tô màu theo ngưỡng.
- **Mobile theo trang** — LCP & INP p75 từng route (homepage = `/`). Đây là cơ sở quyết định tối ưu.
- **Phân tách** — LCP mobile p75 theo quốc gia / trình duyệt / kết nối.

Route động được gộp về pattern (`/san-pham/[slug]`, `/blog/[slug]`…) để dễ đọc.

## Ngưỡng cảnh báo & khi nào hành động

Theo dõi tối thiểu **7–14 ngày** để gom đủ mẫu (lý tưởng ≥ vài trăm mẫu/route trên mobile).

**Chỉ tiến hành tối ưu sâu (vd tách RSC giảm JS hydration) khi dữ liệu THẬT cho thấy:**

- 🔴 **LCP p75 mobile > 2.5 s**, hoặc
- 🔴 **INP p75 mobile > 200 ms**

trên trang quan trọng (homepage, danh mục, sản phẩm) với đủ mẫu.

Nếu p75 mobile vẫn **xanh** dù điểm lab PageSpeed dao động 68–84 → **không cần làm gì**: khách thật đang nhanh, điểm lab thấp chỉ là điều kiện test của Google (server xa, ép CPU mạnh). Lab **không** ảnh hưởng thứ hạng SEO — Google xếp hạng bằng CrUX (chính là dữ liệu kiểu này).

## Lưu ý vận hành

- Dữ liệu là **cửa sổ 10.000 mẫu gần nhất** (đủ cho p75 ổn định). Site lưu lượng cao thì cửa sổ là vài giờ/ngày gần nhất; lưu lượng thấp thì trải dài hơn.
- Redis trống / chưa có mẫu → trang báo "Chưa có dữ liệu" (cần vài lượt khách thật đầu tiên).
- Muốn đối chiếu: Google Search Console → "Chỉ số thiết yếu về trang web" cũng dùng CrUX (cần ~28 ngày + đủ traffic mới hiện).
