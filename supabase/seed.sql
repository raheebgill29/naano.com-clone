-- Demo seed for Naano marketplace presentation.
-- Safe to re-run. Does not hardcode data into React components.
-- Portrait assets live in /public/demo/avatars (Unsplash License).
-- Demo creator password (if signing in): DemoCreator1!

-- ---------------------------------------------------------------------------
-- Polish existing sparse creator rows (audience < 1k or blank location)
-- ---------------------------------------------------------------------------
update public.creators c
set
  audience_size = greatest(coalesce(c.audience_size, 0), 18400),
  location = coalesce(nullif(trim(c.location), ''), 'Remote'),
  languages = case
    when coalesce(cardinality(c.languages), 0) = 0 then array['English']::text[]
    else c.languages
  end,
  audience_summary = coalesce(
    nullif(trim(c.audience_summary), ''),
    'B2B operators and product marketers evaluating AI and SaaS workflows.'
  ),
  headline = case
    when c.headline ilike '%just a creator%'
      or length(trim(c.headline)) < 12
      then 'B2B creator covering practical AI, automation, and SaaS delivery'
    else c.headline
  end,
  updated_at = timezone('utc', now())
where c.publication_status = 'published'
  and (
    coalesce(c.audience_size, 0) < 1000
    or coalesce(nullif(trim(c.location), ''), '') = ''
    or c.headline ilike '%just a creator%'
  );

-- ---------------------------------------------------------------------------
-- Meaningful campaign names / budgets for unfinished demo labels
-- ---------------------------------------------------------------------------
update public.campaigns
set
  campaign_name = 'Q3 Thought Leadership Series',
  product_or_company = coalesce(nullif(trim(product_or_company), ''), 'Acme Platform'),
  budget_cents = greatest(budget_cents, 850000),
  updated_at = timezone('utc', now())
where lower(trim(campaign_name)) in ('campaign one', 'campaign 1');

update public.campaigns
set
  campaign_name = 'Product Launch Creator Wave',
  product_or_company = coalesce(nullif(trim(product_or_company), ''), 'Acme Platform'),
  budget_cents = greatest(budget_cents, 1200000),
  updated_at = timezone('utc', now())
where lower(trim(campaign_name)) in ('campaign two', 'campaign 2');

-- ---------------------------------------------------------------------------
-- Demo marketplace creators (idempotent by id/slug)
-- handle_new_user trigger creates profiles from auth metadata.
-- ---------------------------------------------------------------------------
do $$
declare
  demo record;
  uid uuid;
begin
  for demo in
    select *
    from (
      values
        (
          '11111111-1111-4111-8111-111111111101'::uuid,
          'maya.chen@demo.naano.local',
          'Maya Chen',
          'maya-chen',
          'LinkedIn voice for B2B SaaS category creation',
          'Helps growth and product teams turn customer proof into executive-ready narratives.',
          array['SaaS','Category design','Demand gen']::text[],
          48200,
          'VP Marketing and RevOps leaders at Series B–D SaaS companies.',
          95000,
          'San Francisco, CA',
          array['English','Mandarin']::text[],
          '/demo/avatars/maya-chen.jpg'
        ),
        (
          '11111111-1111-4111-8111-111111111102'::uuid,
          'james.okafor@demo.naano.local',
          'James Okafor',
          'james-okafor',
          'Operator-led content for fintech and payments',
          'Former payments PM creating concise explainers for finance and platform teams.',
          array['Fintech','Payments','Risk']::text[],
          31500,
          'Fintech PMs, compliance leads, and banking partnership managers.',
          78000,
          'London, UK',
          array['English']::text[],
          '/demo/avatars/james-okafor.jpg'
        ),
        (
          '11111111-1111-4111-8111-111111111103'::uuid,
          'sofia.alvarez@demo.naano.local',
          'Sofia Alvarez',
          'sofia-alvarez',
          'Developer marketing for API-first products',
          'Technical storytelling that helps engineering buyers evaluate platform bets.',
          array['Developer tools','APIs','Infrastructure']::text[],
          62100,
          'Staff engineers, platform leads, and developer advocates.',
          110000,
          'Madrid, Spain',
          array['English','Spanish']::text[],
          '/demo/avatars/sofia-alvarez.jpg'
        ),
        (
          '11111111-1111-4111-8111-111111111104'::uuid,
          'daniel.park@demo.naano.local',
          'Daniel Park',
          'daniel-park',
          'HR tech and workplace culture storytelling',
          'Builds trust with People leaders through candid, research-backed LinkedIn posts.',
          array['HR tech','Workplace','Leadership']::text[],
          27400,
          'CHROs, talent leaders, and PeopleOps teams at mid-market companies.',
          65000,
          'Toronto, Canada',
          array['English','Korean']::text[],
          '/demo/avatars/daniel-park.jpg'
        ),
        (
          '11111111-1111-4111-8111-111111111105'::uuid,
          'amira.hassan@demo.naano.local',
          'Amira Hassan',
          'amira-hassan',
          'Climate and industrial tech for enterprise buyers',
          'Turns complex sustainability programs into clear commercial narratives.',
          array['Climate tech','ESG','Industrial']::text[],
          40800,
          'Sustainability officers and industrial procurement decision-makers.',
          88000,
          'Amsterdam, NL',
          array['English','Arabic','Dutch']::text[],
          '/demo/avatars/amira-hassan.jpg'
        )
    ) as t(
      id, email, full_name, slug, headline, bio, topics, audience_size,
      audience_summary, price_cents, location, languages, avatar_url
    )
  loop
    uid := demo.id;

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      uid,
      'authenticated',
      'authenticated',
      demo.email,
      crypt('DemoCreator1!', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'full_name', demo.full_name,
        'role', 'creator',
        'avatar_url', demo.avatar_url
      ),
      timezone('utc', now()),
      timezone('utc', now())
    )
    on conflict (id) do nothing;

    update public.profiles
    set full_name = demo.full_name,
        avatar_url = demo.avatar_url,
        onboarding_completed = true,
        role = 'creator'
    where id = uid;

    insert into public.creators (
      profile_id,
      slug,
      headline,
      bio,
      topics,
      audience_size,
      audience_summary,
      price_cents,
      currency,
      location,
      languages,
      publication_status,
      availability
    )
    values (
      uid,
      demo.slug,
      demo.headline,
      demo.bio,
      demo.topics,
      demo.audience_size,
      demo.audience_summary,
      demo.price_cents,
      'USD',
      demo.location,
      demo.languages,
      'published',
      'available'
    )
    on conflict (slug) do update
      set headline = excluded.headline,
          bio = excluded.bio,
          topics = excluded.topics,
          audience_size = excluded.audience_size,
          audience_summary = excluded.audience_summary,
          price_cents = excluded.price_cents,
          location = excluded.location,
          languages = excluded.languages,
          publication_status = 'published',
          availability = 'available',
          updated_at = timezone('utc', now());
  end loop;
end $$;
