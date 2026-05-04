# SNS CRM

A small static PWA for managing the Supply Net Solutions client pipeline.

## What it tracks

- Company name
- Property type: Multifamily, nursing home, assisted living, or other
- Units / beds
- Product interest
- Contact person, phone, and email
- Status: Meet, Follow up, Contract sent, Negotiations, Order received, Installation done
- Order received checkbox
- Notes

## Run locally

Open `index.html` in a browser. The app works without a build step and stores records in the browser by default.

For full PWA service worker behavior, serve the folder over a local web server, for example:

```powershell
python -m http.server 5173
```

Then open `http://localhost:5173`.

## Shared data setup

For shared editing between you and SNS users, create a free Supabase project and run this SQL in the Supabase SQL editor:

```sql
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  property_type text not null default 'Multifamily',
  site_size text,
  interest text,
  contact text,
  phone text,
  email text,
  status text not null default 'Meet',
  order_received boolean not null default false,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "Allow public CRM access"
on public.clients for all
using (true)
with check (true);
```

In the app, open Settings and paste:

- Supabase project URL
- Supabase anon public key

## Deploy

This is a static app. It can be deployed free on Vercel, Netlify, GitHub Pages, or Cloudflare Pages.

For Vercel, import the GitHub repository and keep the default static settings. No build command is needed.
