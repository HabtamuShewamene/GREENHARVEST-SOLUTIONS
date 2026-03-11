-- Seeds initial platform users. Sample password for all seeded users: Password123!
INSERT INTO users (name, email, password, role, phone, address)
VALUES
  ('Platform Admin', 'admin@agro.local', '$2b$10$e.sds0xv7bsy4keySofx1OhcmaUcgrpbq6nybRmenO0UbTvfKBL3S', 'admin', '+2348000000001', 'Head Office'),
  ('Green Farm', 'farmer@agro.local', '$2b$10$e.sds0xv7bsy4keySofx1OhcmaUcgrpbq6nybRmenO0UbTvfKBL3S', 'farmer', '+2348000000002', 'Kaduna Farm Settlement'),
  ('Fresh Buyer', 'buyer@agro.local', '$2b$10$e.sds0xv7bsy4keySofx1OhcmaUcgrpbq6nybRmenO0UbTvfKBL3S', 'buyer', '+2348000000003', 'Abuja City Center'),
  ('Fast Delivery', 'delivery@agro.local', '$2b$10$e.sds0xv7bsy4keySofx1OhcmaUcgrpbq6nybRmenO0UbTvfKBL3S', 'delivery', '+2348000000004', 'Lagos Dispatch Hub')
ON CONFLICT (email) DO NOTHING;
