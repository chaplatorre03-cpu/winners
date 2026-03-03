/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#8b00ff', // Dark Violet
                    dark: '#7200d1',    // Deeper Violet
                    light: '#bc13fe',   // Lighter Violet
                },
                secondary: {
                    DEFAULT: '#ff00de', // Bright Pink/Magenta
                    dark: '#d600ba',    // Darker Pink/Magenta
                    light: '#ff66eb',   // Lighter Pink/Magenta
                },
                accent: {
                    DEFAULT: '#00ff00', // Neon Green (was Vivid Purple #d000ff)
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Poppins', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
