/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink:      '#0E0E0E',
        'ink-2':  '#5C5856',
        'ink-3':  '#8A8682',
        divider:  '#E5E5E5',
        'bg-soft':'#F7F6F4',
        soft:     '#F7F6F4',
        burgundy: '#7A2D3A',
        teal:     '#2E6560',
        mauve:    '#7A5C72',
        ochre:    '#9C6B28',
        'slate-c':'#3D5068',
        fig:      '#5C4A7A',
        mustard:  '#C4A040',
        'mustard-ink': '#1E1808',
      },
      fontFamily: {
        wordmark: ["'Bodoni Moda'", 'Georgia', 'serif'],
        display:  ['Lora', 'Georgia', 'serif'],
        ui:       ['Jost', 'system-ui', 'sans-serif'],
        sans:     ['Jost', 'system-ui', 'sans-serif'],
        serif:    ['Lora', 'Georgia', 'serif'],
      },
      borderRadius: {
        card: '22px',
      },
    },
  },
  plugins: [],
}
