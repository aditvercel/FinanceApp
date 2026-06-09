export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-pulse">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3 text-center">
          <div className="h-8 w-48 bg-gray-200 rounded mx-auto" />
          <div className="h-4 w-64 bg-gray-200 rounded mx-auto" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 border rounded-xl">
              <div className="w-5 h-5 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-56 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-2 h-2 bg-gray-200 rounded-full" />
          ))}
        </div>
        <div className="h-12 w-full bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
