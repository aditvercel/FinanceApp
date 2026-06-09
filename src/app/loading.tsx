export default function Loading() {
  return (
    <div className="p-4 pb-16 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
          <div className="h-5 w-28 bg-gray-200 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        </div>
      </div>

      <div className="bg-gray-100 rounded-xl p-4 space-y-3">
        <div className="h-3 w-20 bg-gray-200 rounded" />
        <div className="h-8 w-44 bg-gray-200 rounded" />
        <div className="h-3 w-32 bg-gray-200 rounded" />
        <div className="flex gap-4">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-28 bg-gray-200 rounded" />
        </div>
      </div>

      <div className="h-4 w-24 bg-gray-200 rounded" />

      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-100 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded-full" />
          </div>
          <div className="h-6 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-40 bg-gray-200 rounded" />
        </div>
      ))}

      <div className="flex gap-3">
        <div className="flex-1 h-11 bg-gray-200 rounded-xl" />
        <div className="flex-1 h-11 bg-gray-200 rounded-xl" />
      </div>

      <div className="h-4 w-24 bg-gray-200 rounded" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="w-6 h-6 bg-gray-200 rounded shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-40 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
