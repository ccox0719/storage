# Important Contacts

Open **Important Contacts** on Home. Neighbors appear in their own group; use the
category `Neighbor` (the form normalizes `neighbor` and `neighbors`). Other roles
remain free text for contractors, vendors, utilities and support.

Fields: name/company, role/category, phone, email, notes, last service date.
Unknown contact details are blank and marked incomplete. A neighbor's blank last
service date is shown as not applicable. Search covers name, category and details.

## Storage and access

Contacts reuse the existing `public.home_tasks` reference-record convention in
Supabase project `svaozzitkajgqzacldur`. Keys start with `contact:`. Notes contain
`__TASKSTATE__` followed by JSON with `disabled: true` and a `contact` object.
The top-level disabled flag keeps these out of maintenance lists on older clients;
new clients exclude the key namespace explicitly. Contact edits upsert only the
selected record, scoped by household and external ID. Existing bulk task saves do
not overwrite contacts. No schema, policies, functions, triggers, publications or
environment configuration changed. Existing household RLS remains in force.

Private contacts are fetched after household authentication and held in memory;
new contact data is never bundled or written to localStorage. Existing legacy
`wil-neighbors` caches are migrated on connection with stable IDs and insert-only
upserts, preserving cloud records and leaving the original cache intact. Existing
cloud rows take precedence on an ID conflict. Sign out clears contacts in memory.

## Verified seed data

Four entries were inserted directly into the household database, with conflict
handling that leaves existing rows intact. Their details are intentionally omitted
from public source. Sources: existing pool and HVAC system records, existing
neighbor entry, and the supplied security/camera proposals. Proposals do not
establish a completed service date. No utilities or unverified numbers were added.
A scoped pre-insert snapshot and rollback were retained outside the repository.

## Verification

Serve this directory on port 8765, install Playwright in a development environment,
and run `node tests/contacts.cjs`. The browser test uses synthetic contacts and a
mock authenticated Supabase client. It covers search, neighbor grouping, create,
reload, validation, retry after a failed save, escaping, legacy neighbor migration,
maintenance exclusion, navigation, mobile overflow and clearing on sign out.

Database checks verified all four seed rows, enabled RLS, and zero visible contact
rows for an unrelated authenticated identity. A real anonymous Data API request
was denied. A real household browser login was not available for end-to-end
production editing verification. Source changes require merge and GitHub Pages
publication before the new UI is live.
