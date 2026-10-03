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
