export default function Loading() {
  return (
    <div className="p-4 pb-16 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="h-7 w-24 bg-gray-200 rounded" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-4 border rounded-xl">
          <div className="w-10 h-10 bg-gray-200 rounded-lg" />
          <div className="flex-1 h-4 w-28 bg-gray-200 rounded" />
          <div className="w-4 h-4 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}
