interface NoticeBannerProps {
  tone?: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
}

const toneStyles: Record<NonNullable<NoticeBannerProps['tone']>, string> = {
  success: 'border-[#c6e7dd] bg-[#eef9f5] text-[#116e54]',
  error: 'border-[#f1c5b8] bg-[#fff1ec] text-[#bf5b37]',
  info: 'border-[#d8ddd9] bg-white text-slate-600',
};

export default function NoticeBanner({
  tone = 'info',
  message,
  onClose,
}: NoticeBannerProps) {
  return (
    <div
      className={`mb-4 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${toneStyles[tone]}`}
    >
      <p className="min-w-0 flex-1">{message}</p>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full px-2 text-base leading-none opacity-70 transition hover:opacity-100"
          aria-label="Dismiss message"
        >
          x
        </button>
      ) : null}
    </div>
  );
}
