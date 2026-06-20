export type TemplateKey =
  | 'quat-dien'
  | 'bep-tu'
  | 'tu-lanh'
  | 'may-giat'
  | 'noi-com-dien'
  | 'may-loc-khong-khi'
  | 'may-hut-bui'
  | 'may-nuoc-nong'
  | 'bon-cau'
  | 'dieu-hoa'
  | 'may-say-toc'
  | 'lo-vi-song'
  | 'chung'

export type Template = {
  key: TemplateKey
  label: string
  icon: string
  html: string
}

// ─── Helper to wrap placeholder text ────────────────────────────────────────
// Admin nhìn thấy [[PLACEHOLDER]] rõ ràng để biết chỗ cần điền
const P = (text: string) => `<mark data-color="#fef08a" style="background-color:#fef08a;color:#000">${text}</mark>`

// ─── Templates ───────────────────────────────────────────────────────────────

export const PRODUCT_TEMPLATES: Template[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'quat-dien',
    label: 'Quạt điện',
    icon: '🌀',
    html: `
<h2>${P('[TÊN SẢN PHẨM ĐẦY ĐỦ]')}</h2>
<p>${P('[TÊN THƯƠNG HIỆU]')} ${P('[MODEL]')} là dòng quạt ${P('[loại: cây / bàn / trần / tường]')} cao cấp ${P('[xuất xứ: Nhật / Đức / Hàn]')}, được thiết kế để ${P('[lợi ích nổi bật nhất]')}. Với công nghệ ${P('[tên công nghệ]')}, quạt vận hành ${P('[đặc điểm: êm / mạnh / tiết kiệm điện]')} — lý tưởng cho ${P('[không gian phù hợp: phòng ngủ / văn phòng / phòng khách]')}.</p>

<h3>Tại sao chọn ${P('[TÊN MODEL]')}?</h3>
<ul>
  <li><strong>${P('[Tính năng 1]')}:</strong> ${P('[Mô tả ngắn lợi ích tính năng 1]')}</li>
  <li><strong>${P('[Tính năng 2]')}:</strong> ${P('[Mô tả ngắn lợi ích tính năng 2]')}</li>
  <li><strong>${P('[Tính năng 3]')}:</strong> ${P('[Mô tả ngắn lợi ích tính năng 3]')}</li>
  <li><strong>${P('[Tính năng 4]')}:</strong> ${P('[Mô tả ngắn lợi ích tính năng 4]')}</li>
  <li><strong>${P('[Tính năng 5]')}:</strong> ${P('[Mô tả ngắn lợi ích tính năng 5]')}</li>
</ul>

<h3>So sánh các chế độ gió</h3>
<table>
  <thead><tr><th>Chế độ</th><th>Mức tốc độ</th><th>Phù hợp</th></tr></thead>
  <tbody>
    <tr><td>${P('[Chế độ 1]')}</td><td>${P('[Cấp tốc độ]')}</td><td>${P('[Tình huống sử dụng]')}</td></tr>
    <tr><td>${P('[Chế độ 2]')}</td><td>${P('[Cấp tốc độ]')}</td><td>${P('[Tình huống sử dụng]')}</td></tr>
    <tr><td>${P('[Chế độ 3]')}</td><td>${P('[Cấp tốc độ]')}</td><td>${P('[Tình huống sử dụng]')}</td></tr>
  </tbody>
</table>

<h3>Sản phẩm phù hợp với ai?</h3>
<ul>
  <li>${P('[Đối tượng 1: VD Gia đình có trẻ nhỏ]')}</li>
  <li>${P('[Đối tượng 2]')}</li>
  <li>${P('[Đối tượng 3]')}</li>
</ul>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng ${P('[xuất xứ]')}, mới 100%, nguyên hộp</li>
  <li>Bảo hành ${P('[X]')} tháng chính hãng</li>
  <li>Miễn phí vận chuyển toàn quốc</li>
  <li>Hỗ trợ tư vấn 08:00–18:30 tất cả các ngày</li>
</ul>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'bep-tu',
    label: 'Bếp từ / Bếp IH',
    icon: '🔥',
    html: `
<h2>${P('[TÊN SẢN PHẨM ĐẦY ĐỦ]')}</h2>
<p>${P('[TÊN THƯƠNG HIỆU]')} ${P('[MODEL]')} là bếp từ ${P('[đơn / đôi]')} ${P('[xuất xứ: Nhật nội địa 100V / 220V xuất khẩu]')} với công nghệ ${P('[IH / Inverter / All Metal]')}, mang lại ${P('[lợi ích: tiết kiệm điện / nấu nhanh / an toàn]')} vượt trội so với bếp điện thông thường.</p>

<h3>Tính năng nổi bật</h3>
<ul>
  <li><strong>${P('[Công nghệ 1]')}:</strong> ${P('[Mô tả]')}</li>
  <li><strong>${P('[Công nghệ 2]')}:</strong> ${P('[Mô tả]')}</li>
  <li><strong>Hẹn giờ thông minh:</strong> ${P('[Chi tiết hẹn giờ]')}</li>
  <li><strong>Khóa an toàn trẻ em:</strong> ${P('[Có / Không — mô tả]')}</li>
  <li><strong>${P('[Tính năng đặc biệt khác]')}:</strong> ${P('[Mô tả]')}</li>
</ul>

<h3>Mức công suất & chế độ nấu</h3>
<table>
  <thead><tr><th>Chế độ</th><th>Công suất</th><th>Phù hợp</th></tr></thead>
  <tbody>
    <tr><td>${P('[Chế độ 1: VD Giữ ấm]')}</td><td>${P('[W]')}</td><td>${P('[Mô tả]')}</td></tr>
    <tr><td>${P('[Chế độ 2]')}</td><td>${P('[W]')}</td><td>${P('[Mô tả]')}</td></tr>
    <tr><td>${P('[Chế độ 3: Công suất tối đa]')}</td><td>${P('[W]')}</td><td>${P('[Mô tả]')}</td></tr>
  </tbody>
</table>

<h3>Lưu ý quan trọng — Điện áp</h3>
<blockquote>
  ${P('[Nếu 100V nội địa Nhật]')}: Sản phẩm này sử dụng điện 100V. Cần dùng kèm <strong>biến áp đổi điện 220V→100V</strong> tại Việt Nam. Japan VIP có thể tư vấn biến áp phù hợp.
</blockquote>

<h3>Sản phẩm phù hợp với ai?</h3>
<ul>
  <li>${P('[Đối tượng 1]')}</li>
  <li>${P('[Đối tượng 2]')}</li>
  <li>Gia đình ưu tiên an toàn — không có lửa, không gas, mặt kính không nóng vùng ngoài</li>
</ul>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng ${P('[xuất xứ]')}, mới 100%, nguyên hộp</li>
  <li>Bảo hành ${P('[X]')} tháng chính hãng</li>
  <li>Miễn phí vận chuyển toàn quốc</li>
  <li>Hỗ trợ tư vấn 08:00–18:30 tất cả các ngày</li>
</ul>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'tu-lanh',
    label: 'Tủ lạnh',
    icon: '🧊',
    html: `
<h2>${P('[TÊN SẢN PHẨM ĐẦY ĐỦ]')}</h2>
<p>${P('[THƯƠNG HIỆU]')} ${P('[MODEL]')} là tủ lạnh ${P('[loại: 1 / 2 / 3 / 4 cửa / French Door / Side-by-Side]')} dung tích ${P('[XXX lít]')}, trang bị công nghệ ${P('[Inverter / Multi-Air Flow / Vacuum]')} giúp ${P('[lợi ích: tiết kiệm điện / giữ thực phẩm tươi lâu / không đóng tuyết]')}.</p>

<h3>Công nghệ & tính năng nổi bật</h3>
<ul>
  <li><strong>${P('[Công nghệ làm lạnh]')}:</strong> ${P('[Mô tả]')}</li>
  <li><strong>${P('[Công nghệ tiết kiệm điện]')}:</strong> ${P('[Mô tả — mức tiêu thụ điện/năm]')}</li>
  <li><strong>${P('[Ngăn đặc biệt]')}:</strong> ${P('[VD: Ngăn đông mềm / Ngăn chân không / Ngăn rau quả]')}</li>
  <li><strong>Chống đóng tuyết:</strong> ${P('[Có / Không — mô tả]')}</li>
  <li><strong>${P('[Tính năng khử mùi / diệt khuẩn]')}:</strong> ${P('[Mô tả]')}</li>
</ul>

<h3>Phân chia ngăn chứa</h3>
<table>
  <thead><tr><th>Ngăn</th><th>Dung tích</th><th>Nhiệt độ</th></tr></thead>
  <tbody>
    <tr><td>Ngăn lạnh</td><td>${P('[X lít]')}</td><td>${P('[X°C]')}</td></tr>
    <tr><td>Ngăn đông</td><td>${P('[X lít]')}</td><td>${P('[X°C]')}</td></tr>
    <tr><td>${P('[Ngăn đặc biệt]')}</td><td>${P('[X lít]')}</td><td>${P('[X°C]')}</td></tr>
  </tbody>
</table>

<h3>Sản phẩm phù hợp với ai?</h3>
<ul>
  <li>${P('[Quy mô gia đình phù hợp: VD Gia đình 3–5 người]')}</li>
  <li>${P('[Đặc điểm phù hợp: VD Gia đình hay mua sắm số lượng lớn]')}</li>
  <li>${P('[Nhu cầu đặc biệt: VD Cần bảo quản thực phẩm tươi sống lâu]')}</li>
</ul>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng ${P('[xuất xứ]')}, mới 100%, nguyên hộp</li>
  <li>Bảo hành ${P('[X]')} tháng chính hãng</li>
  <li>Miễn phí vận chuyển toàn quốc, giao tận nơi, lắp đặt tại nhà</li>
  <li>Hỗ trợ tư vấn 08:00–18:30 tất cả các ngày</li>
</ul>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'may-giat',
    label: 'Máy giặt',
    icon: '🫧',
    html: `
<h2>${P('[TÊN SẢN PHẨM ĐẦY ĐỦ]')}</h2>
<p>${P('[THƯƠNG HIỆU]')} ${P('[MODEL]')} là máy giặt ${P('[cửa trước / cửa trên]')} dung tích ${P('[XX kg]')} với công nghệ ${P('[Inverter / DD Motor / Drum]')}, giúp ${P('[lợi ích: giặt sạch / tiết kiệm nước / êm / giảm nhăn]')}.</p>

<h3>Tính năng nổi bật</h3>
<ul>
  <li><strong>${P('[Công nghệ động cơ]')}:</strong> ${P('[Mô tả ưu điểm]')}</li>
  <li><strong>${P('[Chương trình giặt đặc biệt]')}:</strong> ${P('[Mô tả]')}</li>
  <li><strong>Tiết kiệm nước & điện:</strong> ${P('[Mức tiêu thụ cụ thể]')}</li>
  <li><strong>${P('[Chức năng sấy]')}:</strong> ${P('[Có / Không — mô tả]')}</li>
  <li><strong>${P('[Kết nối thông minh / WiFi]')}:</strong> ${P('[Có / Không — mô tả]')}</li>
</ul>

<h3>Các chương trình giặt</h3>
<table>
  <thead><tr><th>Chương trình</th><th>Thời gian</th><th>Phù hợp</th></tr></thead>
  <tbody>
    <tr><td>${P('[Chương trình 1: VD Giặt nhanh 15 phút]')}</td><td>${P('[X phút]')}</td><td>${P('[Đồ ít bẩn / cần gấp]')}</td></tr>
    <tr><td>${P('[Chương trình 2]')}</td><td>${P('[X phút]')}</td><td>${P('[Mô tả]')}</td></tr>
    <tr><td>${P('[Chương trình 3: Vải nhạy cảm]')}</td><td>${P('[X phút]')}</td><td>${P('[Len / Lụa / Cotton]')}</td></tr>
  </tbody>
</table>

<h3>Sản phẩm phù hợp với ai?</h3>
<ul>
  <li>${P('[Gia đình X–Y người]')}</li>
  <li>${P('[Đặc điểm phù hợp]')}</li>
</ul>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng ${P('[xuất xứ]')}, mới 100%, nguyên hộp</li>
  <li>Bảo hành ${P('[X]')} tháng chính hãng</li>
  <li>Miễn phí vận chuyển, lắp đặt tại nhà</li>
  <li>Hỗ trợ tư vấn 08:00–18:30 tất cả các ngày</li>
</ul>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'noi-com-dien',
    label: 'Nồi cơm điện',
    icon: '🍚',
    html: `
<h2>${P('[TÊN SẢN PHẨM ĐẦY ĐỦ]')}</h2>
<p>${P('[THƯƠNG HIỆU]')} ${P('[MODEL]')} là nồi cơm điện ${P('[IH áp suất / IH thường / nhiệt điện thông thường]')} dung tích ${P('[X lít / X chén]')}, sử dụng công nghệ ${P('[IH / Pressure IH / Platinum]')} giúp nấu cơm ${P('[ngon hơn / nhanh hơn / giữ ấm lâu hơn]')} so với nồi cơm thông thường.</p>

<h3>Điểm khác biệt của nồi IH Nhật</h3>
<ul>
  <li><strong>${P('[Công nghệ nấu]')}:</strong> ${P('[Mô tả chi tiết ưu điểm so với nồi thường]')}</li>
  <li><strong>${P('[Lòng nồi]')}:</strong> ${P('[Chất liệu: Gang đúc / Ceramic / Platinum / Đất sét]')}</li>
  <li><strong>${P('[Chế độ nấu đặc biệt]')}:</strong> ${P('[VD: Nấu cháo / Chưng / Nấu chậm / Hấp]')}</li>
  <li><strong>Giữ ấm thông minh:</strong> ${P('[Thời gian / nhiệt độ giữ ấm]')}</li>
  <li><strong>${P('[Tính năng thêm]')}:</strong> ${P('[Mô tả]')}</li>
</ul>

<h3>So sánh các chế độ nấu</h3>
<table>
  <thead><tr><th>Chế độ</th><th>Thời gian</th><th>Kết quả</th></tr></thead>
  <tbody>
    <tr><td>${P('[Nấu thường]')}</td><td>${P('[X phút]')}</td><td>${P('[Mô tả kết quả]')}</td></tr>
    <tr><td>${P('[Nấu nhanh]')}</td><td>${P('[X phút]')}</td><td>${P('[Mô tả kết quả]')}</td></tr>
    <tr><td>${P('[Nấu nhẹ / Cháo]')}</td><td>${P('[X phút]')}</td><td>${P('[Mô tả kết quả]')}</td></tr>
  </tbody>
</table>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng ${P('[xuất xứ]')}, mới 100%, nguyên hộp</li>
  <li>Bảo hành ${P('[X]')} tháng chính hãng</li>
  <li>Miễn phí vận chuyển toàn quốc</li>
  <li>Hỗ trợ tư vấn 08:00–18:30 tất cả các ngày</li>
</ul>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'may-loc-khong-khi',
    label: 'Máy lọc không khí',
    icon: '💨',
    html: `
<h2>${P('[TÊN SẢN PHẨM ĐẦY ĐỦ]')}</h2>
<p>${P('[THƯƠNG HIỆU]')} ${P('[MODEL]')} là máy lọc không khí ${P('[kích thước phòng phù hợp: X–Y m²]')} trang bị bộ lọc ${P('[HEPA / HEPA H13 / Carbon]')} có thể loại bỏ đến ${P('[XX%]')} bụi mịn PM2.5, vi khuẩn, nấm mốc và mùi hôi — mang lại không khí trong lành cho gia đình bạn.</p>

<h3>Hệ thống lọc đa tầng</h3>
<ul>
  <li><strong>Tầng 1 — ${P('[Tên bộ lọc]')}:</strong> ${P('[Lọc bụi lớn, lông động vật...]')}</li>
  <li><strong>Tầng 2 — ${P('[Bộ lọc HEPA]')}:</strong> ${P('[Lọc bụi mịn PM2.5, vi khuẩn, phấn hoa...]')}</li>
  <li><strong>Tầng 3 — ${P('[Bộ lọc Carbon]')}:</strong> ${P('[Khử mùi, hóa chất, VOC...]')}</li>
  <li><strong>${P('[Công nghệ Ion / Plasma / UV]')}:</strong> ${P('[Mô tả]')}</li>
</ul>

<h3>Hiệu suất lọc theo chế độ</h3>
<table>
  <thead><tr><th>Chế độ</th><th>CADR (m³/h)</th><th>Tiếng ồn</th><th>Phù hợp</th></tr></thead>
  <tbody>
    <tr><td>${P('[Chế độ 1: Tự động]')}</td><td>${P('[X m³/h]')}</td><td>${P('[X dB]')}</td><td>${P('[Ban ngày thường]')}</td></tr>
    <tr><td>${P('[Chế độ 2: Yên tĩnh]')}</td><td>${P('[X m³/h]')}</td><td>${P('[X dB]')}</td><td>${P('[Ban đêm]')}</td></tr>
    <tr><td>${P('[Chế độ 3: Turbo]')}</td><td>${P('[X m³/h]')}</td><td>${P('[X dB]')}</td><td>${P('[Khi không khí ô nhiễm nặng]')}</td></tr>
  </tbody>
</table>

<h3>Sản phẩm phù hợp với ai?</h3>
<ul>
  <li>Gia đình có trẻ nhỏ, người già, người dị ứng hoặc hen suyễn</li>
  <li>${P('[Đối tượng 2]')}</li>
  <li>Không gian ${P('[phòng ngủ / phòng khách / văn phòng]')} diện tích ${P('[X–Y m²]')}</li>
</ul>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng ${P('[xuất xứ]')}, mới 100%, nguyên hộp</li>
  <li>Bảo hành ${P('[X]')} tháng chính hãng</li>
  <li>Miễn phí vận chuyển toàn quốc</li>
  <li>Hỗ trợ tư vấn 08:00–18:30 tất cả các ngày</li>
</ul>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'may-hut-bui',
    label: 'Máy hút bụi',
    icon: '🧹',
    html: `
<h2>${P('[TÊN SẢN PHẨM ĐẦY ĐỦ]')}</h2>
<p>${P('[THƯƠNG HIỆU]')} ${P('[MODEL]')} là máy hút bụi ${P('[có dây / không dây / robot]')} với công suất ${P('[X W]')}, ${P('[lực hút X Pa]')}, phù hợp cho ${P('[sàn gỗ / thảm / đa bề mặt]')} — giúp làm sạch hiệu quả mà ${P('[đặc điểm: không gây ồn / nhẹ / không túi]')}.</p>

<h3>Tính năng nổi bật</h3>
<ul>
  <li><strong>${P('[Công nghệ lọc]')}:</strong> ${P('[HEPA / Cyclone / 2-stage...]')}</li>
  <li><strong>${P('[Phụ kiện đầu hút]')}:</strong> ${P('[Danh sách đầu hút kèm theo]')}</li>
  <li><strong>${P('[Pin / Thời gian sử dụng]')}:</strong> ${P('[X phút trên 1 lần sạc — nếu không dây]')}</li>
  <li><strong>${P('[Dung tích bình chứa]')}:</strong> ${P('[X lít]')}</li>
  <li><strong>${P('[Tính năng đặc biệt]')}:</strong> ${P('[Mô tả]')}</li>
</ul>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng ${P('[xuất xứ]')}, mới 100%, nguyên hộp</li>
  <li>Bảo hành ${P('[X]')} tháng chính hãng</li>
  <li>Miễn phí vận chuyển toàn quốc</li>
</ul>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'bon-cau',
    label: 'Bồn cầu / Toilet thông minh',
    icon: '🚽',
    html: `
<h2>${P('[TÊN SẢN PHẨM ĐẦY ĐỦ]')}</h2>
<p>${P('[THƯƠNG HIỆU]')} ${P('[MODEL]')} là bồn cầu thông minh ${P('[tích hợp washlet / rời / có nắp điều khiển]')} tiêu chuẩn Nhật Bản, trang bị đầy đủ chức năng ${P('[vệ sinh / sấy khô / khử mùi / làm ấm nắp]')} — mang lại trải nghiệm vệ sinh cá nhân hoàn toàn mới.</p>

<h3>Tính năng nổi bật</h3>
<ul>
  <li><strong>${P('[Vòi rửa]')}:</strong> ${P('[Áp lực / nhiệt độ điều chỉnh / vị trí điều chỉnh]')}</li>
  <li><strong>${P('[Sấy khô]')}:</strong> ${P('[Nhiệt độ / thời gian]')}</li>
  <li><strong>${P('[Nắp sưởi ấm]')}:</strong> ${P('[Mức nhiệt độ điều chỉnh]')}</li>
  <li><strong>${P('[Khử mùi]')}:</strong> ${P('[Công nghệ: Ion / Ozone / Carbon]')}</li>
  <li><strong>${P('[Xả nước thông minh]')}:</strong> ${P('[Cảm biến / 2 chế độ / tiết kiệm nước]')}</li>
  <li><strong>${P('[Điều khiển]')}:</strong> ${P('[Remote / Bảng điều khiển bên hông / App]')}</li>
</ul>

<h3>Sản phẩm phù hợp với ai?</h3>
<ul>
  <li>Gia đình ưu tiên vệ sinh và sức khỏe cá nhân</li>
  <li>Người cao tuổi hoặc người có vấn đề sức khỏe cần chăm sóc đặc biệt</li>
  <li>${P('[Đối tượng 3]')}</li>
</ul>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng ${P('[xuất xứ]')}, mới 100%, nguyên hộp</li>
  <li>Bảo hành ${P('[X]')} tháng chính hãng</li>
  <li>Miễn phí vận chuyển, hỗ trợ lắp đặt</li>
  <li>Hỗ trợ tư vấn 08:00–18:30 tất cả các ngày</li>
</ul>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'may-say-toc',
    label: 'Máy sấy tóc',
    icon: '💇',
    html: `
<h2>${P('[TÊN SẢN PHẨM ĐẦY ĐỦ]')}</h2>
<p>${P('[THƯƠNG HIỆU]')} ${P('[MODEL]')} là máy sấy tóc chuyên nghiệp ${P('[xuất xứ]')} với công suất ${P('[X W]')}, trang bị công nghệ ${P('[Ion / Nano / Tourmaline / Plasma]')} giúp tóc ${P('[khô nhanh hơn / ít xơ rối / bóng mượt]')} mà không gây hư tổn.</p>

<h3>Tính năng nổi bật</h3>
<ul>
  <li><strong>${P('[Công nghệ Ion]')}:</strong> ${P('[Giảm tĩnh điện, khử ẩm, làm bóng tóc]')}</li>
  <li><strong>${P('[X mức nhiệt / X tốc độ gió]')}:</strong> ${P('[Mô tả]')}</li>
  <li><strong>Chức năng Cool Shot:</strong> ${P('[Có / Không — khóa nếp tóc sau khi tạo kiểu]')}</li>
  <li><strong>${P('[Phụ kiện kèm theo]')}:</strong> ${P('[Đầu khuếch tán / đầu tập trung / lược]')}</li>
  <li><strong>Trọng lượng:</strong> ${P('[X g — nhẹ tay, dùng lâu không mỏi]')}</li>
</ul>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng ${P('[xuất xứ]')}, mới 100%, nguyên hộp</li>
  <li>Bảo hành ${P('[X]')} tháng chính hãng</li>
  <li>Miễn phí vận chuyển toàn quốc</li>
</ul>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'lo-vi-song',
    label: 'Lò vi sóng',
    icon: '📡',
    html: `
<h2>${P('[TÊN SẢN PHẨM ĐẦY ĐỦ]')}</h2>
<p>${P('[THƯƠNG HIỆU]')} ${P('[MODEL]')} là lò vi sóng ${P('[có lò nướng / không có lò nướng / Inverter]')} dung tích ${P('[X lít]')}, công suất ${P('[X W]')}, phù hợp cho ${P('[gia đình X–Y người]')} — giúp hâm nóng, rã đông và nấu chín nhanh chóng mà ${P('[giữ dinh dưỡng / không mất ẩm]')}.</p>

<h3>Tính năng nổi bật</h3>
<ul>
  <li><strong>${P('[Công nghệ Inverter]')}:</strong> ${P('[Công suất thay đổi liên tục — thức ăn chín đều, không bị khô]')}</li>
  <li><strong>${P('[Chế độ Auto Cook]')}:</strong> ${P('[X chương trình tự động — chỉ cần chọn món]')}</li>
  <li><strong>${P('[Lò nướng / Grill]')}:</strong> ${P('[Có / Không — mô tả]')}</li>
  <li><strong>${P('[Chế độ rã đông]')}:</strong> ${P('[Theo trọng lượng / theo thời gian]')}</li>
  <li><strong>${P('[Kết nối / điều khiển]')}:</strong> ${P('[Núm xoay / Nút bấm / Digital]')}</li>
</ul>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng ${P('[xuất xứ]')}, mới 100%, nguyên hộp</li>
  <li>Bảo hành ${P('[X]')} tháng chính hãng</li>
  <li>Miễn phí vận chuyển toàn quốc</li>
</ul>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'dieu-hoa',
    label: 'Điều hòa không khí',
    icon: '❄️',
    html: `
<h2>${P('[TÊN SẢN PHẨM ĐẦY ĐỦ]')}</h2>
<p>${P('[THƯƠNG HIỆU]')} ${P('[MODEL]')} là điều hòa ${P('[1 chiều / 2 chiều]')} công suất ${P('[X BTU / X HP]')} với công nghệ ${P('[Inverter / DC Inverter]')}, phù hợp cho phòng diện tích ${P('[X–Y m²]')} — tiết kiệm điện hơn ${P('[XX%]')} so với điều hòa thông thường.</p>

<h3>Tính năng nổi bật</h3>
<ul>
  <li><strong>${P('[Công nghệ Inverter]')}:</strong> ${P('[Mô tả lợi ích tiết kiệm điện]')}</li>
  <li><strong>${P('[Lọc không khí]')}:</strong> ${P('[Bộ lọc kháng khuẩn / PM2.5 / Vitamin C]')}</li>
  <li><strong>${P('[Chế độ đặc biệt]')}:</strong> ${P('[Dry / Auto / Turbo Cool / Sleep]')}</li>
  <li><strong>${P('[Kết nối Wi-Fi / App]')}:</strong> ${P('[Có / Không — mô tả]')}</li>
  <li><strong>Tiếng ồn trong nhà:</strong> ${P('[X dB — êm hơn tiếng thì thầm]')}</li>
</ul>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng ${P('[xuất xứ]')}, mới 100%, nguyên hộp</li>
  <li>Bảo hành ${P('[X]')} tháng chính hãng</li>
  <li>Miễn phí vận chuyển, hỗ trợ lắp đặt</li>
  <li>Hỗ trợ tư vấn 08:00–18:30 tất cả các ngày</li>
</ul>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'may-nuoc-nong',
    label: 'Máy nước nóng',
    icon: '🚿',
    html: `
<h2>${P('[TÊN SẢN PHẨM ĐẦY ĐỦ]')}</h2>
<p>${P('[THƯƠNG HIỆU]')} ${P('[MODEL]')} là máy nước nóng ${P('[trực tiếp / gián tiếp / bơm nhiệt]')} dung tích ${P('[X lít]')}, công suất ${P('[X W]')}, trang bị công nghệ ${P('[chống giật / chống rỉ]')} đảm bảo an toàn tuyệt đối cho cả gia đình.</p>

<h3>Tính năng nổi bật</h3>
<ul>
  <li><strong>An toàn điện:</strong> ${P('[Bảo vệ chống giật điện, cầu dao tự ngắt]')}</li>
  <li><strong>${P('[Công nghệ bình chứa]')}:</strong> ${P('[Men thủy tinh / Titanium — chống han rỉ]')}</li>
  <li><strong>Điều chỉnh nhiệt độ:</strong> ${P('[X–Y°C / núm xoay / digital]')}</li>
  <li><strong>Hẹn giờ:</strong> ${P('[Có / Không]')}</li>
  <li><strong>${P('[Phù hợp số người sử dụng]')}:</strong> ${P('[X–Y người]')}</li>
</ul>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng ${P('[xuất xứ]')}, mới 100%, nguyên hộp</li>
  <li>Bảo hành ${P('[X]')} tháng chính hãng</li>
  <li>Miễn phí vận chuyển, hỗ trợ lắp đặt</li>
</ul>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    key: 'chung',
    label: 'Chung (mọi sản phẩm)',
    icon: '📦',
    html: `
<h2>${P('[TÊN SẢN PHẨM ĐẦY ĐỦ]')}</h2>
<p>${P('[THƯƠNG HIỆU]')} ${P('[MODEL]')} là ${P('[loại sản phẩm]')} ${P('[xuất xứ]')} với ${P('[đặc điểm / công nghệ nổi bật]')}, mang lại ${P('[lợi ích chính cho người dùng]')}.</p>

<h3>Tính năng nổi bật</h3>
<ul>
  <li><strong>${P('[Tính năng 1]')}:</strong> ${P('[Mô tả lợi ích]')}</li>
  <li><strong>${P('[Tính năng 2]')}:</strong> ${P('[Mô tả lợi ích]')}</li>
  <li><strong>${P('[Tính năng 3]')}:</strong> ${P('[Mô tả lợi ích]')}</li>
  <li><strong>${P('[Tính năng 4]')}:</strong> ${P('[Mô tả lợi ích]')}</li>
</ul>

<h3>Sản phẩm phù hợp với ai?</h3>
<ul>
  <li>${P('[Đối tượng 1]')}</li>
  <li>${P('[Đối tượng 2]')}</li>
  <li>${P('[Đối tượng 3]')}</li>
</ul>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng ${P('[xuất xứ]')}, mới 100%, nguyên hộp</li>
  <li>Bảo hành ${P('[X]')} tháng chính hãng</li>
  <li>Miễn phí vận chuyển toàn quốc</li>
  <li>Hỗ trợ tư vấn 08:00–18:30 tất cả các ngày</li>
</ul>`,
  },
]

export const TEMPLATE_MAP = Object.fromEntries(
  PRODUCT_TEMPLATES.map((t) => [t.key, t])
) as Record<TemplateKey, Template>
