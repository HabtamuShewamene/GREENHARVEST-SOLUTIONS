-- Seeds initial platform users. Sample password for all seeded users: 1921
INSERT INTO users (name, email, password, role, phone, address)
VALUES
  ('Platform Admin', 'admin@agro.local', '$2b$10$dyImiM6s8iYQgW4pMgWmi.7mnEnpPDMZh2xzZ625MWUYpQtDLNAKO', 'admin', '+2348000000001', 'Head Office'),
  ('Green Farm', 'farmer@agro.local', '$2b$10$dyImiM6s8iYQgW4pMgWmi.7mnEnpPDMZh2xzZ625MWUYpQtDLNAKO', 'farmer', '+2348000000002', 'Kaduna Farm Settlement'),
  ('Fresh Buyer', 'buyer@agro.local', '$2b$10$dyImiM6s8iYQgW4pMgWmi.7mnEnpPDMZh2xzZ625MWUYpQtDLNAKO', 'buyer', '+2348000000003', 'Abuja City Center'),
  ('Fast Delivery', 'delivery@agro.local', '$2b$10$dyImiM6s8iYQgW4pMgWmi.7mnEnpPDMZh2xzZ625MWUYpQtDLNAKO', 'delivery', '+2348000000004', 'Lagos Dispatch Hub')
ON CONFLICT (email) DO NOTHING;
