import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SEO_DATA } from '../utils/seoConstants';

export default function SEO({ lang }) {
    const data = SEO_DATA[lang] || SEO_DATA['default'];
    const currentUrl = `https://onlinecodeplayground.in/compiler/${lang || ''}`;

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{data.title}</title>
            <meta name="description" content={data.description} />
            <meta name="keywords" content={data.keywords} />
            <link rel="canonical" href={currentUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:title" content={data.title} />
            <meta property="og:description" content={data.description} />
            <meta property="og:image" content="https://onlinecodeplayground.in/og-image.png" />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={currentUrl} />
            <meta property="twitter:title" content={data.title} />
            <meta property="twitter:description" content={data.description} />
            <meta property="twitter:image" content="https://onlinecodeplayground.in/og-image.png" />

            {/* Structured Data (JSON-LD) */}
            <script type="application/ld+json">
                {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "SoftwareApplication",
                    "name": data.title,
                    "description": data.description,
                    "applicationCategory": "DeveloperApplication",
                    "operatingSystem": "Web Browser",
                    "offers": {
                        "@type": "Offer",
                        "price": "0",
                        "priceCurrency": "USD"
                    },
                    "author": {
                        "@type": "Person",
                        "name": "Suraj Kannujiya"
                    }
                })}
            </script>
        </Helmet>
    );
}
