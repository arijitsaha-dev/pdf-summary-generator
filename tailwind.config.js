/** @type {import('tailwindcss').Config} */
module.exports = {
	presets: [],
	content: ["**.{html,ts}"],
	theme: {
		extend: {
			animation: {
				blink: "blink 1s step-end infinite",
			},
			keyframes: {
				blink: {
					"0%, 100%": { opacity: "1" },
					"50%": { opacity: "0" },
				},
			},
		},
	},
	plugins: [require("@tailwindcss/typography"), require("@tailwindcss/aspect-ratio"), require("tailwindcss-animate")],
};
