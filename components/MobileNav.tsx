export function MobileNav({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="mobile-nav ui">
      <summary>{label}</summary>
      {children}
    </details>
  );
}
