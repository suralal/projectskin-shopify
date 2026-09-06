#!/usr/bin/env python3
import re, urllib.request
BASE = "http://127.0.0.1:9292"
paths = [
  "/pages/philosophy","/pages/the-science","/pages/ingredients","/pages/journal",
  "/pages/consultation","/pages/acne","/pages/pigmentation","/pages/barrier","/pages/daily-spf",
  "/pages/monsoon","/pages/winter","/pages/festive","/pages/climate","/pages/routine",
  "/pages/routine-finder","/pages/smart-lab","/pages/skin-profile","/pages/faq","/pages/contact",
  "/collections/all",
]
for path in paths:
  try:
    with urllib.request.urlopen(BASE + path, timeout=20) as r:
      html = r.read().decode("utf-8", "ignore")
      code = r.status
  except Exception as e:
    print(f"{path:28} ERR {e}")
    continue
  title_m = re.search(r"<title>(.*?)</title>", html, re.I|re.S)
  title = re.sub(r"\s+", " ", title_m.group(1)).strip() if title_m else ""
  route_m = re.search(r"data-psr-fallback-route=['\"]([^'\"]+)", html)
  route = route_m.group(1) if route_m else "none"
  h1s = [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h)).strip() for h in re.findall(r"<h1[^>]*>(.*?)</h1>", html, re.I|re.S)]
  h1s = [h for h in h1s if h][:2]
  visible_404 = 'class="section psr-404-default"' in html and route == "not-found"
  print(f"{path:28} {code} bytes={len(html):7d} route={route:14} 404vis={visible_404}")
  print(f"  title: {title[:70]}")
  print(f"  h1: {' | '.join(h1s)[:140]}")
