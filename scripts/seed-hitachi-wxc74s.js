// Chạy trong browser console khi đang ở trang admin sản phẩm Hitachi R-WXC74S
// URL: http://localhost:3001/admin/products/7c385d7d-423e-4847-83a5-3d09ca7d21bb

const PRODUCT_ID = '7c385d7d-423e-4847-83a5-3d09ca7d21bb'
const BASE = '/api/v1/admin/products'

// ── 1. Mô tả sản phẩm ────────────────────────────────────────────────────────
const description = `
<h2>Tủ Lạnh Hitachi R-WXC74S — Công Nghệ Hút Chân Không Độc Quyền</h2>
<p>Hitachi R-WXC74S là tủ lạnh nội địa Nhật Bản cao cấp 6 cửa, dung tích 735L với mặt kính pha lê sang trọng. Được trang bị công nghệ hút chân không Photocatalyst độc quyền, tủ lạnh giúp bảo quản thực phẩm tươi ngon lâu hơn đến 40% so với tủ lạnh thông thường — lý tưởng cho gia đình yêu thích sức khỏe và muốn tiết kiệm chi phí thực phẩm.</p>

<h3>Tại sao chọn Hitachi R-WXC74S?</h3>
<ul>
  <li><strong>Công nghệ hút chân không Photocatalyst:</strong> Ngăn chân không duy trì áp suất ~0.8 atm, giảm oxy hóa, giữ hàm lượng DHA trong cá thu và Vitamin C trong rau củ lâu hơn đến 40%.</li>
  <li><strong>Aero-care — Bảo quản rau củ hoàn hảo:</strong> Bộ lọc Platinum Catalyst phân hủy khí Ethylene từ rau củ, kết hợp kiểm soát độ ẩm thông minh giúp cải bó xôi tươi lâu gấp đôi.</li>
  <li><strong>Hai dàn lạnh độc lập:</strong> Ngăn mát và ngăn đông hoạt động hoàn toàn tách biệt — không lẫn mùi, không mất độ ẩm thực phẩm tươi.</li>
  <li><strong>Inverter tiết kiệm điện:</strong> Chỉ 310 kWh/năm — tiết kiệm đến 30% so với máy nén thông thường.</li>
  <li><strong>Ngăn kéo điện trợ lực:</strong> Ngăn rau 137L và ngăn đông mở ra nhẹ nhàng chỉ bằng một chạm — tiện lợi khi tay đang bận.</li>
  <li><strong>Khử mùi 3 lớp:</strong> Bộ lọc than hoạt tính + ion âm + xúc tác quang học loại bỏ triệt để mùi trong tủ.</li>
  <li><strong>Kết nối smartphone:</strong> Kiểm soát nhiệt độ, nhận thông báo từ xa qua ứng dụng Hitachi trên iOS/Android.</li>
  <li><strong>Làm đá tự động:</strong> Ngăn làm đá 27L hoạt động tự động, không cần khay đá thủ công.</li>
</ul>

<h3>Phân chia ngăn chứa thông minh</h3>
<table>
  <thead><tr><th>Ngăn</th><th>Dung tích</th><th>Nhiệt độ</th><th>Công nghệ</th></tr></thead>
  <tbody>
    <tr><td>Ngăn mát</td><td>386L</td><td>2°C – 5°C</td><td>Frost Recycling + Chân không</td></tr>
    <tr><td>Ngăn đông</td><td>143L</td><td>-18°C</td><td>Làm lạnh gián tiếp, không đóng tuyết</td></tr>
    <tr><td>Cấp đông nhanh</td><td>42L</td><td>-30°C</td><td>Quick Freeze</td></tr>
    <tr><td>Làm đá tự động</td><td>27L</td><td>-18°C</td><td>Auto Ice Maker</td></tr>
    <tr><td>Ngăn rau củ</td><td>137L</td><td>3°C – 7°C</td><td>Aero-care + Kiểm soát độ ẩm</td></tr>
  </tbody>
</table>

<h3>Lưu ý quan trọng — Điện áp</h3>
<blockquote>Sản phẩm này sử dụng điện 100V nội địa Nhật Bản. Khi sử dụng tại Việt Nam cần dùng kèm <strong>biến áp đổi điện 220V→100V</strong> công suất tối thiểu 1.000W. Japan VIP tặng kèm biến áp Hợp Long HL-650 (trị giá 430.000đ) cho mỗi sản phẩm.</blockquote>

<h3>Sản phẩm phù hợp với ai?</h3>
<ul>
  <li>Gia đình 4–6 người, ưu tiên sức khỏe và thực phẩm tươi sạch</li>
  <li>Gia đình hay mua thực phẩm số lượng lớn, cần bảo quản dài ngày</li>
  <li>Người dùng muốn tủ lạnh cao cấp với thiết kế sang trọng, phù hợp nội thất hiện đại</li>
  <li>Gia đình cần tiết kiệm điện lâu dài với công nghệ Inverter</li>
</ul>

<h3>Cam kết từ Japan VIP</h3>
<ul>
  <li>Hàng chính hãng Nhật Bản nội địa, mới 100%, nguyên hộp</li>
  <li>Bảo hành điện tử 24 tháng, hỗ trợ tại nhà tại Hà Nội và TP.HCM</li>
  <li>Miễn phí vận chuyển toàn quốc, giao tận nơi, lắp đặt tại nhà</li>
  <li>Tặng kèm biến áp Hợp Long HL-650 + tài liệu hướng dẫn tiếng Việt</li>
  <li>Hỗ trợ tư vấn 08:00–18:30 tất cả các ngày: 0988.969.896</li>
</ul>
`.trim()

