window.addEventListener("DOMContentLoaded", () => {
  const social = window.jhieSocial?.enabled().filter(item => !/jshealthinitiative|256700000000/i.test(item.url)).map(item => item.url) || [];
  const data = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: "JS Health Initiative East Africa",
    url: "https://www.jshealthinitiative.com/",
    logo: "https://www.jshealthinitiative.com/assets/logo-icon.svg",
    description: "Biomedical engineering volunteer services and community health support in Western Uganda.",
    address: { "@type": "PostalAddress", addressLocality: "Mbarara", addressCountry: "UG" },
    ...(social.length ? { sameAs: social } : {})
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
});
