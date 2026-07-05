const jsonLd = JSON.parse(JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://merlord.com/#organization",
      "name": "Merlord",
      "url": "https://merlord.com",
      "description": "高瑞品牌 — 高端无框淋浴门工厂直销品牌",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+1-626-888-2855",
        "email": "merlord88@gmail.com",
        "contactType": "customer service",
        "areaServed": "US"
      },
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Walnut",
        "addressRegion": "California",
        "addressCountry": "US"
      },
      "sameAs": []
    },
    {
      "@type": "WebSite",
      "@id": "https://merlord.com/#website",
      "url": "https://merlord.com",
      "name": "Merlord — Premium Frameless Shower Doors",
      "publisher": { "@id": "https://merlord.com/#organization" },
      "inLanguage": "en-US"
    },
    {
      "@type": "FAQPage",
      "@id": "https://merlord.com/faq#faqpage",
      "mainEntity": []
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://merlord.com/#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://merlord.com" },
        { "@type": "ListItem", "position": 2, "name": "Products", "item": "https://merlord.com/products" }
      ]
    },
    {
      "@type": "Product",
      "@id": "https://merlord.com/product-detail/1#product",
      "name": "Customize Soft-Closing Double Sliding Frameless Shower Door with Two Towel Bars - MD-DS13",
      "url": "https://merlord.com/product-detail/1",
      "description": "软闭合双推拉无框淋浴门，带两个毛巾杆",
      "brand": { "@type": "Brand", "name": "Merlord" },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "USD",
        "price": "799.00",
        "availability": "https://schema.org/InStock",
        "url": "https://merlord.com/product-detail/1"
      },
      "sku": "MD-DS13",
      "category": "Frameless Shower Door"
    },
    {
      "@type": "Product",
      "@id": "https://merlord.com/product-detail/2#product",
      "name": "Customize Soft-Closing Double Sliding Frameless Shower Door with One Finger Pull - MD-DS13H",
      "url": "https://merlord.com/product-detail/2",
      "description": "软闭合双推拉无框淋浴门，单指拉手设计",
      "brand": { "@type": "Brand", "name": "Merlord" },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "USD",
        "price": "799.00",
        "availability": "https://schema.org/InStock",
        "url": "https://merlord.com/product-detail/2"
      },
      "sku": "MD-DS13H",
      "category": "Frameless Shower Door"
    }
  ]
}));

console.log("✅ JSON-LD valid");
console.log(JSON.stringify(jsonLd, null, 2));
console.log("\n---\n✅ Done");
