-- Optional seed data for Gmail AI dashboard

INSERT INTO public.emails (id, from_email, subject, text, ai_reply, status)
VALUES
(
  'msg_001',
  'customer@example.com',
  'Missing package support request',
  'Hi, I am having trouble with my recent order. Tracking says delivered but I did not receive it. Can you help?',
  '<p>Thank you for reaching out. I understand your concern and I am checking this with our shipping partner right away. I will get back to you with next steps within 24 hours.</p>',
  'pending'
),
(
  'msg_002',
  'support@client.com',
  'Project requirements meeting',
  'We need to schedule a meeting to discuss the new project requirements. Are you available next week?',
  '<p>I would be happy to schedule this. I am available Tuesday, Wednesday, and Friday afternoon next week. Let me know your preferred time and I will send a calendar invite.</p>',
  'draft'
),
(
  'msg_003',
  'billing@company.com',
  'Invoice mismatch',
  'There seems to be an error on our latest invoice. The amount charged does not match our agreed pricing.',
  '<p>Thank you for flagging this. I have escalated your case to billing and we are reviewing the discrepancy now. We will send a corrected invoice within 2 business days.</p>',
  'sent'
)
ON CONFLICT (id) DO NOTHING;
