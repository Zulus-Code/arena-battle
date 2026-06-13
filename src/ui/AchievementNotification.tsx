// ─── Achievement Notification ─────────────────────────────────────────────────
// Toast-style notification that appears when an achievement is earned.

import { useGamificationStore } from '@/store/gamificationStore';

function StarIcon() {
  return (
    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default function AchievementNotifications() {
  const notifications = useGamificationStore((s) => s.notifications);
  const dismiss = useGamificationStore((s) => s.dismissNotification);

  if (notifications.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-20 right-4 z-50 flex flex-col gap-3">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto flex items-start gap-3 rounded-lg border border-yellow-600/40 px-4 py-3 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(30,35,20,0.95), rgba(20,25,15,0.95))',
            animation: 'achievementSlideIn 400ms ease-out',
            minWidth: 280,
            maxWidth: 360,
          }}
        >
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-xl">
            {n.icon === '⭐' ? <StarIcon /> : n.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold tracking-wider text-yellow-400/80 uppercase">
                Достижение получено!
              </span>
              <button
                onClick={() => dismiss(n.id)}
                className="text-gray-500 hover:text-gray-300 transition-colors text-sm leading-none"
              >
                ✕
              </button>
            </div>
            <div className="mt-0.5 text-sm font-semibold text-gray-100">
              {n.title}
            </div>
            <div className="mt-0.5 text-xs text-gray-400 leading-tight">
              {n.description}
            </div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes achievementSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
