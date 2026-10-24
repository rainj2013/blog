# Web typography

- The existing logo uses ZCOOL KuaiLe; Google Fonts serves only the characters in `rainj2013` via its `text` parameter.
- Hero headings prefer **MiSans** installed on the visitor's device, then Noto Sans SC. This site uses MiSans through CSS `local()`; no MiSans font file is downloaded, modified or redistributed by this repository. Xiaomi permits embedding and requires acknowledgement: https://hyperos.mi.com/font/en/faq/ . Full terms: https://hyperos.mi.com/font/zh/download/ . HarmonyOS Sans is not embedded because its Web redistribution terms were not established from the official resource page during this change.
- Noto Sans SC uses the Google Fonts variable weight range 400–700. Body text is 400; article titles are 600; Hero headings are 700. Unicode ranges allow browsers to fetch only the character subsets needed by the displayed content. License: https://github.com/google/fonts/blob/main/ofl/notosanssc/OFL.txt .
- IBM Plex Mono uses weights 400 and 500 for numbers and dates. License: https://github.com/google/fonts/blob/main/ofl/ibmplexmono/OFL.txt . Code blocks retain their existing monospace fallback stack.

Font stylesheets load asynchronously, use `display=swap`, and have system fallbacks. Connections to Google Fonts are preconnected. If a visitor cannot reach Google Fonts, content remains readable with the system sans-serif and monospace fonts. No full CJK font file is preloaded. The Giscus iframe uses the same Noto Sans SC body typography.

The requested muted design token remains `#777972`. Small text uses `#6E7069`, which yields approximately 4.68:1 contrast on `#F8F7F4` and 5.02:1 on white; the accent `#B74E35` yields approximately 4.72:1 on the page background. The paper texture is decorative and very faint.
