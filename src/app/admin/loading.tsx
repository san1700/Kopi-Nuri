export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-56 bg-stone-200 dark:bg-stone-800 rounded-lg" />
        <div className="h-4 w-80 bg-stone-100 dark:bg-stone-900 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-kopi-dark-card rounded-xl p-5 border border-gray-100 dark:border-gray-800 space-y-3"
          >
            <div className="h-3 w-24 bg-stone-200 dark:bg-stone-800 rounded" />
            <div className="h-7 w-32 bg-stone-200 dark:bg-stone-800 rounded" />
            <div className="h-3 w-40 bg-stone-100 dark:bg-stone-900 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-6 border border-gray-100 dark:border-gray-800 space-y-4">
        <div className="h-5 w-44 bg-stone-200 dark:bg-stone-800 rounded" />
        <div className="h-52 w-full bg-stone-100 dark:bg-stone-900 rounded-xl" />
      </div>
    </div>
  );
}

