-- Double state: onboarding (instructor) vs approval (admin).
-- approval_status is managed by admin only; instructor can read own row.
alter table instructors
  add column if not exists approval_status text not null default 'pending';

comment on column instructors.approval_status is 'Admin-managed: pending | approved | rejected';

create index if not exists idx_instructors_approval_status on instructors (approval_status);
