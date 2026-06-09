export default function Loading() {
  return (
    <div className="p-4 pb-16 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="h-7 w-28 bg-gray-200 rounded" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-44 bg-gray-200 rounded" />
              <div className="h-3 w-64 bg-gray-200 rounded" />
              <div className="h-3 w-48 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