// ── 2. Thông số kỹ thuật (attributes) ────────────────────────────────────────
const attributes = [
  // Quick specs — hiển thị ngay dưới giá
  { name: '[quick] Xuất xứ',   value: 'Nhật Bản (nội địa 100V)' },
  { name: '[quick] Dung tích', value: '735L (6 cửa)' },
  { name: '[quick] Điện áp',   value: '100V — cần biến áp' },
  { name: '[quick] Bảo hành', value: '24 tháng' },

  // Thông số chung
  { name: '[group:Thông số chung] Hãng sản xuất', value: 'Hitachi (Nhật Bản)' },
  { name: '[group:Thông số chung] Model',          value: 'R-WXC74S' },
  { name: '[group:Thông số chung] Màu sắc',        value: 'Gương pha lê (X)' },
  { name: '[group:Thông số chung] Điện áp',        value: '100V / 50-60Hz (nội địa Nhật)' },
  { name: '[group:Thông số chung] Tổng dung tích', value: '735L' },
  { name: '[group:Thông số chung] Số cửa',         value: '6 cửa' },
  { name: '[group:Thông số chung] Kiểu mở cửa',   value: 'Mở 2 bên (French Door)' },
  { name: '[group:Thông số chung] Tiêu thụ điện',  value: '310 kWh/năm' },
  { name: '[group:Thông số chung] Kích thước',     value: '880 × 1.833 × 738 mm' },
  { name: '[group:Thông số chung] Khối lượng',     value: '140 kg' },
  { name: '[group:Thông số chung] Xuất xứ',        value: 'Nhật Bản' },
  { name: '[group:Thông số chung] Bảo hành',       value: '24 tháng điện tử' },

  // Ngăn chứa
  { name: '[group:Ngăn chứa] Ngăn mát',        value: '386L' },
  { name: '[group:Ngăn chứa] Ngăn đông',       value: '143L' },
  { name: '[group:Ngăn chứa] Cấp đông nhanh',  value: '42L' },
  { name: '[group:Ngăn chứa] Làm đá tự động',  value: '27L' },
  { name: '[group:Ngăn chứa] Ngăn rau củ',     value: '137L' },

  // Tính năng
  { name: '[group:Tính năng] Công nghệ làm lạnh', value: 'Frost Recycling (gián tiếp)' },
  { name: '[group:Tính năng] Hút chân không',     value: 'Photocatalyst — độc quyền Hitachi' },
  { name: '[group:Tính năng] Bảo quản rau củ',   value: 'Aero-care + kiểm soát độ ẩm' },
  { name: '[group:Tính năng] Khử mùi',            value: '3 lớp (than hoạt tính + ion âm + xúc tác)' },
  { name: '[group:Tính năng] Tiết kiệm điện',     value: 'Inverter Compressor' },
  { name: '[group:Tính năng] Ngăn kéo điện',      value: 'Ngăn rau + ngăn đông (trợ lực điện)' },
  { name: '[group:Tính năng] Kết nối thông minh', value: 'App Hitachi (iOS & Android)' },
  { name: '[group:Tính năng] Bảng điều khiển',    value: 'Cảm ứng ẩn trong kính' },
  { name: '[group:Tính năng] Khóa trẻ em',        value: 'Có' },
  { name: '[group:Tính năng] Cảnh báo mở cửa',   value: 'Có (chuông báo)' },

  // FAQ
  { name: '[faq] Sản phẩm dùng điện bao nhiêu volt?', value: 'Sản phẩm dùng điện 100V nội địa Nhật Bản. Tại Việt Nam cần dùng kèm biến áp đổi điện 220V→100V công suất tối thiểu 1.000W. Japan VIP tặng kèm biến áp Hợp Long HL-650 cho mỗi sản phẩm.' },
  { name: '[faq] Tủ có cần lắp đặt đặc biệt không?', value: 'Tủ lạnh cần không gian thông thoáng, cách tường tối thiểu 5cm mỗi bên để tản nhiệt. Kích thước cửa ra vào cần rộng ít nhất 90cm để đưa tủ vào. Japan VIP hỗ trợ lắp đặt miễn phí tại Hà Nội và TP.HCM.' },
  { name: '[faq] Mất điện thì thực phẩm trong tủ có bị hỏng không?', value: 'Tủ có khả năng giữ lạnh khoảng 8–12 tiếng sau khi mất điện nếu không mở cửa. Khi có điện trở lại, tủ tự động hoạt động bình thường. Không nên mở cửa tủ trong thời gian mất điện để giữ nhiệt độ.' },
  { name: '[faq] Tủ có ồn không?', value: 'Hitachi R-WXC74S hoạt động rất êm nhờ công nghệ Inverter và làm lạnh gián tiếp Frost Recycling. Mức độ ồn trung bình khoảng 35–38 dB — tương đương tiếng thì thầm, hoàn toàn không gây khó chịu khi đặt trong phòng bếp hoặc phòng khách.' },
  { name: '[faq] Có kết nối được điện thoại không?', value: 'Có. Tủ kết nối qua ứng dụng Hitachi trên iOS và Android. Bạn có thể kiểm soát nhiệt độ, bật/tắt chế độ từng ngăn, và nhận thông báo khi nhiệt độ thay đổi bất thường hoặc cửa bị để hở.' },
  { name: '[faq] Bảo hành như thế nào?', value: 'Bảo hành điện tử 24 tháng toàn bộ linh kiện. Japan VIP hỗ trợ bảo hành tại nhà tại Hà Nội và TP.HCM. Các tỉnh thành khác hỗ trợ gửi kỹ thuật viên theo lịch hẹn. Sau bảo hành, Japan VIP vẫn hỗ trợ sửa chữa với chi phí linh kiện.' },
]

