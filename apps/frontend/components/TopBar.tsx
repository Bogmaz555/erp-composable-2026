"use client";

import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import RoleBadge from './RoleBadge';
import ApprovalInbox from './ApprovalInbox';
import TenantSelector from './TenantSelector';
import LoginButton from './LoginButton';

export default function TopBar() {
  return (
    <div className="hidden md:flex sticky top-0 z-30 items-center justify-end gap-3 px-6 py-3 bg-zinc-950/90 backdrop-blur border-b border-slate-800/50">
      <TenantSelector />
      <GlobalSearch />
      <ApprovalInbox />
      <NotificationBell />
      <LoginButton />
      <RoleBadge />
    </div>
  );
}
