type Props = {
    tanoshii: number;
    utsukushii: number;
    nokoshitai: number;
};

export function EmotionBar({ tanoshii, utsukushii, nokoshitai }: Props) {
    const total = tanoshii + utsukushii + nokoshitai;
    if (total === 0) return null;

    const segments = [
        {
            count: tanoshii,
            background: "linear-gradient(90deg, #F97316, #FBBF24, #F97316)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 0 8px rgba(249, 115, 22, 0.6), 0 0 16px rgba(249, 115, 22, 0.3)",
        },
        {
            count: utsukushii,
            background: "linear-gradient(90deg, #38BDF8, #818CF8, #38BDF8)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 0 8px rgba(56, 189, 248, 0.6), 0 0 16px rgba(56, 189, 248, 0.3)",
        },
        {
            count: nokoshitai,
            background: "linear-gradient(90deg, #F472B6, #E879F9, #F472B6)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 0 8px rgba(244, 114, 182, 0.6), 0 0 16px rgba(244, 114, 182, 0.3)",
        },
    ].filter((s) => s.count > 0);

    return (
        <div
            style={{
                display: "flex",
                width: "100%",
                height: 8,
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
                        key={seg.background}
                        style={{
                            width: `${(seg.count / total) * 100}%`,
                            height: "100%",
                            background: seg.background,
                            borderRadius,
                            boxShadow: seg.boxShadow,
                        }}
                    />
                );
            })}
        </div>
    );
}
