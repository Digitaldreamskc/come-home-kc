import Link from 'next/link';

export default function WorkspaceSidebar({links, current, staff}: {
  links: {label: string; href: string}[]; current: string; staff: boolean;
}) {
  const teamSections = ['Publishing', 'Intelligence', 'Intake', 'Onboarding'];
  const partnership = links.filter(link => !teamSections.includes(link.label));
  const team = links.filter(link => teamSections.includes(link.label));
  function navigation() {
    return <nav className="workspace-sidebar-nav" aria-label="Workspace sections">
      <div className="workspace-sidebar-group">
        <span>Partnerships</span>
        {partnership.map(link => <Link key={link.label} href={link.href}
          aria-current={current === link.label ? 'page' : undefined}>{link.label}</Link>)}
      </div>
      <div className="workspace-sidebar-group">
        {staff && <span>Team operations</span>}
        {team.map(link => <Link key={link.label} href={link.href}
          aria-current={current === link.label ? 'page' : undefined}>{link.label}</Link>)}
        <Link href={staff ? '/admin' : '/portal'}>{staff ? 'Team records' : 'My account'}</Link>
      </div>
    </nav>;
  }
  return <aside className="workspace-sidebar">
    <div className="workspace-sidebar-desktop">{navigation()}</div>
    <details className="workspace-sidebar-mobile" key={current}>
      <summary><span>Workspace menu</span><span>{current}</span></summary>
      {navigation()}
    </details>
  </aside>;
}
