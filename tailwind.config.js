/** @type {import('tailwindcss').Config} */
module.exports = {
	presets: [],
	content: ["**.{html,ts}"],
	theme: {
		extend: {},
	},
	plugins: [
		require("@tailwindcss/typography"),
		require("@tailwindcss/aspect-ratio"),
		require("tailwindcss-animate"),
	],
};
