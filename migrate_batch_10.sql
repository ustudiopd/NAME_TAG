-- profiles 테이블 배치 10 (1개 레코드)
INSERT INTO nametag.profiles (id, created_at, company, name, title, is_checked_in, checked_in_at, event_id, phone_number, email)
VALUES
('62708fce-90e7-4344-bea0-05c13bfdf4f0', '2025-11-07 06:58:22.312727+00', '경제·인문사회연구회', '박수지', '부전문위원', FALSE, NULL, '731be964-97b4-4e81-813f-a68dd9461a1b', NULL, NULL)
ON CONFLICT (id) DO NOTHING;