export function UserBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium">
      {name}
    </span>
  );
}
