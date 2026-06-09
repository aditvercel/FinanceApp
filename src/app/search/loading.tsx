export default function Loading() {
  return (
    <div className="p-4 pb-16 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="h-7 w-20 bg-gray-200 rounded" />
      </div>

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-200 rounded" />
        <div className="w-full h-10 bg-gray-200 rounded-lg" />
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-16 bg-gray-200 rounded-full" />
        ))}
      </div>

      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-36 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
