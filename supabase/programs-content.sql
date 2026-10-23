-- Run AFTER programs.sql. Replaces the "Describe this program here." placeholders with real page text
-- that matches the homepage. Edit freely, or change it later from Admin > programs.
update public.programs set body =
'Who it is for: students, job seekers, small business owners and community health workers.

What we do: we teach hands-on skills, from using a computer safely to finding information, running a small business online and keeping records, in short courses that fit around work and school.

The change we work toward: participants who can apply for opportunities, earn or save money with digital tools, and use technology to improve health in their own community.' where slug='digital-skilling';
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
