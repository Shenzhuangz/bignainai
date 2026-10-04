/* Original, deterministic placeholder art. Run with Node; no dependencies. */
const fs = require('node:fs');
const path = require('node:path');
const colors = ['#fff1ab','#f7e7a0','#ffe9aa','#ffdd91','#ffdaa0','#f5d4b0','#f7d388','#e7dfad','#cde4d5','#e2daab','#e4d0a0'];
const eyeSets = [
  '<ellipse cx="76" cy="87" rx="5" ry="7"/><ellipse cx="124" cy="87" rx="5" ry="7"/>',
  '<ellipse cx="76" cy="87" rx="5" ry="8"/><ellipse cx="124" cy="87" rx="5" ry="8"/><path d="M92 103q8 4 16 0" fill="none"/>',
  '<ellipse cx="76" cy="83" rx="6" ry="9"/><ellipse cx="124" cy="83" rx="6" ry="9"/>',
  '<path d="m69 86 9-5m-9 5 9 3" fill="none"/><ellipse cx="123" cy="85" rx="5" ry="7"/>',
  '<path d="M70 88q6-8 12 0m36 0q6-8 12 0" fill="none"/>',
  '<path d="M70 88q6-8 12 0m36 0q6-8 12 0" fill="none"/>',
  '<ellipse cx="76" cy="87" rx="5" ry="7"/><ellipse cx="124" cy="87" rx="5" ry="7"/><path d="m70 74 13 4m35 0 12-4" fill="none"/>',
  '<path d="M68 89q8-9 16 0m32 0q8-9 16 0" fill="none"/>',
  '<ellipse cx="76" cy="87" rx="5" ry="7"/><ellipse cx="124" cy="87" rx="5" ry="7"/>',
  '<ellipse cx="76" cy="87" rx="5" ry="7"/><ellipse cx="124" cy="87" rx="5" ry="7"/>',
  '<path d="m65 79 10 3 8-4-1 13-13 1Zm51-1 10 4 10-3-4 13-13-1Z" fill="#715c36" stroke-width="2"/>'
];
const extras = [
  '', '', '', '',
  '<g stroke="#7f9e90" stroke-width="2"><rect x="110" y="125" width="29" height="43" rx="7" fill="#fffdfa"/><rect x="116" y="118" width="17" height="10" rx="3" fill="#e1e8d9"/><path d="M114 145h21"/></g>',
  '<path d="M155 62c-12-12-24 3-12 13l12 10 12-10c12-10 0-25-12-13Z" fill="#ef9da2" stroke="#d58989" stroke-width="2"/>',
  '<path d="M54 63q46-16 92 0" fill="none" stroke="#b68943" stroke-width="9"/><path d="M54 62q46-16 92 0" fill="none" stroke="#ffe298" stroke-width="4"/>',
  '<path d="m79 53 22-39 22 39Z" fill="#d9ad93" stroke="#9e8267" stroke-width="2"/><path d="m88 35 23 13m-17-22 14 8" stroke="#f9e8af" stroke-width="4"/><circle cx="102" cy="14" r="6" fill="#7d9c7b"/>',
  '<ellipse cx="100" cy="101" rx="73" ry="72" fill="none" stroke="#8fa9a0" stroke-width="7"/><path d="M47 56q18-25 45-24" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/><rect x="28" y="93" width="14" height="27" rx="5" fill="#adc3b9"/><rect x="158" y="93" width="14" height="27" rx="5" fill="#adc3b9"/>',
  '<path d="m67 49-7-29 25 11 15-20 16 20 24-11-7 29Z" fill="#e8bd51" stroke="#a2833f" stroke-width="2"/><circle cx="100" cy="37" r="4" fill="#83a389"/>',
  '<path d="M68 111 37 92l8 52 37 14m50-47 31-19-8 52-37 14" fill="#cb9377" stroke="#a67b5d" stroke-width="2"/><path d="m68 49-7-29 24 11 15-20 15 20 24-11-7 29Z" fill="#e8bd51" stroke="#a2833f" stroke-width="2"/><path d="m100 29 5 8-5 7-5-7Z" fill="#f7f5dd"/>'
];
const dir = path.join(__dirname, '../assets/nailong'); fs.mkdirSync(dir, { recursive: true });
for (let i = 0; i < 11; i++) {
  const mouth = i === 2 ? '<ellipse cx="100" cy="106" rx="7" ry="9" fill="#8d6540"/>' : i === 3 ? '<path d="M92 105q10 12 17-2" fill="#ce8a67" stroke="#84633b" stroke-width="2"/><path d="M100 110v5" stroke="#ab6755"/>' : '<path d="M92 103q8 10 16 0" fill="none" stroke="#84633b" stroke-width="3" stroke-linecap="round"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="bg" cx=".38" cy=".3" r=".8"><stop stop-color="#fffdf3"/><stop offset="1" stop-color="${colors[i]}"/></radialGradient><linearGradient id="skin" x2=".3" y2="1"><stop stop-color="#ffe786"/><stop offset="1" stop-color="#efbf57"/></linearGradient><clipPath id="disc"><circle cx="100" cy="100" r="98"/></clipPath></defs><g clip-path="url(#disc)"><circle cx="100" cy="100" r="98" fill="url(#bg)"/><ellipse cx="100" cy="175" rx="52" ry="8" fill="#b9975530"/><path d="M143 135q30-4 20 18l-28 10" fill="#e8b650" stroke="#b79547" stroke-width="2"/><ellipse cx="76" cy="167" rx="17" ry="11" fill="#efbf57"/><ellipse cx="123" cy="167" rx="17" ry="11" fill="#efbf57"/><path d="M78 101q-35 36-20 58 42 26 84 0 15-24-20-58Z" fill="url(#skin)" stroke="#c59f4c" stroke-width="2"/><ellipse cx="100" cy="145" rx="24" ry="23" fill="#ffeda9"/><path d="m63 65-9-20 22 10m48 0 20-10-7 21" fill="#f0c360" stroke="#c59f4c" stroke-width="2"/><path d="M100 47c-26 0-43 14-43 40-17 30 4 42 43 42s60-12 43-42c0-26-17-40-43-40Z" fill="url(#skin)" stroke="#c59f4c" stroke-width="2"/><path d="M65 128q-17-2-14 12l14 9m70-21q17-2 14 12l-14 9" fill="#f3c96b" stroke="#c59f4c" stroke-width="2"/><ellipse cx="65" cy="102" rx="10" ry="6" fill="#eaa17e" opacity=".55"/><ellipse cx="135" cy="102" rx="10" ry="6" fill="#eaa17e" opacity=".55"/><g fill="#6c5833" stroke="#6c5833" stroke-width="3" stroke-linecap="round">${eyeSets[i]}</g>${mouth}<path d="m94 65 5-3m4 0 4 3" fill="none" stroke="#f4d990" stroke-width="2"/>${extras[i]}<path d="M24 43h8m-4-4v8" stroke="#fffdf4" stroke-width="3" stroke-linecap="round"/><circle cx="166" cy="157" r="3" fill="#fffdf4"/></g><circle cx="100" cy="100" r="98" fill="none" stroke="#a68c5238" stroke-width="2"/></svg>\n`;
  fs.writeFileSync(path.join(dir, `level${i + 1}.svg`), svg);
}
console.log('Generated 11 original SVG placeholder sprites.');
