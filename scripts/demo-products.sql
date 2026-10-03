-- Run with psql inside the postgres container. Record the returned pid values.
INSERT INTO "Product" (pname,price,quantity)
VALUES ('X',100.00,10),('Y',20.00,20)
RETURNING pid,pname,price,quantity;
