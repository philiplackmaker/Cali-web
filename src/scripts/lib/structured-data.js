// schema.org JSON-LD for search engines: Product + Offer(s) with availability, and the artist.
import { imageUrl, widthsFor } from './image.js';
import { isPriceOnRequest } from './product.js';
import { postageFor } from './delivery.js';

const availability = (forSale) =>
  forSale ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut';

const largest = (image) => imageUrl(image.url, widthsFor(image).at(-1));
const absolute = (url, siteUrl) => (url.startsWith('http') ? url : `${siteUrl}${url}`);

export function artistJsonLd(site) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${site.url}/#artist`,
        name: site.name,
        jobTitle: 'Artist',
        description: site.description,
        url: site.url,
        email: `mailto:${site.email}`,
        address: { '@type': 'PostalAddress', addressLocality: 'Bristol', addressCountry: 'GB' },
        knowsAbout: ['Painting', 'Art prints', 'Original artwork'],
        sameAs: [site.instagram],
      },
      {
        // The site, published by the artist: helps Google show her name and shop together.
        '@type': 'WebSite',
        '@id': `${site.url}/#website`,
        name: site.name,
        url: site.url,
        inLanguage: site.lang,
        publisher: { '@id': `${site.url}/#artist` },
      },
    ],
  };
}

/** Postage for one piece to the UK, and the returns policy: Google needs both for Shopping. */
function shippingAndReturns(product, site) {
  const uk = site.delivery?.find((d) => d.id === 'uk');
  const extras = {
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'GB',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: site.returnsDays ?? 14,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
    },
  };
  if (uk) {
    extras.shippingDetails = {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: postageFor(uk, [product]).toFixed(2),
        currency: 'GBP',
      },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'GB' },
    };
  }
  return extras;
}

export function productJsonLd(product, site) {
  const url = `${site.url}/shop/${product.handle}/`;
  const variants = product.variants.nodes;
  const offer = (v) => ({
    '@type': 'Offer',
    url,
    price: Number(v.price.amount).toFixed(2),
    priceCurrency: v.price.currencyCode,
    availability: availability(v.availableForSale),
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@id': `${site.url}/#artist` },
    ...shippingAndReturns(product, site),
  });

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    url,
    image: product.images.nodes.map((i) => absolute(largest(i), site.url)),
    brand: { '@type': 'Brand', name: site.name },
    category: product.tags.includes('original') ? 'Original painting' : 'Art print',
  };
  if (product.medium?.value) data.material = product.medium.value;

  // Price-on-request work is listed without a price.
  if (isPriceOnRequest(product)) return data;

  if (variants.length === 1) {
    data.offers = offer(variants[0]);
  } else {
    const prices = variants.map((v) => Number(v.price.amount));
    data.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: variants[0].price.currencyCode,
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      offerCount: variants.length,
      availability: availability(product.availableForSale),
      offers: variants.map(offer),
    };
  }
  return data;
}
