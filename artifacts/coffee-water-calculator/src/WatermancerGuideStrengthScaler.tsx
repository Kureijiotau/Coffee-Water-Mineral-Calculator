export function WatermancerGuideStrengthScaler() {
  return (
    <svg
      viewBox="0 0 400 220"
      role="img"
      aria-labelledby="watermancer-guide-strength-title watermancer-guide-strength-description"
      className="block h-auto w-full"
      data-testid="guide-strength-scaler-illustration"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="watermancer-guide-strength-title">
        Watermancer Strength control set to 100% baseline
      </title>
      <desc id="watermancer-guide-strength-description">
        Slider range from 0% to 200%, with 100% as the baseline.
      </desc>

      <rect
        x="1"
        y="1"
        width="398"
        height="218"
        rx="18"
        fill="#0b1220"
        stroke="#334155"
      />

      <rect
        x="247"
        y="12"
        width="138"
        height="34"
        rx="9"
        fill="#0a2531"
        stroke="#155e75"
      />
      <text
        x="260"
        y="33"
        fill="#cffafe"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="12"
        fontWeight="600"
      >
        Strength
      </text>
      <text
        x="316"
        y="33"
        fill="#cffafe"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="12"
        fontWeight="700"
      >
        100%
      </text>
      <path
        d="m365 25 5 5 5-5"
        fill="none"
        stroke="#67e8f9"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />

      <rect
        x="14"
        y="56"
        width="372"
        height="150"
        rx="15"
        fill="#0f172a"
        stroke="#155e75"
      />
      <text
        x="28"
        y="84"
        fill="#cffafe"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="13"
        fontWeight="700"
      >
        Target strength
      </text>
      <rect
        x="309"
        y="66"
        width="63"
        height="31"
        rx="7"
        fill="#020617"
        stroke="#155e75"
      />
      <text
        x="340.5"
        y="86"
        fill="#cffafe"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
      >
        100%
      </text>

      <line
        x1="30"
        y1="137"
        x2="370"
        y2="137"
        stroke="#334155"
        strokeLinecap="round"
        strokeWidth="10"
      />
      <line
        x1="30"
        y1="137"
        x2="200"
        y2="137"
        stroke="#67e8f9"
        strokeLinecap="round"
        strokeWidth="10"
      />
      <circle cx="200" cy="137" r="10" fill="#67e8f9" stroke="#cffafe" strokeWidth="3" />

      <text
        x="30"
        y="178"
        fill="#94a3b8"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="11"
        textAnchor="start"
      >
        0%
      </text>
      <text
        x="200"
        y="178"
        fill="#94a3b8"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="11"
        textAnchor="middle"
      >
        100% baseline
      </text>
      <text
        x="370"
        y="178"
        fill="#94a3b8"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="11"
        textAnchor="end"
      >
        200%
      </text>
    </svg>
  );
}
