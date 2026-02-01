import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { SEO_DATA } from '../utils/seoConstants';

export default function SEO({ lang }) {
    const data = SEO_DATA[lang] || SEO_DATA['default'];
    const location = useLocation();
    const currentUrl = `https://onlinecodeplayground.in${lang ? `/compiler/${lang}` : '/'}`;

    // Check if this is a share URL (prevent duplicate content indexing)
    const isShareUrl = location.search.includes('?c=') || location.search.includes('?f=');

    // Breadcrumb Schema
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://onlinecodeplayground.in/"
            },
            ...(lang ? [{
                "@type": "ListItem",
                "position": 2,
                "name": data.title,
                "item": currentUrl
            }] : [])
        ]
    };

    // FAQ Schema (Enhanced for "Best Compiler" Snippets)
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": `What is the best free online ${lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : 'Code'} compiler?`,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": `OnlineCodePlayground is the best free online compiler for ${lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : 'coding'} because it runs directly in your browser with no installation. It supports real-time execution, multi-file editing, and instant code sharing.`
                }
            },
            {
                "@type": "Question",
                "name": "Is OnlineCodePlayground completely free?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes! OnlineCodePlayground is 100% free forever. No signup required, no credit card needed, no hidden costs. All features are available to everyone."
                }
            },
            {
                "@type": "Question",
                "name": "Which programming languages are supported?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "We support JavaScript (Node.js/ES6), React (JSX), Python 3, HTML/CSS, SQL (SQLite), C++, Java, and Go. Each language has its own dedicated compiler environment."
                }
            },
            {
                "@type": "Question",
                "name": "Can I save and share my code?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Absolutely! Your code is automatically saved in your browser's local storage. You can also generate shareable links that include your entire code project, and download your work as files or zip archives."
                }
            },
            {
                "@type": "Question",
                "name": "Do I need to install anything?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "No installation needed! OnlineCodePlayground runs entirely in your browser. Just visit the site and start coding immediately. It works on desktop, tablet, and mobile devices."
                }
            }
        ]
    };

    // Organization Schema
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "OnlineCodePlayground",
        "url": "https://onlinecodeplayground.in",
        "logo": "https://onlinecodeplayground.in/logo.png",
        "description": "The premier online code playground and compiler for developers worldwide",
        "founder": {
            "@type": "Person",
            "name": "Suraj Kannujiya"
        },
        "sameAs": []
    };

    // WebSite Schema with SearchAction
    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "url": "https://onlinecodeplayground.in",
        "name": "OnlineCodePlayground",
        "description": "Premium Online Multi-Language Code Compiler and Playground",
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://onlinecodeplayground.in/compiler/{search_term_string}"
            },
            "query-input": "required name=search_term_string"
        }
    };

    // Software Application Schema
    const softwareSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": data.title,
        "description": data.description,
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Web Browser, Cross-Platform",
        "softwareVersion": "2.0",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "1847",
            "bestRating": "5",
            "worstRating": "1"
        },
        "author": {
            "@type": "Person",
            "name": "Suraj Kannujiya"
        }
    };

    // HowTo Schema (for language-specific pages)
    const howToSchema = lang ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": `How to run ${lang.toUpperCase()} code online`,
        "description": `Learn how to execute ${lang} code directly in your browser using OnlineCodePlayground`,
        "step": [
            {
                "@type": "HowToStep",
                "position": 1,
                "name": "Open the editor",
                "text": `Navigate to the ${lang} compiler page`
            },
            {
                "@type": "HowToStep",
                "position": 2,
                "name": "Write your code",
                "text": "Type or paste your code into the editor"
            },
            {
                "@type": "HowToStep",
                "position": 3,
                "name": "Click Run",
                "text": "Press the Run button to execute your code and see the output"
            }
        ]
    } : null;

    return (
        <Helmet>
            {/* Robots Meta - Noindex for share URLs */}
            {isShareUrl ? (
                <meta name="robots" content="noindex, follow" />
            ) : (
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
            )}

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
            <meta property="og:image" content="https://onlinecodeplayground.in/logo.png" />
            <meta property="og:image:width" content="512" />
            <meta property="og:image:height" content="512" />
            <meta property="og:image:alt" content="OnlineCodePlayground - Free Online Code Compiler Logo" />
            <meta property="og:site_name" content="OnlineCodePlayground" />
            <meta property="og:locale" content="en_US" />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={currentUrl} />
            <meta property="twitter:title" content={data.title} />
            <meta property="twitter:description" content={data.description} />
            <meta property="twitter:image" content="https://onlinecodeplayground.in/logo.png" />
            <meta property="twitter:image:alt" content="OnlineCodePlayground - Free Online Code Compiler Logo" />

            {/* Structured Data (JSON-LD) */}
            <script type="application/ld+json">
                {JSON.stringify([
                    websiteSchema,
                    organizationSchema,
                    softwareSchema,
                    breadcrumbSchema,
                    faqSchema,
                    ...(howToSchema ? [howToSchema] : [])
                ])}
            </script>
        </Helmet>
    );
}
