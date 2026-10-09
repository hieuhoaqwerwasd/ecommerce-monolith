# Bài 2 — E-commerce Monolithic

Express API chạy trong một process, dùng Prisma và PostgreSQL chung cho các module auth, customer, product, order và shipment. JWT xác thực người dùng; đăng ký luôn nhận role normal và membership score 10.

## Chạy bằng Docker

Yêu cầu Docker Desktop (Linux containers). Sao chép `.env.example` thành `.env`, thay POSTGRES_PASSWORD, JWT_SECRET và ADMIN_PASSWORD bằng giá trị riêng. Không commit `.env`. Compose tự thiết lập DATABASE_URL bên trong container; PostgreSQL không mở cổng ra host.

```powershell
Copy-Item .env.example .env
# Sửa các giá trị trong .env trước khi chạy
docker compose up -d --build --wait
docker compose ps
Invoke-RestMethod http://localhost:3002/api/health
```

Không ghi đè `.env` đã có. Migration và seed chạy khi API khởi động. Dữ liệu PostgreSQL nằm trong named volume.

## Kiểm thử và demo

```powershell
npm ci
npm test
node scripts/smoke.js
Get-Content scripts/demo-products.sql -Raw | docker compose exec -T postgres psql -U app -d ecommerce
```

Import `postman/ecommerce-monolith.postman_collection.json` vào Postman. Đặt pidX/pidY theo kết quả SQL vừa tạo, rồi chạy lần lượt các request: health, register, login, profile, order thiếu token (401), order có token (201), detail, shipment, kiểm tra stock.

X ban đầu giá 100, quantity 10; Y giá 20, quantity 20. Mua X×2/Y×5 cho tồn kho 8/15 và Shipment=PENDING. Demo giả định score10 tương ứng giảm 10%: subtotal 300, discount 30, total 270. Công thức này cần xác nhận với giảng viên vì đề chưa định nghĩa.

```powershell
Get-Content scripts/inspect.sql -Raw | docker compose exec -T postgres psql -U app -d ecommerce
```

Đối chiếu oid/pid của lần chạy hiện tại. Mỗi lần demo cần bộ X/Y mới. Timestamp trả về UTC.

## Cấu trúc và đảm bảo dữ liệu

- `prisma/schema.prisma`: Role, MemberShip, User, Product, Order, OrderDetail, Shipment.
- `prisma/migrations`: SQL tạo schema; `prisma/seed.js`: tài khoản admin và dữ liệu tham chiếu.
- `src/orders.js`: transaction tạo order/details/shipment và trừ tồn kho; rollback khi thiếu hàng.
- `src/auth.js`, `src/routes.js`: JWT và kiểm tra quyền.
- `test/`: unit tests; `scripts/smoke.js`: kiểm thử API/DB thật, gồm rollback và cạnh tranh tồn kho.

Xác minh ngày 2026-10-03: 4 unit tests pass, smoke integration pass, Postman collection chạy bằng Newman 14 assertions pass. Đây là kiểm chứng local, chưa có workflow CI/CD cho repository này.

## Đối chiếu PROMPT 2 và sơ đồ database (2026-10-09)

Bốn yêu cầu đã triển khai: cấu hình riêng trong .env (Git bỏ qua), JWT HS256 xác minh issuer/audience/expiry, Docker Compose, health endpoint truy vấn PostgreSQL thật. PORT là cổng trong container; API_PORT=3002 là cổng trên máy để không trùng Bài 1.

Sơ đồ có 7 bảng nghiệp vụ. Role và MemberShip có nhiều User; User có nhiều Order; Order có nhiều OrderDetail; Product có nhiều OrderDetail; OrderDetail có khóa chính kép (oid,pid). **Order có 0..n Shipment**, mỗi Shipment thuộc một Order. Migration 202610090001 bỏ unique trên Shipment.oid, thay bằng index; giữ tất cả bản ghi cũ.

MVP tự tạo một Shipment PENDING khi đặt hàng. `POST /api/orders/:oid/shipments` cho admin/staff tạo thêm một Shipment; khách thường bị từ chối. Order trả danh sách `shipments`. Trường `shipment` ở response tạo đơn/chi tiết vẫn là shipment đầu tiên để collection Postman đang dùng không bị hỏng; đây là trường tương thích API, không phải quan hệ một-một trong DB.

Phần mở rộng ngoài sơ đồ: User.email/phone; Order.subtotal/discount/discountRate/total; các unique cho username/tên role/tên membership. Giữ chúng để không mất dữ liệu và giữ luồng demo đã có. Công thức score10=10% chỉ là giả định demo, không do PROMPT 2 quy định. Không tuyên bố schema chỉ có đúng các cột trong ảnh.

## Học từng bước và tự đánh giá

1. Mở src/ và schema.prisma: giải thích một ứng dụng Express, một database, các module deploy cùng nhau. Đạt khi phân biệt được module với microservice.
2. Chạy `git check-ignore .env` và `git ls-files .env`: lệnh đầu in .env, lệnh sau không in gì. Không hiển thị secret để chụp ảnh.
3. Chạy `docker compose up -d --build --wait` rồi `docker compose ps`: API và PostgreSQL healthy. Không ghi đè .env hiện có.
4. Gửi GET http://localhost:3002/api/health: 200, status/database UP.
5. Chạy scripts/demo-products.sql qua psql; ghi đúng pidX/pidY mới. Không dùng mặc định 1/2.
6. Import collection Postman; điền pidX/pidY. Register: 201, normal, score10; Login: 200 và JWT. Script lưu token.
7. Đặt hàng thiếu token: 401. Có token, mua X2/Y5 đúng một lần: 201, thời gian server, chi tiết và Shipment. Tồn 8/15.
8. Chạy scripts/inspect.sql qua psql để đối chiếu đúng oid/pid/shipid. Kiểm tra nhiều Shipment bằng endpoint admin bổ sung nếu cần trình bày quan hệ trong sơ đồ.

Có thể luyện từng bước trong chat: gửi kết quả bước hiện tại để được đánh giá trước khi chuyển bước. Kết quả kiểm thử tự động không thay thế thao tác và giải thích của người học.
