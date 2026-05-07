-- Seed data for Sombhabona Foundation sponsorship system

-- Clear existing data
DELETE FROM sponsorships;
DELETE FROM accounting_ledger;
DELETE FROM students;
DELETE FROM donors;

-- Insert Donors
INSERT INTO donors (id, name, email, phone, country, total_contributed) VALUES
(1, 'MD AREFUL ISLAM', 'areful@example.com', '+880 1712-345678', 'Bangladesh', 384000),
(2, 'Sarah Johnson', 'sarah.j@example.com', '+1 555-0123', 'United States', 240000),
(3, 'John Smith', 'john.smith@example.com', '+44 20 7123 4567', 'United Kingdom', 192000),
(4, 'Emily Davis', 'emily.d@example.com', '+61 2 1234 5678', 'Australia', 144000),
(5, 'Michael Brown', 'michael.b@example.com', '+1 555-0456', 'Canada', 288000),
(6, 'Fatima Al-Rahman', 'fatima@example.com', '+971 4 123 4567', 'UAE', 192000),
(7, 'Ahmed Hassan', 'ahmed.h@example.com', '+880 1812-345678', 'Bangladesh', 96000),
(8, 'Lisa Chen', 'lisa.c@example.com', '+65 6123 4567', 'Singapore', 144000);

-- Insert Students
INSERT INTO students (id, name, class, age, bio, photo_url, is_sponsored) VALUES
(1, 'Ayesha Rahman', '10', 15, 'Bright student aspiring to become an engineer', 'https://via.placeholder.com/300x400?text=Ayesha', TRUE),
(2, 'Karim Ahmed', '9', 14, 'Excellent in mathematics and science', 'https://via.placeholder.com/300x400?text=Karim', TRUE),
(3, 'Rakib Hassan', '11', 16, 'Football player and academic achiever', 'https://via.placeholder.com/300x400?text=Rakib', TRUE),
(4, 'Nadia Islam', '8', 13, 'Creative writer and debate champion', 'https://via.placeholder.com/300x400?text=Nadia', TRUE),
(5, 'Mehedi Hasan', '10', 15, 'Interested in computer science', 'https://via.placeholder.com/300x400?text=Mehedi', TRUE),
(6, 'Sumaiya Akter', '12', 17, 'Top student in her class', 'https://via.placeholder.com/300x400?text=Sumaiya', TRUE),
(7, 'Labiba Khan', '9', 14, 'Aspiring doctor', 'https://via.placeholder.com/300x400?text=Labiba', TRUE),
(8, 'Rima Akter', '10', 15, 'Good student with financial need', 'https://via.placeholder.com/300x400?text=Rima', FALSE),
(9, 'Shakib Khan', '11', 16, 'Wants to study business', 'https://via.placeholder.com/300x400?text=Shakib', TRUE),
(10, 'Fatima Begum', '8', 13, 'Bright student, needs support', 'https://via.placeholder.com/300x400?text=Fatima', FALSE),
(11, 'Hasan Ali', '9', 14, 'Sports enthusiast', 'https://via.placeholder.com/300x400?text=Hasan', FALSE),
(12, 'Mona Islam', '10', 15, 'Excellent in arts', 'https://via.placeholder.com/300x400?text=Mona', FALSE),
(13, 'Tahir Khan', '11', 16, 'Wants to become teacher', 'https://via.placeholder.com/300x400?text=Tahir', FALSE);

-- Insert Sponsorships
INSERT INTO sponsorships (student_id, donor_id, start_date, end_date, amount, status) VALUES
(1, 1, '2025-01-15', NULL, 6000, 'Active'),
(2, 1, '2025-02-01', NULL, 6000, 'Active'),
(3, 2, '2025-03-10', NULL, 6000, 'Active'),
(4, 3, '2025-04-05', NULL, 6000, 'Active'),
(5, 4, '2025-05-01', NULL, 6000, 'Active'),
(6, 5, '2024-11-20', NULL, 6000, 'Active'),
(7, 6, '2025-01-25', NULL, 6000, 'Active'),
(9, 8, '2024-12-01', NULL, 6000, 'Active');

-- Insert Ledger Entries
INSERT INTO accounting_ledger (date, voucher_ref, particulars, category, type, amount, closing_balance) VALUES
('2024-11-01', 'V-001', 'Monthly donation from Sarah', 'Donation', 'Credit', 240000, 240000),
('2024-11-05', 'V-002', 'Monthly sponsorship disbursement', 'Sponsorship', 'Debit', 42000, 198000),
('2024-12-01', 'V-003', 'Monthly donations collected', 'Donation', 'Credit', 480000, 678000),
('2024-12-05', 'V-004', 'Monthly sponsorship disbursement', 'Sponsorship', 'Debit', 42000, 636000),
('2025-01-01', 'V-005', 'Q1 donations received', 'Donation', 'Credit', 520000, 1156000),
('2025-01-10', 'V-006', 'Salary expenses', 'Salary', 'Debit', 50000, 1106000),
('2025-01-15', 'V-007', 'Monthly sponsorship disbursement', 'Sponsorship', 'Debit', 42000, 1064000),
('2025-02-01', 'V-008', 'Monthly donations', 'Donation', 'Credit', 495000, 1559000),
('2025-02-10', 'V-009', 'Office maintenance', 'Maintenance', 'Debit', 15000, 1544000),
('2025-02-15', 'V-010', 'Monthly sponsorship disbursement', 'Sponsorship', 'Debit', 42000, 1502000),
('2025-03-01', 'V-011', 'Monthly donations', 'Donation', 'Credit', 535000, 2037000),
('2025-03-10', 'V-012', 'Program expenses', 'Program', 'Debit', 25000, 2012000),
('2025-03-15', 'V-013', 'Monthly sponsorship disbursement', 'Sponsorship', 'Debit', 42000, 1970000),
('2025-04-01', 'V-014', 'Monthly donations', 'Donation', 'Credit', 510000, 2480000),
('2025-04-15', 'V-015', 'Monthly sponsorship disbursement', 'Sponsorship', 'Debit', 42000, 2438000),
('2025-05-01', 'V-016', 'Monthly donations', 'Donation', 'Credit', 542000, 2980000),
('2025-05-15', 'V-017', 'Monthly sponsorship disbursement', 'Sponsorship', 'Debit', 42000, 2938000);

-- Reset sequences for auto-increment
SELECT setval('students_id_seq', 14);
SELECT setval('donors_id_seq', 9);
SELECT setval('sponsorships_id_seq', 9);
SELECT setval('accounting_ledger_id_seq', 18);
