import re, os, urllib.parse

def clean_asset_urls(html_text):
    # Pattern to match Shopify CDN image and asset URLs
    def replacer(match):
        url = match.group(0)
        clean = url.split('?')[0]
        fname = os.path.basename(clean)
        fname = urllib.parse.unquote(fname)
        fname_clean = fname.replace(' ', '_')
        if os.path.exists(os.path.join('assets', fname_clean)):
            fname = fname_clean
        elif os.path.exists(os.path.join('assets', fname)):
            pass
        return "{{ '" + fname + "' | asset_url }}"

    # Replace URLs inside src="...", srcset="...", url(...)
    res = re.sub(r'(?:https?:)?//(?:theprojectskin\.com|cdn\.shopify\.com)/[^\s\"\'\)\?]+(?:\?[^\s\"\'\)]*)?', replacer, html_text)
    return res

sections_config = [
    {
        'html': 'tmp_extract/home_hero.html',
        'liquid': 'sections/home-hero.liquid',
        'schema': {
            'name': 'Home Hero Slider',
            'settings': [
                {'type': 'checkbox', 'id': 'autoplay', 'label': 'Enable Autoplay', 'default': True},
                {'type': 'range', 'id': 'autoplay_delay', 'min': 2, 'max': 10, 'step': 1, 'unit': 's', 'label': 'Autoplay Delay', 'default': 5}
            ],
            'presets': [{'name': 'Home Hero Slider'}]
        }
    },
    {
        'html': 'tmp_extract/home_features.html',
        'liquid': 'sections/home-features.liquid',
        'schema': {
            'name': 'Home Features',
            'settings': [
                {'type': 'text', 'id': 'heading', 'label': 'Heading', 'default': "Your serum isn't failing you. The approach is."}
            ],
            'presets': [{'name': 'Home Features'}]
        }
    },
    {
        'html': 'tmp_extract/home_products.html',
        'liquid': 'sections/home-products.liquid',
        'schema': {
            'name': 'Home Products Grid',
            'settings': [
                {'type': 'text', 'id': 'heading', 'label': 'Heading', 'default': 'The Acne System'},
                {'type': 'text', 'id': 'button_label', 'label': 'Button Label', 'default': 'Shop all products'}
            ],
            'presets': [{'name': 'Home Products Grid'}]
        }
    },
    {
        'html': 'tmp_extract/home_why_us.html',
        'liquid': 'sections/home-why-us.liquid',
        'schema': {
            'name': 'Home Why Us',
            'settings': [
                {'type': 'text', 'id': 'heading', 'label': 'Heading', 'default': 'Why not just buy another Niacinamide serum?'}
            ],
            'presets': [{'name': 'Home Why Us'}]
        }
    },
    {
        'html': 'tmp_extract/home_proof.html',
        'liquid': 'sections/home-proof.liquid',
        'schema': {
            'name': 'Home Proof',
            'settings': [
                {'type': 'text', 'id': 'heading', 'label': 'Heading', 'default': 'Proof before promises.'}
            ],
            'presets': [{'name': 'Home Proof'}]
        }
    },
    {
        'html': 'tmp_extract/home_system.html',
        'liquid': 'sections/home-system.liquid',
        'schema': {
            'name': 'Home System',
            'settings': [
                {'type': 'text', 'id': 'heading', 'label': 'Heading', 'default': 'Skincare is step one. This is the whole system.'}
            ],
            'presets': [{'name': 'Home System'}]
        }
    },
    {
        'html': 'tmp_extract/home_digital_twin.html',
        'liquid': 'sections/home-digital-twin.liquid',
        'schema': {
            'name': 'Home Digital Twin',
            'settings': [
                {'type': 'text', 'id': 'heading', 'label': 'Heading', 'default': "Meet your skin's digital twin."}
            ],
            'presets': [{'name': 'Home Digital Twin'}]
        }
    },
    {
        'html': 'tmp_extract/home_testimonials.html',
        'liquid': 'sections/home-testimonials.liquid',
        'schema': {
            'name': 'Home Testimonials',
            'settings': [
                {'type': 'text', 'id': 'heading', 'label': 'Heading', 'default': 'From the first 250.'}
            ],
            'presets': [{'name': 'Home Testimonials'}]
        }
    },
    {
        'html': 'tmp_extract/home_waitlist.html',
        'liquid': 'sections/home-waitlist.liquid',
        'schema': {
            'name': 'Home Waitlist',
            'settings': [
                {'type': 'text', 'id': 'heading', 'label': 'Heading', 'default': 'Get the full system first.'}
            ],
            'presets': [{'name': 'Home Waitlist'}]
        }
    },
    {
        'html': 'tmp_extract/home_cta_banner.html',
        'liquid': 'sections/home-cta-banner.liquid',
        'schema': {
            'name': 'Home CTA Banner',
            'settings': [
                {'type': 'text', 'id': 'heading', 'label': 'Heading', 'default': 'Stop managing breakouts. Start fixing them.'}
            ],
            'presets': [{'name': 'Home CTA Banner'}]
        }
    }
]

import json

for item in sections_config:
    with open(item['html'], 'r', encoding='utf-8') as inf:
        raw_html = inf.read()
    
    clean_code = clean_asset_urls(raw_html)
    schema_code = "\n{% schema %}\n" + json.dumps(item['schema'], indent=2) + "\n{% endschema %}\n"
    
    final_liquid = clean_code + schema_code
    with open(item['liquid'], 'w', encoding='utf-8') as outf:
        outf.write(final_liquid)
    print(f"Built {item['liquid']} ({len(final_liquid)} bytes)")

print("All 10 sections successfully built!")
