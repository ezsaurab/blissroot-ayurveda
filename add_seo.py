import os
import re

domain = "https://www.blissrootayurveda.com"

public_files = [
    "index.html", "blog.html", "cart.html", "order-tracking.html", 
    "chyawanprash.html", "amla-murabba.html", "herbal-lip-balm.html"
]

common_meta = f"""
  <link rel="canonical" href="{domain}/{{{{filename}}}}">
  <meta property="og:site_name" content="Blissroot Ayurveda">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{domain}/{{{{filename}}}}">
  <meta property="og:image" content="{domain}/images/logo.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="keywords" content="Ayurveda, Ayurvedic products, natural wellness, herbal, Blissroot">
"""

schema = f"""
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "Blissroot Ayurveda",
    "image": "{domain}/images/logo.jpg",
    "description": "Premium Ayurvedic wellness products. 100% Natural, Lab Tested.",
    "url": "{domain}/",
    "telephone": "+919999999999",
    "address": {{
      "@type": "PostalAddress",
      "addressCountry": "IN"
    }}
  }}
  </script>
"""

for file in public_files:
    if os.path.exists(file):
        with open(file, 'r') as f:
            content = f.read()
        
        # Remove any existing canonical/og tags to avoid duplication if run multiple times
        content = re.sub(r'<link rel="canonical".*?>\n?', '', content)
        content = re.sub(r'<meta property="og:.*?>\n?', '', content)
        content = re.sub(r'<meta name="twitter:.*?>\n?', '', content)
        content = re.sub(r'<meta name="keywords".*?>\n?', '', content)
        content = re.sub(r'<script type="application/ld\+json">.*?</script>', '', content, flags=re.DOTALL)
        
        file_meta = common_meta.replace("{{filename}}", "" if file == "index.html" else file)
        
        # Add schema only to index.html for store info
        if file == "index.html":
            file_meta += schema
            
        new_content = content.replace("</head>", file_meta + "</head>")
        with open(file, 'w') as f:
            f.write(new_content)

# Admin panel - add noindex
if os.path.exists("admin.html"):
    with open("admin.html", 'r') as f:
        admin_content = f.read()
    if '<meta name="robots" content="noindex">' not in admin_content:
        admin_content = admin_content.replace("</head>", '  <meta name="robots" content="noindex, nofollow">\n</head>')
    with open("admin.html", 'w') as f:
        f.write(admin_content)

print("SEO tags injected.")
