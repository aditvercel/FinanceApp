export default function Loading() {
  return (
    <div className="p-4 pb-16 space-y-6 animate-pulse">
      <div className="h-7 w-20 bg-gray-200 rounded" />

      <div className="flex items-center gap-4 p-4 border border-(--border) rounded-xl">
        <div className="w-16 h-16 bg-gray-200 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
      </div>

      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 border rounded-xl">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div className="flex-1 h-4 w-24 bg-gray-200 rounded" />
            <div className="w-4 h-4 bg-gray-200 rounded" />
          </div>
        ))}
        <div className="pt-4">
          <div className="flex items-center gap-3 p-4 border rounded-xl">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div className="flex-1 h-4 w-20 bg-gray-200 rounded" />
            <div className="w-4 h-4 bg-gray-200 rounded" />
          </div>
        </div>
      </div>

      <div className="text-center space-y-1">
        <div className="h-3 w-24 bg-gray-200 rounded mx-auto" />
        <div className="h-3 w-20 bg-gray-200 rounded mx-auto" />
      </div>
    </div>
  );
}
