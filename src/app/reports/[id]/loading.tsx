export default function Loading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          </div>
        </div>
        <div className="h-7 w-48 bg-gray-200 rounded" />
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-5 w-14 bg-gray-200 rounded-full" />
        </div>
      </div>

      <div className="flex border-b px-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 py-3">
            <div className="h-4 w-16 bg-gray-200 rounded mx-auto" />
          </div>
        ))}
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="bg-gray-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-3 w-16 bg-gray-200 rounded" />
          </div>
          <div className="h-7 w-36 bg-gray-200 rounded" />
          <div className="h-40 bg-gray-200 rounded-lg" />
          <div className="flex gap-4">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-4 w-28 bg-gray-200 rounded" />
          </div>
        </div>

        <div className="bg-gray-100 rounded-xl p-4 space-y-3">
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-40 bg-gray-200 rounded-lg" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="flex items-center gap-3">
                <div className="h-4 w-16 bg-gray-200 rounded" />
                <div className="h-4 w-8 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>

        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-200 rounded" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
            <div className="w-4 h-4 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
