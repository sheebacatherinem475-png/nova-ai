export default function Loading() {
    // Or a custom loading skeleton component
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-600 border-t-blue-600"></div>
      </div>
    )
  }
