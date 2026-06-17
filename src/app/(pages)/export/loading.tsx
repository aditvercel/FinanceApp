export default function Loading() {
  return (
    <div className="p-4 pb-16 space-y-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="h-7 w-36 bg-gray-200 rounded" />
      </div>

      <div className="space-y-2">
        <div className="h-4 w-12 bg-gray-200 rounded" />
        <div className="h-11 w-full bg-gray-200 rounded-lg" />
      </div>

      <div className="space-y-2">
        <div className="h-4 w-12 bg-gray-200 rounded" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200">
              <div className="w-6 h-6 bg-gray-200 rounded" />
              <div className="h-4 w-12 bg-gray-200 rounded" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-4 w-10 bg-gray-200 rounded" />
        <div className="h-11 w-full bg-gray-200 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-11 w-full bg-gray-200 rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-14 bg-gray-200 rounded" />
          <div className="h-11 w-full bg-gray-200 rounded-lg" />
        </div>
      </div>

      <div className="h-12 w-full bg-gray-200 rounded-xl" />
    </div>
  );
}
