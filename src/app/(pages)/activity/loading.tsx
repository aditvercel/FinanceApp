export default function Loading() {
  return (
    <div className="p-4 pb-16 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="h-7 w-24 bg-gray-200 rounded" />
      </div>

      {[1, 2, 3].map((day) => (
        <div key={day} className="space-y-3">
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="space-y-1">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-start gap-3 p-2">
                <div className="w-4 h-4 bg-gray-200 rounded mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-24 bg-gray-200 rounded" />
                    <div className="h-3 w-12 bg-gray-200 rounded" />
                  </div>
                  <div className="h-3 w-48 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
