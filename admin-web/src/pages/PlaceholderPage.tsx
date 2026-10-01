export default function PlaceholderPage({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500 mt-2">
        {note ?? "Раздел в разработке"}
      </p>
    </div>
  );
}
