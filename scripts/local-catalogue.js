// A copy of Cali's artwork sheet (9 Nov 2026), used when the build has no SHEET_CSV_URL:
// local development, and the preview before the sheet is connected. Same columns as the
// sheet, so it goes through the same code (scripts/sheet.js). Images are web-sized copies
// of the Dropbox scans, already in /assets/images/art/, so no downloading is needed.
// Alt text: these are the descriptions to paste into the sheet's "Alt text" column.

const DESCRIPTION = 'Giclee, museum quality print on 300gsm, beautiful prestige paper';
const MADE =
  'Prints are scanned from original hand painted work with no digital retouching. Each print is then professionally printed on a beautiful prestige paper.';

const DROPBOX = {
  blueTulips:
    'https://www.dropbox.com/scl/fi/mobxth9kzzcz2mj1atam7/Blue-Tulips.jpg?rlkey=vmr7wapwiuibj8uty1tutd7h3&st=9go8yffs&dl=0',
  blueTulipsAlt:
    'https://www.dropbox.com/scl/fi/kdcv589exqx95lm56e5m0/blue-tulips.jpg?rlkey=ff92ggdxe0m8g7v18pmtti34j&st=xigaa6sz&dl=0',
  daisies:
    'https://www.dropbox.com/scl/fi/m0yo6fdc55uvafzhumon7/Daises.jpg?rlkey=hcr997qr2w5mypqogxcbdlkno&st=h8hr80ea&dl=0',
  swan: 'https://www.dropbox.com/scl/fi/mknjkp86el8y5xrehm06v/swan.jpg?rlkey=n0wlo9lqq6oebhm11srd8rwms&st=wojnqwe8&dl=0',
  tallVase:
    'https://www.dropbox.com/scl/fi/tfzy8k3fupq62r5s2mxf9/tall-vase.jpg?rlkey=khosgp3a82uu0tel73sox7z1l&st=2nzfmzdo&dl=0',
  tallVaseAlt:
    'https://www.dropbox.com/scl/fi/twwerlb1zb7pe37pxae4e/tall-vase.jpg?rlkey=4x5hw7io7090qxweebshrr3nl&st=uabxpprx&dl=0',
  vase: 'https://www.dropbox.com/scl/fi/g50xik6e1h81hu7pwy5gd/vase.jpg?rlkey=z52iwkwiphpfr2mle6jkk7meq&st=vqb8rjek&dl=0',
  bird: 'https://www.dropbox.com/scl/fi/ekckrvjzswmnsga1usj9p/Bird.jpg?rlkey=tbv8abjsdnl7dctj3jq0xpctv&st=4nhf582r&dl=0',
  monstera:
    'https://www.dropbox.com/scl/fi/hajikwlozhrf5csqshj1j/Monsterta.jpg?rlkey=lsmys9ap2q8clw5xjstpfxbb3&st=axfxj9zs&dl=0',
  sunflowers:
    'https://www.dropbox.com/scl/fi/e6n49pqmkozhmhr9eozyl/Sunflowers.jpg?rlkey=nyza52emk0lvm00s5bwtofjzj&st=ut2dnhs7&dl=0',
};

// Dropbox link → the copy in src/assets/images/art/ (name-{width}.webp, widths up to 1440).
const LOCAL = new Map([
  [DROPBOX.blueTulips, ['blue-tulips', 1440, 1866]],
  [DROPBOX.blueTulipsAlt, ['blue-tulips-alt', 1440, 1920]],
  [DROPBOX.daisies, ['daisies', 1440, 1860]],
  [DROPBOX.swan, ['swan', 1440, 2022]],
  [DROPBOX.tallVase, ['tall-vase', 1440, 1821]],
  [DROPBOX.tallVaseAlt, ['tall-vase-alt', 1440, 1920]],
  [DROPBOX.vase, ['vase', 1440, 1801]],
  [DROPBOX.bird, ['bird', 1440, 1450]],
  [DROPBOX.monstera, ['monstera', 1440, 1436]],
  [DROPBOX.sunflowers, ['sunflowers', 1440, 1436]],
]);

export function resolveLocalImage(link) {
  const local = LOCAL.get(link);
  if (!local) return null;
  const [name, width, height] = local;
  return { url: `/assets/images/art/${name}-{width}.webp`, width, height };
}

const row = (name, price, size, image, extra = {}) => ({
  name,
  description: DESCRIPTION,
  price,
  size,
  made: MADE,
  image,
  ...extra,
});

export const rows = [
  row('Blue Tulips', '£30', '20cm x 25cm', DROPBOX.blueTulips, {
    moreImages: DROPBOX.blueTulipsAlt,
    alt: 'Blue Tulips by Calico Melton: a dark green stem curling up from a small red pot, hung with deep blue tulip heads, on a pale pink ground above a brown table.',
  }),
  row('Blue Tulips', '£60', '40cm x 50cm', DROPBOX.blueTulips),
  row('Daisies', '£30', '20cm x 25cm', DROPBOX.daisies, {
    alt: 'Daisies by Calico Melton: a branching stem of white daisies in a red and white checked pot, against a deep green ground.',
  }),
  row('Daisies', '£60', '40cm x 50cm', DROPBOX.daisies),
  row('Swan', '£24', 'A4', DROPBOX.swan, {
    alt: 'Swan by Calico Melton: a white swan holding a red tulip in its beak, among a sunflower, lily pad, blue flowers and a red heart on a pink ground.',
  }),
  row('Swan', '£30', 'A3', DROPBOX.swan),
  row('Tall Vase', '£30', '20cm x 25cm', DROPBOX.tallVase, {
    moreImages: DROPBOX.tallVaseAlt,
    alt: 'Tall Vase by Calico Melton: a white vase with red squiggles, overflowing with orange, red and yellow flowers and dark green leaves, on a pink ground.',
  }),
  row('Tall vase', '£60', '40cm x 50cm', DROPBOX.tallVase),
  row('Vase', '£30', '20cm x 25cm', DROPBOX.vase, {
    alt: 'Vase by Calico Melton: red and orange flowers and green leaves spilling from a white vase painted with brown squiggles, on a pink ground.',
  }),
  row('Vase', '£60', '40cm x 50cm', DROPBOX.vase),
  row('Bird', '£25', '20cm x 20cm', DROPBOX.bird, {
    alt: 'Bird by Calico Melton: a pale pink bird with outstretched wings and a rosy cheek, against a dark brown ground.',
  }),
  row('Bird', '£50', '40cm x 40cm', DROPBOX.bird),
  row('Monstera', '£25', '20cm x 20cm', DROPBOX.monstera, {
    alt: 'Monstera by Calico Melton: a plant with three heart-shaped green leaves arching out of a brown squiggle-patterned pot, on a pale pink and grey ground.',
  }),
  row('Monstera', '£50', '40cm x 40cm', DROPBOX.monstera),
  row('Sunflowers', '£25', '20cm x 20cm', DROPBOX.sunflowers, {
    alt: 'Sunflowers by Calico Melton: three sunflowers standing in a blue and red checked bowl, on a pale pink ground.',
  }),
  row('Sunflowers', '£50', '40cm x 40cm', DROPBOX.sunflowers),
];
