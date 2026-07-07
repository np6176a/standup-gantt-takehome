/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Storybook is built as a static site into `public/storybook`. Its assets use
    // relative paths, so the URL must keep the `/storybook/` prefix — redirect the
    // bare `/storybook` path to the built entry file to serve it as a separate page.
    return [
      {
        source: '/storybook',
        destination: '/storybook/index.html',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
