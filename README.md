# Kiểm tra giữa kì — Điện toán đám mây

Ứng dụng Express + Handlebars quản lý sách, hai kết nối MongoDB đọc/ghi riêng và session tập trung trên Atlas. Không có chế độ dữ liệu giả trong ứng dụng chạy thật. Họ tên/MSSV chưa được cung cấp; ứng dụng yêu cầu cấu hình đúng trước khi khởi động.

## 1. MongoDB Atlas

Tạo cluster, database `DB_<MSSV>` và collection `books`, `sessions` bằng tài khoản quản trị. Trong Data Explorer tạo unique index `{ code: 1 }` cho books và TTL index `{ expires: 1 }` với `expireAfterSeconds: 0` cho sessions. Index được quản trị tạo trước; app không cần quyền tạo index.

Trong Database Access → Custom Roles, tạo các role giới hạn chính xác database và collection:

| Tài khoản | Collection | Action được cấp |
|---|---|---|
| `reader_<MSSV>` | `DB_<MSSV>.books` | `find` |
| `writer_<MSSV>` | `DB_<MSSV>.books` | `insert` |
| `session_<MSSV>` | `DB_<MSSV>.sessions` | `find`, `insert`, `update`, `remove` |

Không cấp `readWrite`, `readWriteAnyDatabase` hoặc quyền admin cho các tài khoản trên. Hai tài khoản sách đúng yêu cầu đọc/ghi độc lập; tài khoản thứ ba chỉ phục vụ session vì session phải đọc, cập nhật và xóa, không thể dùng tài khoản insert-only. Nếu giảng viên yêu cầu tổng cộng đúng hai tài khoản, cần xác nhận cách phân quyền session; không âm thầm nới quyền tài khoản ghi.

Tạo database user với mật khẩu khác nhau và gán đúng custom role. Lấy URI từ Connect → Drivers, thay username/password đã URL-encode; dùng `authSource=admin` và chọn cùng cluster. Đưa URI vào `.env` hoặc Render Environment, tuyệt đối không commit. Atlas Network Access chỉ cho phép IP máy cá nhân và dải outbound của dịch vụ Render.

Tài liệu chính thức: https://www.mongodb.com/docs/atlas/security-add-mongodb-roles/

## 2. Chạy trên Windows

```powershell
npm ci
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Điền `.env`: `STUDENT_NAME`, `STUDENT_ID`, ba URI và `SESSION_SECRET` (chuỗi ngẫu nhiên vừa tạo). Giữ MSSV dạng chuỗi để bảo toàn số 0 đầu. Sau đó:

```powershell
npm start
```

Mở http://localhost:3000. Mã sách phải bắt đầu bằng ba số cuối MSSV. VAT = (chữ số cuối + 4)%. Giá VNĐ nguyên, giá sau thuế làm tròn về đồng gần nhất, được tính trên server trước insert. Footer hiện tên, MSSV và VAT. Ví dụ MSSV thử `123456`: mã `456-001`, giá 100000 → VAT 10% → 110000 đồng.

Cookie chỉ chứa ID phiên đã ký; dữ liệu phiên và CSRF token nằm trong MongoDB. Các instance phải dùng cùng SESSION_SECRET, database và session collection. Không cần sticky session. Production bật cookie Secure, HttpOnly, SameSite=Lax và trust proxy cho HTTPS qua Render. Lượt xem phiên dùng để demo nối tiếp giữa các instance, không phải bộ đếm chính xác khi nhiều request đồng thời. Danh sách giới hạn 100 sách gần nhất.

## 3. Git và DevOps

Đã tạo `feature/database`, `feature/session` và merge từng nhánh bằng `--no-ff` về main. Kiểm tra:

```powershell
git log --graph --oneline --all
npm run check
npm test
```

Tạo repo GitHub trống rồi dùng URL của bạn:

```powershell
git remote add origin https://github.com/<username>/<repository>.git
git push -u origin main
git push origin feature/database feature/session
```

`.env`, node_modules, log và cấu hình editor đã được ignore. CI chạy npm ci, kiểm tra cú pháp và test trên push/PR.

## 4. Triển khai Render

Kết nối repo GitHub với Render → New Blueprint, chọn `render.yaml`, điền các biến `sync: false`. Blueprint chọn **Starter có phí** vì Free ngủ sau 15 phút không có traffic, không đáp ứng yêu cầu luôn chạy 24/7. Chỉ tạo dịch vụ khi bạn đã chọn và chấp nhận gói chi phí. Xem https://render.com/docs/free và bảng giá hiện hành trên tài khoản Render.

Nếu tạo Web Service thủ công: runtime Node, build `npm ci`, start `npm run start:cloud`, health check `/health`, NODE_ENV=production và các biến trong `.env.example`. Render tự cấp PORT. Không đưa file `.env` lên GitHub. Sau deploy kiểm tra HTTPS, thêm sách, reload, restart dịch vụ và kiểm tra phiên vẫn giữ lượt xem. `/health` kiểm tra hai kết nối sách; trang `/` kiểm tra thêm luồng session.

## 5. Bằng chứng nộp bài và giới hạn kiểm thử

- Chụp Atlas database, ba custom role/user (ẩn mật khẩu), unique/TTL index.
- Chụp mã đúng được lưu, mã sai bị từ chối, VAT và footer.
- Dùng tài khoản reader thử insert phải bị Unauthorized; dùng writer thử find phải bị Unauthorized. Làm trên collection đã chuẩn bị, không cấp thêm quyền để vượt lỗi.
- Mở hai instance cùng cấu hình, PORT 3000 và 3001, cùng trình duyệt localhost: lượt xem tăng liên tục giữa hai cổng (cookie không phân biệt cổng). Restart instance và kiểm tra phiên còn hiệu lực.
- Chụp cây Git với hai merge node, CI, link GitHub và URL Render.
- Test tự động dùng repository/session test doubles, xác minh validation, route, CSRF, escape HTML và chia sẻ phiên giữa hai app. Đây chưa phải bằng chứng quyền Atlas, TTL thật, nhiều tiến trình thật hoặc deploy thành công.

Chưa kết nối Atlas/GitHub/Render vì chưa có cấu hình và quyền truy cập từ người dùng. Không có URL trực tuyến được tạo sẵn.
