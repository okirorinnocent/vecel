-- Field-note DRAFTS for the "updates" table. They are inserted UNPUBLISHED (published=false).
-- Replace every [bracket] with a real, verified detail, then publish from the Supabase table editor
-- (set published = true) or re-post through Admin > compose. Never publish invented numbers or names.
insert into public.updates (title, body, published) values
('Health talk at [place], [Month Year]',
 'On [date] our team and [number] community health volunteers held a session at [venue] on [topic, e.g. clean water and handwashing]. About [number] people attended, including [groups, e.g. mothers, school pupils]. Questions from the group were mostly about [theme]. Next, we will [follow-up action] and return on [date]. Thank you to [leader/facility], who hosted us.', false),
('Digital skills class: what [number] learners practised this month',
 'This month''s class at [venue] covered [skills, e.g. typing, email, saving files]. [Number] learners attended, [number] of them for the first time. One learner told us they [consented quote or paraphrase]. What we learned: [one honest lesson, e.g. we need more devices / evening slots]. Next month: [plan].', false),
('Surgical care support: where we are this quarter',
 'This quarter we worked with [facility] to support [number] patients with [type of support, e.g. implants, equipment, transport]. We cannot share patient details, but we can say [aggregate outcome]. The main challenge was [challenge]. If you can help with [specific need], please get in touch.', false),
('Youth group meeting in [place]',
 '[Number] young people met on [date] to [activity]. They chose [topic] for the next session and two members will help lead it. We are looking for [specific help, e.g. a mentor in nursing or IT].', false),
('Research note: what we are asking and why',
 'We have started a small study on [question] in [area], with [approval/permission details]. We will share what we find, including limits and surprises, by [date]. If you work on [related area], we would welcome your advice.', false);
