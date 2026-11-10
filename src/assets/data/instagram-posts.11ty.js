// The Instagram posts this build shows, by link. The daily function
// (netlify/functions/nightly-rebuild.mjs) compares them with Instagram's latest and only
// rebuilds the site when there's something new: each rebuild costs Netlify credits.
export const data = {
  permalink: '/assets/data/instagram-posts.json',
  eleventyExcludeFromCollections: true,
};

export function render({ instagram }) {
  return JSON.stringify((instagram?.posts ?? []).map((post) => post.permalink));
}
