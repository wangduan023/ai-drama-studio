/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {
      // Tailwind CSS v4 配置
      optimize: process.env.NODE_ENV === 'production',
    },
  },
}

export default config
