const statusStyles: Record<string, string> = {
  pending:     "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  submitted:   "bg-gray-100 text-gray-700",
  done:        "bg-green-100 text-green-800",
};

interface BadgeProps {
  status: string;
  label: string;
}

export function Badge({ status, label }: BadgeProps) {
  const styles = statusStyles[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
      {label}
    </span>
  );
}
