/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                board: {
                    light: '#F0D9B5',
                    dark: '#B58863',
                    selected: '#829769',
                    lastMove: '#CDD26A',
                    legalMove: '#646D4080',
                    check: '#FF6B6B',
                },
                surface: '#272522',
                background: '#312E2B',
                primary: '#81B64C',
                secondary: '#E5C47E',
                danger: '#E53935',
                warning: '#FB8C00',
            },
            fontFamily: {
                sans: ['Inter', 'Roboto', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
