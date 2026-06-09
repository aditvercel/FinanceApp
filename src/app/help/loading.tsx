export default function Loading() {
  return (
    <div className="p-4 pb-16 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="h-7 w-20 bg-gray-200 rounded" />
      </div>
      <div className="text-center py-12 space-y-2">
        <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto" />
        <div className="h-4 w-32 bg-gray-200 rounded mx-auto" />
      </div>
    </div>
  );
}
