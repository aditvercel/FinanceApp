export default function Loading() {
  return (
    <div className="p-4 pb-16 space-y-4 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div className="h-7 w-36 bg-gray-200 rounded" />
          <div className="h-5 w-5 bg-gray-200 rounded-full" />
        </div>
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </div>

      <div className="h-4 w-16 bg-gray-200 rounded" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 p-4 border border-blue-100 rounded-xl">
            <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-gray-200 rounded" />
              <div className="h-3 w-56 bg-gray-200 rounded" />
              <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
            <div className="w-2 h-2 bg-gray-200 rounded-full mt-2" />
          </div>
        ))}
      </div>

      <div className="h-4 w-16 bg-gray-200 rounded" />
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3 p-4 border rounded-lg">
            <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 bg-gray-200 rounded" />
              <div className="h-3 w-48 bg-gray-200 rounded" />
              <div className="h-3 w-14 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
