import { Helmet } from "react-helmet-async";

interface PageMetaProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  breadcrumbs?: { name: string; path: string }[];
}

const SITE_NAME = "ShawScope";
const SITE_URL = "https://www.shawscope.co.uk";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  "name": "ShawScope",
  "description": "Non-diagnostic ear care and wellness home visits across Dorchester, Weymouth, Portland and Dorset — professional earwax removal (microsuction and irrigation), cosmetic cryotherapy and foot care. Not an ENT or audiology service.",
  "url": SITE_URL,
  "telephone": "+441305340194",
  "email": "matt@shawscope.co.uk",
  "image": `${SITE_URL}/og-image.png`,
  "areaServed": [
    { "@type": "City", "name": "Dorchester", "containedInPlace": { "@type": "AdministrativeArea", "name": "Dorset" } },
    { "@type": "City", "name": "Weymouth" },
    { "@type": "City", "name": "Portland" },
    { "@type": "City", "name": "Chickerell" },
    { "@type": "City", "name": "Puddletown" },
    { "@type": "City", "name": "Cerne Abbas" },
    { "@type": "City", "name": "Maiden Newton" },
    { "@type": "City", "name": "Crossways" },
    { "@type": "City", "name": "Broadmayne" },
    { "@type": "City", "name": "Charminster" },
    { "@type": "City", "name": "Martinstown" },
    { "@type": "City", "name": "Upwey" },
    { "@type": "City", "name": "Tolpuddle" },
    { "@type": "AdministrativeArea", "name": "Dorset, United Kingdom" }
  ],
  "founder": {
    "@type": "Person",
    "name": "Matt Shaw"
  },
  "foundingDate": "2023-01",
  "priceRange": "££",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Dorchester",
    "addressRegion": "Dorset",
    "addressCountry": "GB"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 50.7154,
    "longitude": -2.4376
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    "opens": "08:00",
    "closes": "18:00"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5.0",
    "reviewCount": "50",
    "bestRating": "5"
  },
  "review": [
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "Sarah M." },
      "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
      "reviewBody": "Matt was fantastic — professional, gentle, and made me feel completely at ease. My hearing improved immediately after the earwax removal. Highly recommend ShawScope!"
    },
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "David P." },
      "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
      "reviewBody": "Brilliant home visit service. Matt arrived on time, explained everything clearly, and the whole process was quick and painless. Five stars all round!"
    },
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "Linda T." },
      "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
      "reviewBody": "I was nervous about cryotherapy but Matt was so reassuring and professional. The skin tag was gone in seconds. Such a convenient service coming to your home."
    }
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Earwax Removal",
          "description": "Professional microsuction and irrigation earwax removal home visits across Dorchester, Weymouth and Dorset. A non-diagnostic ear care service focused on the safe removal of visible excess earwax.",
          "provider": { "@type": "MedicalBusiness", "name": "ShawScope" },
          "areaServed": { "@type": "AdministrativeArea", "name": "Dorset" },
          "serviceType": "Earwax Removal"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Cryotherapy",
          "description": "Cosmetic cryotherapy for skin tags, warts, verrucae, age spots and other benign skin lesions — home visits across Dorset. Not a medical diagnostic service.",
          "provider": { "@type": "MedicalBusiness", "name": "ShawScope" },
          "areaServed": { "@type": "AdministrativeArea", "name": "Dorset" },
          "serviceType": "Cryotherapy"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Foot Health",
          "description": "Professional foot care home visits across Dorset — nail care, callus and corn care for everyday comfort.",
          "provider": { "@type": "MedicalBusiness", "name": "ShawScope" },
          "areaServed": { "@type": "AdministrativeArea", "name": "Dorset" },
          "serviceType": "Foot Health"
        }
      }
    ]
  },
  "sameAs": [
    "https://www.facebook.com/ShawScopeEarCare",
    "https://www.instagram.com/shawscope"
  ]
};

const PageMeta = ({ title, description, path = "", ogImage, jsonLd, breadcrumbs }: PageMetaProps) => {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path}`;
  const image = ogImage || DEFAULT_OG_IMAGE;
  const isHome = path === "" || path === "/";

  const schemas: Record<string, unknown>[] = [];
  if (isHome) schemas.push(localBusinessJsonLd);
  if (jsonLd) {
    if (Array.isArray(jsonLd)) schemas.push(...jsonLd);
    else schemas.push(jsonLd);
  }

  // BreadcrumbList schema
  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
        ...breadcrumbs.map((bc, i) => ({
          "@type": "ListItem",
          "position": i + 2,
          "name": bc.name,
          "item": `${SITE_URL}${bc.path}`
        }))
      ]
    });
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_GB" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default PageMeta;
