/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Storybook is built as a static site into `public/storybook`, served as a separate
    // page. Its assets use relative paths, so the entry URL must sit under `/storybook/`
    // — hence a redirect to the built `index.html` rather than a rewrite (a rewrite would
    // keep the bare `/storybook` URL and break relative asset resolution).
    //
    // One rule covers every entry variant: the trailing-slash forms (`/storybook/`,
    // `/storybook/?path=...`) are first normalized to `/storybook` by Next's default
    // trailing-slash handling (query string preserved), which then hits this redirect —
    // so `/storybook`, `/storybook/`, and bookmarked `?path=` URLs all land on the built
    // entry. Deep asset requests (`/storybook/assets/*`) are real files and served directly.
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
