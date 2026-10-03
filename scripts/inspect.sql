\dt
SELECT u.uid,u.username,r.rolename,m.mname,m.score
FROM "User" u JOIN "Role" r USING(roleid) JOIN "MemberShip" m USING(mid)
ORDER BY u.uid;
SELECT oid,uid,createat,subtotal,discount,"discountRate",total FROM "Order" ORDER BY oid;
SELECT * FROM "OrderDetail" ORDER BY oid,pid;
SELECT * FROM "Shipment" ORDER BY shipid;
SELECT pid,pname,price,quantity FROM "Product" ORDER BY pid;
