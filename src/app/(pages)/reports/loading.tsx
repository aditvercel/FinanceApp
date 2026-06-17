export default function Loading() {
  return (
    <div className="p-4 pb-16 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="h-7 w-40 bg-gray-200 rounded" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-100 rounded-xl p-4 space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-6 w-44 bg-gray-200 rounded" />
          <div className="h-3 w-36 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}
