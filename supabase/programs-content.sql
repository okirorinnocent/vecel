-- Run AFTER programs.sql. Replaces the "Describe this program here." placeholders with real page text
-- that matches the homepage. Edit freely, or change it later from Admin > programs.
insert into public.programs(slug,title,summary,icon,body,sort_order,published)
values (
  'biomedical-engineering-volunteer-services',
  'Biomedical engineering volunteer services',
  'Free training, equipment maintenance guidance and practical support for healthcare teams.',
  '⚙️',
  'Who it is for: health facilities, clinicians, health workers and equipment users.

What we do: we provide free user training, basic equipment checks, preventive maintenance guidance and practical troubleshooting support for healthcare equipment, working with facility teams and qualified volunteers. We document equipment needs and publish field notes, lessons and service updates when it is safe and appropriate to do so.

The change we work toward: health workers who can use equipment safely and facilities that keep essential devices working, maintained and available for patient care.',
  10,
  true
)
on conflict (slug) do update set
  title=excluded.title,
  summary=excluded.summary,
  icon=excluded.icon,
  body=excluded.body,
  published=true,
  updated_at=now();

update public.programs set body =
'Who it is for: our own programs, health partners and policymakers.

What we do: we gather evidence from the communities we serve, with ethical approval where required, test small practical ideas, and share findings openly so others can use them.

The change we work toward: decisions about local health that are based on local evidence, and programs that improve because we measure honestly.' where slug='research-innovation';
update public.programs set body =
'Who it is for: families, caregivers and community health volunteers.

What we do: we run practical sessions in villages, schools, markets and health centres on topics communities ask for, such as hygiene, nutrition, maternal and child health, and when to seek care. Sessions are held in the local language, with demonstrations rather than lectures.

The change we work toward: people who recognise warning signs earlier, know where to go for care, and pass reliable information on to their neighbours.' where slug='public-health-education';
update public.programs set body =
'Who it is for: patients who need surgery and cannot afford the equipment, implants or travel.

What we do: we source and subsidise essential equipment and implants, and support the practical barriers that stop patients reaching an operating theatre, working through licensed facilities and qualified surgical teams.

The change we work toward: fewer people waiting in pain or disability for an operation that is available but out of reach.' where slug='surgical-care-support';
update public.programs set body =
'Who it is for: young people, in and out of school.

What we do: we offer mentoring, leadership practice and skills training, and give young people real responsibility, such as co-leading health sessions and shaping our youth activities.

The change we work toward: young people who can build a livelihood, speak up for their community and become the next generation of local leaders.' where slug='youth-empowerment';
