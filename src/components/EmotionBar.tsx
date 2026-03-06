type Props = {
    tanoshii: number;
    utsukushii: number;
    nokoshitai: number;
};

export function EmotionBar({ tanoshii, utsukushii, nokoshitai }: Props) {
    const total = tanoshii + utsukushii + nokoshitai;
    if (total === 0) return null;

    const segments = [
        { count: tanoshii,   color: "#F97316" },
        { count: utsukushii, color: "#38BDF8" },
        { count: nokoshitai, color: "#F472B6" },
    ].filter((s) => s.count > 0);

    return (
        <div
            style={{
                display: "flex",
                width: "100%",
                height: 6,
                borderRadius: 9999,
                overflow: "hidden",
            }}
        >
            {segments.map((seg, i) => {
                let borderRadius: string;
                if (segments.length === 1) {
                    borderRadius = "9999px";
                } else if (i === 0) {
                    borderRadius = "9999px 0 0 9999px";
                } else if (i === segments.length - 1) {
                    borderRadius = "0 9999px 9999px 0";
                } else {
                    borderRadius = "0";
                }
                return (
                    <div
                        key={seg.color}
                        style={{
                            width: `${(seg.count / total) * 100}%`,
                            height: "100%",
                            background: seg.color,
                            borderRadius,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 0 8px ${seg.color}44`,
                        }}
                    />
                );
            })}
        </div>
    );
}
