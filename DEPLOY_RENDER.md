# Triển khai Render và bộ ảnh minh chứng

Trạng thái: source đã ở https://github.com/lethanhvu005/cloud. Chưa có dịch vụ Render hoặc URL online được xác minh. Chưa chụp được ảnh dashboard vì công cụ mở trình duyệt bị chặn. Các mục dưới đây là hướng dẫn thao tác, không phải bằng chứng đã triển khai.

## Bước 1 — Đăng nhập

Mở https://dashboard.render.com và đăng nhập bằng tài khoản của bạn. Không gửi mật khẩu hoặc mã OTP vào chat.

Ảnh cần lưu: `01-dashboard.png` — trang Dashboard sau khi đăng nhập.

## Bước 2 — Tạo Web Service

Chọn New → Web Service. Kết nối GitHub và chọn `lethanhvu005/cloud`. Nếu chưa thấy repo, cấp quyền truy cập repo này cho Render.

Ảnh: `02-select-repository.png` — repo được chọn.

## Bước 3 — Cấu hình build

| Trường | Giá trị |
|---|---|
| Name | cloud-book-manager-23it316 (hoặc tên còn trống) |
| Language / Runtime | Node |
| Branch | main |
| Region | Singapore nếu có |
| Root Directory | Để trống |
| Build Command | npm ci |
| Start Command | npm run start:cloud |
| Health Check Path (Advanced) | /health |

Ảnh: `03-build-settings.png` — runtime, branch và hai lệnh.

## Bước 4 — Chọn gói

Starter hiện được niêm yết khoảng 7 USD/tháng cho compute; kiểm tra tổng phí trên giao diện trước khi tạo. Đây là gói có phí, cần người dùng đồng ý. Free ngủ sau thời gian không hoạt động nên không đáp ứng yêu cầu luôn chạy của đề. Không có gói nào bảo đảm tuyệt đối không gián đoạn.

Ảnh: `04-instance-plan.png` — gói đã chọn, không chụp thông tin thanh toán.

## Bước 5 — Biến môi trường

Nhập trong mục Environment Variables của Render:

| Key | Value |
|---|---|
| NODE_ENV | production |
| NODE_VERSION | 24.14.0 |
| STUDENT_NAME | Sao chép đúng họ tên từ .env |
| STUDENT_ID | 23IT316 |
| MONGO_URI_READ | Sao chép giá trị từ .env |
| MONGO_URI_WRITE | Sao chép giá trị từ .env |
| SESSION_URI | Sao chép giá trị từ .env |
| SESSION_SECRET | Sao chép secret ngẫu nhiên hiện có từ .env |

Không nhập dấu ngoặc kép bao quanh giá trị trong giao diện. Không cần khai báo PORT=3000: Render tự cấp PORT. Không đưa file .env vào GitHub. Start Command phải là `npm run start:cloud`, vì `npm start` yêu cầu file .env tại máy.

Ảnh: `05-environment.png` — hiện tên biến, che toàn bộ URI và SESSION_SECRET trước khi lưu/chia sẻ.

## Bước 6 — Cho phép Render truy cập Atlas

Trong trang service Render, mở Connect → Outbound để lấy các dải IP outbound (vị trí giao diện có thể thay đổi). Vào MongoDB Atlas → Network Access → Add IP Address và thêm các dải này. IP máy cá nhân đã được cho phép không thay thế IP của Render.

Phân quyền hiện được kiểm tra: reader có read; writer có readWrite toàn database. Cần sửa writer sang custom role với `insert` trên `DB_23IT316.books`. Nếu dùng writer cho session, cấp thêm `find`, `insert`, `update`, `remove` chỉ trên `DB_23IT316.sessions`; không cấp quyền đọc/xóa books.

Ảnh: `06-atlas-network.png` và `07-atlas-roles.png` — dải IP và phạm vi quyền, không chụp mật khẩu.

## Bước 7 — Deploy

Sau khi đồng ý gói chi phí, chọn Deploy Web Service. Nếu deploy đầu lỗi kết nối trước khi whitelist xong, cập nhật Atlas rồi chọn Manual Deploy → Deploy latest commit. Chờ trạng thái Live và kiểm tra log. Không thêm DNS localhost 127.0.0.1 hoặc cách chữa DNS máy Windows vào cấu hình Render.

Ảnh: `08-deploy-live.png` — trạng thái Live, commit và log khởi động; che thông tin nhạy cảm nếu có.

## Bước 8 — Kiểm tra URL thật

Mở URL HTTPS do Render cấp và đường dẫn `/health`, cần nhận `{"status":"ok"}`. Thêm sách mã `316-RENDER-001`, giá 100000; kiểm tra giá sau thuế 110000, footer đúng họ tên/MSSV/VAT. Nếu mã đã tồn tại, dùng hậu tố khác. Gửi mã sai `999-001` phải bị từ chối.

Ảnh: `09-public-app.png` — thanh địa chỉ URL thật, danh sách và footer; `10-invalid-code.png` — thông báo từ chối mã sai.

## Bước 9 — Chứng minh session tập trung

Mở trang trong cùng trình duyệt, ghi nhận lượt xem. Restart service trên Render, chờ Live rồi tải lại trang: lượt xem tiếp tục tăng. Không xóa cookie hoặc đổi domain giữa hai lần. Kiểm tra Atlas có collection sessions; không chia sẻ ảnh chứa ID phiên, CSRF token hoặc nội dung session chưa được che.

Ảnh: `11-before-restart.png`, `12-after-restart.png`. Thử nghiệm này xác minh giữ phiên sau restart; chưa tự nó chứng minh scale nhiều instance.

Lưu các ảnh thật vào `artifacts/deploy-screenshots/` (đã được Git bỏ qua). Chỉ kết luận hoàn tất khi có URL chạy thật và kết quả kiểm tra.

## Tài liệu chính thức

- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/configure-environment-variables
- https://render.com/docs/outbound-ip-addresses
- https://render.com/pricing
- https://render.com/docs/free
