export default function KasirLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-stone-200 dark:bg-stone-800 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-6 border border-gray-100 dark:border-gray-800 h-64" />
        <div className="bg-white dark:bg-kopi-dark-card rounded-xl p-6 border border-gray-100 dark:border-gray-800 h-64" />
      </div>
    </div>
  );
}