// ── 3. Chạy ──────────────────────────────────────────────────────────────────
async function run() {
  console.log('🚀 Bắt đầu nhập dữ liệu cho Hitachi R-WXC74S...')

  // 3a. Cập nhật mô tả
  console.log('📝 Đang cập nhật mô tả...')
  const patchRes = await fetch(`${BASE}/${PRODUCT_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  })
  const patchData = await patchRes.json()
  if (patchData.success) {
    console.log('✅ Mô tả đã cập nhật!')
  } else {
    console.error('❌ Lỗi cập nhật mô tả:', patchData.error)
    return
  }

  // 3b. Nhập thông số theo batch 10 cái
  console.log(`📊 Đang nhập ${attributes.length} thông số kỹ thuật...`)
  const BATCH = 10
  for (let i = 0; i < attributes.length; i += BATCH) {
    const batch = attributes.slice(i, i + BATCH)
    const attrRes = await fetch(`${BASE}/${PRODUCT_ID}/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attributes: batch }),
    })
    const attrData = await attrRes.json()
    if (attrData.success) {
      console.log(`✅ Batch ${Math.floor(i/BATCH)+1}: ${batch.length} thông số`)
    } else {
      console.error(`❌ Lỗi batch ${Math.floor(i/BATCH)+1}:`, attrData.error)
    }
  }

  console.log('🎉 Hoàn tất! Reload trang để xem kết quả.')
  console.log(`👉 http://localhost:3001/tu-lanh-hitachi-r-wxc74s-x`)
}

run()
